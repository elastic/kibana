/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Rx from 'rxjs';

// Our process can get sent various signals, and when these occur we wish to
// kill the subprocess and then kill our process as long as the observer isn't cancelled
export function safeChildProcess(childProcess, observer) {
  const ownTerminateSignal$ = Rx.Observable.merge(
    Rx.Observable.fromEvent(process, 'SIGTERM').mapTo('SIGTERM'),
    Rx.Observable.fromEvent(process, 'SIGINT').mapTo('SIGINT'),
    Rx.Observable.fromEvent(process, 'SIGBREAK').mapTo('SIGBREAK'),
  )
    .take(1)
    .share();

  // signals that will be sent to the child process as a result of the main process
  // being sent these signals, or the exit being triggered
  const signalForChildProcess$ = Rx.Observable.merge(
    // SIGKILL when this process gets a terminal signal
    ownTerminateSignal$
      .mapTo('SIGKILL'),

    // SIGKILL when this process forcefully exits
    Rx.Observable.fromEvent(process, 'exit')
      .take(1)
      .mapTo('SIGKILL'),
  );

    // send termination signals
  const terminate$ = Rx.Observable.merge(
    signalForChildProcess$
      .do(signal => childProcess.kill(signal)),

    ownTerminateSignal$
      .delay(1)
      .do(signal => process.kill(process.pid, signal))
  );

  // this is adding unsubscribe logic to our observer
  // so that if our observer unsubscribes, we terminate our child-process
  observer.add(() => {
    childProcess.kill('SIGKILL');
  });

  observer.add(terminate$.ignoreElements().subscribe(observer));
}