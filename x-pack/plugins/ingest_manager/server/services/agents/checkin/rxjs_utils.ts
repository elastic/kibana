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
  const waitingObservers = new Map<Rx.Subscriber<any>, any>();

  let tokens = ratelimitRequestPerInterval;

  function addToken() {
    if (tokens < ratelimitRequestPerInterval) {
      tokens++;
    }
    publishIfTokensAvailable();
  }

  function consumeToken() {
    tokens--;
  }

  function isTokenAvailable() {
    return tokens > 0;
  }

  function publishIfTokensAvailable() {
    if (!isTokenAvailable()) {
      return;
    }
    const ite = waitingObservers.entries().next();
    if (!ite.done) {
      consumeToken();
      waitingObservers.delete(ite.value[0]);
      ite.value[0].next(ite.value[1]);
      Rx.asyncScheduler.schedule(() => {
        addToken();
      }, ratelimitIntervalMs);
    }
  }

  return function limit<T>(): Rx.MonoTypeOperatorFunction<T> {
    return (observable) =>
      new Rx.Observable<T>((observer) => {
        const subscription = observable.subscribe({
          next(value) {
            waitingObservers.delete(observer);
            waitingObservers.set(observer, value);

            publishIfTokensAvailable();
          },
          error(err) {
            observer.error(err);
          },
          complete() {
            observer.complete();
          },
        });

        return () => {
          waitingObservers.delete(observer);
          subscription.unsubscribe();
        };
      });
  };
}
