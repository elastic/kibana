/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Observable, OperatorFunction, takeUntil } from 'rxjs';
import { AbortError } from '@kbn/kibana-utils-plugin/common';

export function untilAborted<T>(signal: AbortSignal): OperatorFunction<T, T> {
  return (source$) => {
    const signal$ = new Observable((subscriber) => {
      if (signal.aborted) {
        subscriber.error(new AbortError());
      }
      signal.addEventListener('abort', () => {
        subscriber.error(new AbortError());
      });
    });

    return source$.pipe(takeUntil(signal$));
  };
}
