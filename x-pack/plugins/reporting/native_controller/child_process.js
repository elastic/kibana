/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



import { spawn } from 'child_process';
import { safeChildProcess } from './safe_child_process';

export class NativeControllerChildProcess {
  constructor(processId, command, args) {
    this._processId = processId;
    this._process = spawn(command, args);
    safeChildProcess(this._process, 'SIGKILL');

    this._process.stdout.on('data', data => this._send('stdout', data.toString()));
    this._process.stderr.on('data', data => this._send('stderr', data.toString()));
    this._process.addListener('error', data => this._send('error', data));
    this._process.addListener('exit', data => {
      if (!process.connected) {
        return;
      }

      this._send('exit', data);
    });
  }

  kill(signal) {
    this._process.kill(signal);
  }

  _send(type, payload) {
    process.send({ processId: this._processId, message: { type, payload } });
  }
}
