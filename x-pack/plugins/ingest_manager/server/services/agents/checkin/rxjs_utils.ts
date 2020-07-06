/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { Observable } from 'rxjs';
import * as Rx from 'rxjs';

export class AbortError extends Error {}

export const toPromiseAbortable = <T>(
  observable: Observable<T>,
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

export function createLimiter(ratelimitIntervalMs: number, ratelimitRequestPerInterval: number) {
  function createCurrentInterval() {
    return {
      startedAt: Rx.asyncScheduler.now(),
      numRequests: 0,
    };
  }

  let currentInterval: { startedAt: number; numRequests: number } = createCurrentInterval();
  let observers: Array<[Rx.Subscriber<any>, any]> = [];
  let timerSubsription: Rx.Subscription | undefined;

  function createTimout() {
    if (timerSubsription) {
      return;
    }
    timerSubsription = Rx.asyncScheduler.schedule(() => {
      timerSubsription = undefined;
      currentInterval = createCurrentInterval();
      for (const [waitingObserver, value] of observers) {
        if (currentInterval.numRequests >= ratelimitRequestPerInterval) {
          createTimout();
          continue;
        }
        currentInterval.numRequests++;
        waitingObserver.next(value);
      }
    }, ratelimitIntervalMs);
  }

  return function limit<T>(): Rx.MonoTypeOperatorFunction<T> {
    return (observable) =>
      new Observable<T>((observer) => {
        const subscription = observable.subscribe({
          next(value) {
            if (currentInterval.numRequests < ratelimitRequestPerInterval) {
              currentInterval.numRequests++;
              observer.next(value);
              return;
            }

            observers = [...observers, [observer, value]];
            createTimout();
          },
          error(err) {
            observer.error(err);
          },
          complete() {
            observer.complete();
          },
        });

        return () => {
          observers = observers.filter((o) => o[0] !== observer);
          subscription.unsubscribe();
        };
      });
  };
}
