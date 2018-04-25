/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



import uuid from 'uuid';

export class NativeControllerChannel {
  _messageCallbacks = [];
  _messageAcks = {};

  constructor(nativeControllerProcess, processId) {
    this._process = nativeControllerProcess;
    this._processId = processId;

    this._process.on('message', ({ processId, ack, message }) => {
      if (this._processId !== processId) {
        return;
      }

      if (ack) {
        const messageAck = this._messageAcks[ack.id];
        if (ack.success) {
          messageAck.resolve();
        } else {
          messageAck.reject(ack.error);
        }
        return;
      }

      for (const cb of this._messageCallbacks) {
        cb(message);
      }
    });
  }

  async send(type, payload) {
    const messageId = uuid.v4();
    this._process.send({ processId: this._processId, message: { id: messageId, type, payload } });
    return new Promise((resolve, reject) => {
      this._messageAcks[messageId] = { resolve, reject };
    });
  }

  onMessage(cb) {
    this._messageCallbacks.push(cb);
  }
}
