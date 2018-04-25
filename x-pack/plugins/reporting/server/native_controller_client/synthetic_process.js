/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



import { Readable } from 'stream';

class SyntheticStream extends Readable {
  constructor(options) {
    super(options);
  }

  _read() {
  }
}

export class SyntheticProcess {

  _callbacks = {};

  killed = false;
  stdout = new SyntheticStream();
  stderr = new SyntheticStream();

  constructor(channel) {
    this._channel = channel;

    this._channel.onMessage(({ type, payload }) => {
      switch (type) {
        case 'stdout': {
          this.stdout.push(payload);
          break;
        }
        case 'stderr': {
          this.stderr.push(payload);
          break;
        }
        default: {
          const callbacks = this._callbacks[type];
          if (callbacks) {
            callbacks.forEach(callback => callback(payload));
          }
        }
      }
    });
  }

  once(event, callback) {
    const wrappedCallback = (...args) => {
      callback(args);
      this.removeListener(event, wrappedCallback);
    };

    this.addListener(event, wrappedCallback);
  }

  addListener(event, callback) {
    if (!this._callbacks[event]) {
      this._callbacks[event] = [];
    }

    this._callbacks[event].push(callback);
  }

  removeListener(event, callback) {
    if (!this._callbacks[event]) {
      return;
    }

    const index = this._callbacks[event].indexOf(callback);
    if (index === -1) {
      return;
    }

    this._callbacks[event].splice(index, 1);
  }

  async kill(signal) {
    this.killed = true;
    await this._channel.send('kill', signal);
  }
}
