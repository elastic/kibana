/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { Observable } from 'rxjs';

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
