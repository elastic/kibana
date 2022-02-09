/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fromEvent, merge, Observable } from 'rxjs';
import { take, share, mapTo, delay, tap } from 'rxjs/operators';
import type { Logger } from 'src/core/server';

interface IChild {
  kill(signal: string): Promise<unknown>;
}

// Our process can get sent various signals, and when these occur we wish to
// kill the subprocess and then kill our process as long as the observer isn't cancelled
export function safeChildProcess(
  logger: Logger,
  childProcess: IChild
): { terminate$: Observable<string> } {
  const ownTerminateSignal$ = merge(
    fromEvent(process as NodeJS.EventEmitter, 'SIGTERM').pipe(mapTo('SIGTERM')),
    fromEvent(process as NodeJS.EventEmitter, 'SIGINT').pipe(mapTo('SIGINT')),
    fromEvent(process as NodeJS.EventEmitter, 'SIGBREAK').pipe(mapTo('SIGBREAK'))
  ).pipe(take(1), share());

  const ownTerminateMapToKill$ = ownTerminateSignal$.pipe(
    tap((signal) => {
      logger.debug(`Kibana process received terminate signal: ${signal}`);
    }),
    mapTo('SIGKILL')
  );

  const kibanaForceExit$ = fromEvent(process as NodeJS.EventEmitter, 'exit').pipe(
    take(1),
    tap((signal) => {
      logger.debug(`Kibana process forcefully exited with signal: ${signal}`);
    }),
    mapTo('SIGKILL')
  );

  const signalForChildProcess$ = merge(ownTerminateMapToKill$, kibanaForceExit$);

  const logAndKillChildProcess = tap((signal: string) => {
    logger.debug(`Child process terminate signal was: ${signal}. Closing the browser...`);
    return childProcess.kill(signal);
  });

  // send termination signals
  const terminate$ = merge(
    signalForChildProcess$.pipe(logAndKillChildProcess),

    ownTerminateSignal$.pipe(
      delay(1),
      tap((signal) => {
        logger.debug(`Kibana process terminate signal was: ${signal}. Closing the browser...`);
        return process.kill(process.pid, signal);
      })
    )
  );

  return { terminate$ };
}
