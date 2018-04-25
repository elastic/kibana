/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



import path from 'path';
import { NativeControllerChildProcess } from './child_process';
import { getArgs, getPackage } from '../server/browsers/browsers';

export default function (configMap) {
  const processes = new Map();

  process.on('disconnect', () => {
    for (const p of processes.values()) {
      p.kill();
    }
  });

  process.on('message', (messageEnvelope) => {
    try {
      const { processId, message } = messageEnvelope;

      if (!processId) {
        throw new Error('processId is required');
      }

      if (!message || !message.id) {
        throw new Error('message.id is required');
      }

      try {
        switch (message.type) {
          case 'spawn': {
            const {
              browserType,
              params
            } = message.payload;

            const { binaryRelativePath } = getPackage(browserType);

            const command = path.join(configMap.get('path.data'), binaryRelativePath);
            const args = getArgs(browserType, params);

            const childProcess = new NativeControllerChildProcess(processId, command, args);
            processes.set(processId, childProcess);
            break;
          }
          case 'kill': {
            const signal = message.payload;
            const childProcess = processes.get(processId);
            childProcess.kill(signal);
            processes.delete(processId);
            break;
          }
          default:
            throw new Error(`Unknown message type ${message.type}`);
        }

        process.send({ processId, ack: { id: message.id, success: true } });
      } catch (err) {
      // catches message specific errors
        process.send({ processId, ack: { id: message.id, success: false, error: err.toString() } });
      }
    }
    catch (err) {
    // catches general errors with parsing the message format
      process.send({ error: err.toString() });
    }
  });
}
