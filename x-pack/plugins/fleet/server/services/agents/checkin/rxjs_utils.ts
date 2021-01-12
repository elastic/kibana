/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as Rx from 'rxjs';
import { concatMap, delay } from 'rxjs/operators';

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
  ratelimitRequestPerInterval: number,
  maxDelay: number,
  scheduler = Rx.asyncScheduler
) {
  let intervalEnd = 0;
  let countInCurrentInterval = 0;

  function createRateLimitOperator<T>(): Rx.OperatorFunction<T, T> {
    const maxIntervalEnd = scheduler.now() + maxDelay;

    return Rx.pipe(
      concatMap(function rateLimit(value: T) {
        const now = scheduler.now();
        if (intervalEnd <= now) {
          countInCurrentInterval = 1;
          intervalEnd = now + ratelimitIntervalMs;
          return Rx.of(value);
        } else if (intervalEnd >= maxIntervalEnd) {
          // drop the value as it's never going to success as long polling timeout is going to happen before we can send the policy
          return Rx.EMPTY;
        } else {
          if (++countInCurrentInterval > ratelimitRequestPerInterval) {
            countInCurrentInterval = 1;
            intervalEnd += ratelimitIntervalMs;
          }

          const wait = intervalEnd - ratelimitIntervalMs - now;
          return wait > 0 ? Rx.of(value).pipe(delay(wait, scheduler)) : Rx.of(value);
        }
      })
    );
  }
  return createRateLimitOperator;
}
