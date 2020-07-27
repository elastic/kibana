/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as Rx from 'rxjs';

export class AbortError extends Error {}

export const toPromiseAbortable = <T>(
  observable: Rx.Observable<T>,
  signal?: AbortSignal
): Promise<T> =>
  new Promise((resolve, reject) => {
    if (signal && signal.aborted) {
      reject(new AbortError('Aborted'));
      return;
    }

    const listener = () => {
      subscription.unsubscribe();
      reject(new AbortError('Aborted'));
    };
    const cleanup = () => {
      if (signal) {
        signal.removeEventListener('abort', listener);
      }
    };
    const subscription = observable.subscribe(
      (data) => {
        cleanup();
        resolve(data);
      },
      (err) => {
        cleanup();
        reject(err);
      }
    );

    if (signal) {
      signal.addEventListener('abort', listener, { once: true });
    }
  });

export function createSubscriberConcurrencyLimiter(maxConcurrency: number) {
  let observers: Array<[Rx.Subscriber<any>, any]> = [];
  let activeObservers: Array<Rx.Subscriber<any>> = [];

  function processNext() {
    if (activeObservers.length >= maxConcurrency) {
      return;
    }
    const observerValuePair = observers.shift();

    if (!observerValuePair) {
      return;
    }

    const [observer, value] = observerValuePair;
    activeObservers.push(observer);
    observer.next(value);
  }

  return function limit<T>(): Rx.MonoTypeOperatorFunction<T> {
    return (observable) =>
      new Rx.Observable<T>((observer) => {
        const subscription = observable.subscribe({
          next(value) {
            observers = [...observers, [observer, value]];
            processNext();
          },
          error(err) {
            observer.error(err);
          },
          complete() {
            observer.complete();
          },
        });

        return () => {
          activeObservers = activeObservers.filter((o) => o !== observer);
          observers = observers.filter((o) => o[0] !== observer);
          subscription.unsubscribe();
          processNext();
        };
      });
  };
}
