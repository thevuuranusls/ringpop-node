// Copyright (c) 2015 Uber Technologies, Inc.
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
// THE SOFTWARE.
'use strict';


function RingpopServer(ringpop, tchannel) {
    var self = this;
    self.ringpop = ringpop;
    self.tchannel = tchannel;

    registerEndpointHandlers(require('./admin'));
    registerEndpointHandlers(require('./protocol'));
    registerEndpointHandlers(require('./trace'));

    // Register stragglers ;)
    var createProxyReqHandler = require('./proxy-req.js');
    registerEndpoint('/proxy/req', createProxyReqHandler(self.ringpop));

    var createHealthHandler = require('./health.js');
    registerEndpoint('/health', createHealthHandler());

    function registerEndpointHandlers(endpointHandlers) {
        Object.keys(endpointHandlers).forEach(function each(key) {
            var endpointHandler = endpointHandlers[key];
            registerEndpoint(endpointHandler.endpoint,
                endpointHandler.handler(ringpop));
        });
    }

    // Wraps endpoint handler so that it doesn't have to
    // know TChannel req/res API.
    function registerEndpoint(url, handler) {
        tchannel.register(url, function (req, res, arg2, arg3) {
            handler(arg2, arg3, req.remoteAddr, onResponse);

            function onResponse(err, res1, res2) {
                res.headers.as = 'raw';
                if (err) {
                    self.ringpop.logger.warn(err.message, err);
                    res.sendNotOk(null, err.message);
                } else {
                    res.sendOk(res1, res2);
                }
            }
        });
    }
}

module.exports = RingpopServer;
