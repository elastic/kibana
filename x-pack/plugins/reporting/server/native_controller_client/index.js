/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



import { Observable } from 'rxjs';
import uuid from 'uuid';
import { SyntheticProcess } from './synthetic_process';
import { NativeControllerChannel } from './native_controller_channel';

export function createSpawnBrowser(browserType, nativeControllerProcess) {
  return (params, cleanup = () => {}) => {
    return Observable.create(observer => {

      let cancelled = false;
      let proc;

      const killAndCleanup = async () => {
        if (proc && !proc.killed) {
          await proc.kill();
        }

        cleanup();
        return;
      };

      (async () => {
        try {
          const channel = new NativeControllerChannel(nativeControllerProcess, uuid.v4());
          await channel.send('spawn', {
            browserType,
            params
          });

          proc = new SyntheticProcess(channel);

          if (cancelled) {
            killAndCleanup();
            return;
          }

          observer.next(proc);
        } catch (err) {
          observer.error(new Error(`Caught error spawning ${browserType}: ${err}`));
        }
      })();

      return () => {
        cancelled = true;
        killAndCleanup();
      };
    });
  };
}
