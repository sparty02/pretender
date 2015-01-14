import { FakeXMLHttpRequest } from 'TBD location ';

function FakeRequest(pretender){
  // super()
  FakeXMLHttpRequest.call(this);
  this.pretender = pretender;
}

// passthrough handling
var events = ['load', 'error', 'timeout', 'progress', 'abort', 'readystatechange'];
var lifecycleProps = ['readyState', 'responseText', 'responseXML', 'status', 'statusText'];

function createPassthrough(fakeXHR) {
  var NativeXhr = this.pretender._nativeXMLHttpRequest;
  var xhr = fakeXHR._passthroughRequest = new NativeXhr();
  // listen to all events to update lifecycle properties

  function eventHandler (event) {

    var handler = "on" + event;
    xhr[handler] = function (event) {
      // update lifecycle props on each event
      lifecycleProps.forEach(function(prop) {
        if (xhr[prop]) {
          fakeXHR[prop] = xhr[prop];
        }
      });

      // fire fake events where applicable
      fakeXHR.dispatchEvent(event, event);
      var fakeHandler = fakeXHR[handler];
      if (fakeHandler) {
        fakeHandler(event);
      }
    };
  }

  events.forEach(eventHandler);

  for (var i = 0; i < events.length; i++) {
    eventHandler(events[i]);
  }
  xhr.open(fakeXHR.method, fakeXHR.url, fakeXHR.async, fakeXHR.username, fakeXHR.password);
  xhr.timeout = fakeXHR.timeout;
  xhr.withCredentials = fakeXHR.withCredentials;
  for (var h in fakeXHR.requestHeaders) {
    xhr.setRequestHeader(h, fakeXHR.requestHeaders[h]);
  }
  return xhr;
}

// extend
var proto = new FakeXMLHttpRequest();
proto.send = function send(){
  if (!this.pretender.running) {
    throw new Error('You shut down a Pretender instance while there was a pending request. '+
          'That request just tried to complete. Check to see if you accidentally shut down '+
          'a pretender earlier than you intended to');
  }

  FakeXMLHttpRequest.prototype.send.apply(this, arguments);
  if (!this.pretender.checkPassthrough(this)) {
    this.pretender.handleRequest(this);
  }
  else {
    var xhr = createPassthrough(this);
    xhr.send.apply(xhr, arguments);
  }
};

proto._passthroughCheck = function(method) {
  if (this._passthroughRequest) {
    return this._passthroughRequest[method].apply(this._passthroughRequest, arguments);
  }
  return FakeXMLHttpRequest.prototype[method].apply(this, arguments);
};

proto.abort = function abort(){
  return this._passthroughCheck('abort', arguments);
};

proto.getResponseHeader = function getResponseHeader(){
  return this._passthroughCheck('getResponseHeader', arguments);
};

proto.getAllResponseHeaders = function getAllResponseHeaders(){
  return this._passthroughCheck('getAllResponseHeaders', arguments);
};

FakeRequest.prototype = proto;

export default FakeRequest;