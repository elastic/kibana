/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

const noop = () => {};

// arguments: url, options
// https://github.com/socketio/socket.io-client/blob/master/docs/API.md#iourl-options
export default function mockIo() {
  return {
    on: noop,
    emit: noop,
    once: noop,
  };
}
