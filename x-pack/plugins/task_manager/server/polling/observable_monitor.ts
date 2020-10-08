/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Subject, Observable, throwError, interval, timer, Subscription } from 'rxjs';
import { exhaustMap, tap, takeUntil, switchMap, switchMapTo, catchError } from 'rxjs/operators';
import { noop } from 'lodash';

const DEFAULT_HEARTBEAT_INTERVAL = 1000;

// by default don't monitor inactivity as not all observables are expected
// to emit at any kind of fixed interval
const DEFAULT_INACTIVITY_TIMEOUT = 0;

export interface ObservableMonitorOptions<E> {
  heartbeatInterval?: number;
  inactivityTimeout?: number;
  onError?: (err: E) => void;
}

export function createObservableMonitor<T, E>(
  observableFactory: () => Observable<T>,
  {
    heartbeatInterval = DEFAULT_HEARTBEAT_INTERVAL,
    inactivityTimeout = DEFAULT_INACTIVITY_TIMEOUT,
    onError = noop,
  }: ObservableMonitorOptions<E> = {}
): Observable<T> {
  return new Observable((subscriber) => {
    const subscription: Subscription = interval(heartbeatInterval)
      .pipe(
        // switch from the heartbeat interval to the instantiated observable until it completes / errors
        exhaustMap(() => takeUntilDurationOfInactivity(observableFactory(), inactivityTimeout)),
        // if an error is thrown, catch it, notify and try to recover
        catchError((err: E, source$: Observable<T>) => {
          onError(err);
          // return source, which will allow our observable to recover from this error and
          // keep pulling values out of it
          return source$;
        })
      )
      .subscribe(subscriber);
    return () => {
      subscription.unsubscribe();
    };
  });
}

function takeUntilDurationOfInactivity<T>(source$: Observable<T>, inactivityTimeout: number) {
  // if there's a specified maximum duration of inactivity, only take values until that
  // duration elapses without any new events
  if (inactivityTimeout) {
    // an observable which starts a timer every time a new value is passed in, replacing the previous timer
    // if the timer goes off without having been reset by a fresh value, it will emit a single event - which will
    // notify our monitor that the source has been inactive for too long
    const inactivityMonitor$ = new Subject<void>();
    return source$.pipe(
      takeUntil(
        inactivityMonitor$.pipe(
          // on each new emited value, start a new timer, discarding the old one
          switchMap(() => timer(inactivityTimeout)),
          // every time a timer expires (meaning no new value came in on time to discard it)
          // throw an error, forcing the monitor instantiate a new observable
          switchMapTo(
            throwError(
              new Error(
                `Observable Monitor: Hung Observable restarted after ${inactivityTimeout}ms of inactivity`
              )
            )
          )
        )
      ),
      // poke `inactivityMonitor$` so it restarts the timer
      tap(() => inactivityMonitor$.next())
    );
  }
  return source$;
}
