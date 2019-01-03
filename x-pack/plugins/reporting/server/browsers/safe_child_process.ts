/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as Rx from 'rxjs';
import { delay, ignoreElements, mapTo, share, take, tap } from 'rxjs/operators';

interface IChildProcess {
  kill: (signal: string) => any;
}

// Our process can get sent various signals, and when these occur we wish to
// kill the subprocess and then kill our process as long as the observer isn't cancelled
export function safeChildProcess(childProcess: IChildProcess, observer: any) {
  const ownTerminateSignal$ = Rx.merge(
    Rx.fromEvent(process as any, 'SIGTERM').pipe(mapTo('SIGTERM')),
    Rx.fromEvent(process as any, 'SIGINT').pipe(mapTo('SIGINT')),
    Rx.fromEvent(process as any, 'SIGBREAK').pipe(mapTo('SIGBREAK'))
  ).pipe(
    take(1),
    share()
  );

  // signals that will be sent to the child process as a result of the main process
  // being sent these signals, or the exit being triggered
  const signalForChildProcess$ = Rx.merge(
    // SIGKILL when this process gets a terminal signal
    ownTerminateSignal$.pipe(mapTo('SIGKILL')),

    // SIGKILL when this process forcefully exits
    Rx.fromEvent(process as any, 'exit').pipe(
      take(1),
      mapTo('SIGKILL')
    )
  );

  // send termination signals
  const terminate$ = Rx.merge(
    signalForChildProcess$.pipe(tap((signal: string) => childProcess.kill(signal))),

    ownTerminateSignal$.pipe(
      delay(1),
      tap((signal: number) => process.kill(process.pid, signal))
    )
  );

  // this is adding unsubscribe logic to our observer
  // so that if our observer unsubscribes, we terminate our child-process
  observer.add(() => {
    childProcess.kill('SIGKILL');
  });

  observer.add(terminate$.pipe(ignoreElements()).subscribe(observer));
}

// If a process exits ungracefully, we can try to help the user make sense of why
// by giving them a suggestion based on the code.
export function exitCodeSuggestion(code: number | null) {
  if (code === null) {
    return 'Your report may be too large. Try removing some visualizations or increasing the RAM available to Kibana.';
  }
  return '';
}
