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

export function createRateLimiter(
  ratelimitIntervalMs: number,
  ratelimitRequestPerInterval: number
) {
  function createCurrentInterval() {
    return {
      startedAt: Rx.asyncScheduler.now(),
      numRequests: 0,
    };
  }

  let currentInterval: { startedAt: number; numRequests: number } = createCurrentInterval();
  let observers: Array<[Rx.Subscriber<any>, any]> = [];
  let timerSubscription: Rx.Subscription | undefined;

  function addObserver(observer: Rx.Subscriber<any>, value: any) {
    observers = [...observers, [observer, value]];
  }

  function removeObserver(observer: Rx.Subscriber<any>) {
    observers = observers.filter((o) => o[0] !== observer);
  }
  function createTimeout() {
    if (timerSubscription) {
      return;
    }
    timerSubscription = Rx.asyncScheduler.schedule(function rateLimiterTimeout() {
      timerSubscription = undefined;
      currentInterval = createCurrentInterval();
      for (const [waitingObserver, value] of observers) {
        if (currentInterval.numRequests >= ratelimitRequestPerInterval) {
          createTimeout();
          continue;
        }
        currentInterval.numRequests++;
        waitingObserver.next(value);
      }
    }, ratelimitIntervalMs);
  }

  return function limit<T>(): Rx.MonoTypeOperatorFunction<T> {
    return function createLimiter(observable) {
      return new Rx.Observable<T>(function createRateLimiterSubscriber(observer) {
        const subscription = observable.subscribe({
          next(value) {
            if (currentInterval.numRequests < ratelimitRequestPerInterval) {
              currentInterval.numRequests++;
              observer.next(value);
              return;
            }
            addObserver(observer, value);
            createTimeout();
          },
          error(err) {
            observer.error(err);
          },
          complete() {
            observer.complete();
          },
        });

        return function cleanRateLimiterSubscriber() {
          removeObserver(observer);

          subscription.unsubscribe();
        };
      });
    };
  };
}
