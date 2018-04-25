/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



import { Observable } from 'rxjs';

// Our process can get sent various signals, and when these occur we wish to
// kill the subprocess and then kill our process as long as the observer isn't cancelled
export function safeChildProcess(childProcess, signal = 'SIGTERM') {
  const childProcessSignal$ = Observable.of(signal);
  const ownTerminateSignal$ = Observable.merge(
    Observable.fromEvent(process, 'SIGTERM').mapTo('SIGTERM'),
    Observable.fromEvent(process, 'SIGINT').mapTo('SIGINT'),
    Observable.fromEvent(process, 'SIGBREAK').mapTo('SIGBREAK'),
  )
    .take(1)
    .share();

  const status = {
    terminating: false
  };

  // signals that will be sent to the child process as a result of the main process
  // being sent these signals, or the exit being triggered
  const signalForChildProcess$ = Observable.merge(
    ownTerminateSignal$,
    Observable.fromEvent(process, 'exit')
  )
    .do(() => status.terminating = true)
    .take(1)
    .switchMapTo(childProcessSignal$);

    // send termination signals
  const terminate$ = Observable.merge(
    signalForChildProcess$
      .do(signal => {
        childProcess.kill(signal);
      }),

    ownTerminateSignal$
      .delay(1)
      .do(signal => {
        process.kill(process.pid, signal);
      })
  );

  const subscription = terminate$.subscribe();
  childProcess.on('exit', () => {
    subscription.unsubscribe();
  });

  return status;
}
