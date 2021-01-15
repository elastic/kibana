/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { from, Observable, timer, defer, fromEvent, EMPTY } from 'rxjs';
import { expand, map, switchMap, takeUntil, takeWhile, tap } from 'rxjs/operators';
import type { IKibanaSearchResponse } from '../../../../../src/plugins/data/common';
import { isErrorResponse, isPartialResponse } from '../../../../../src/plugins/data/common';
import { AbortError } from '../../../../../src/plugins/kibana_utils/common';
import type { IAsyncSearchOptions } from './types';

export const pollSearch = <Response extends IKibanaSearchResponse>(
  search: () => Promise<Response>,
  cancel?: () => void,
  { pollInterval = 1000, abortSignal }: IAsyncSearchOptions = {}
): Observable<Response> => {
  return defer(() => {
    if (abortSignal?.aborted) {
      throw new AbortError();
    }

    if (cancel) {
      abortSignal?.addEventListener('abort', cancel, { once: true });
    }

    const aborted$ = (abortSignal ? fromEvent(abortSignal, 'abort') : EMPTY).pipe(
      map(() => {
        throw new AbortError();
      })
    );

    return from(search()).pipe(
      expand(() => timer(pollInterval).pipe(switchMap(search))),
      tap((response) => {
        if (isErrorResponse(response)) {
          throw response ? new Error('Received partial response') : new AbortError();
        }
      }),
      takeWhile<Response>(isPartialResponse, true),
      takeUntil<Response>(aborted$)
    );
  });
};
