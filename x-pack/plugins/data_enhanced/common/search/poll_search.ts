/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { from, NEVER, Observable, timer } from 'rxjs';
import { expand, finalize, switchMap, takeUntil, takeWhile, tap } from 'rxjs/operators';
import type { IKibanaSearchResponse } from '../../../../../src/plugins/data/common';
import { isErrorResponse, isPartialResponse } from '../../../../../src/plugins/data/common';
import { AbortError, abortSignalToPromise } from '../../../../../src/plugins/kibana_utils/common';
import type { IAsyncSearchOptions } from './types';

export const pollSearch = <Response extends IKibanaSearchResponse>(
  search: () => Promise<Response>,
  { pollInterval = 1000, ...options }: IAsyncSearchOptions = {}
): Observable<Response> => {
  const aborted = options?.abortSignal
    ? abortSignalToPromise(options?.abortSignal)
    : { promise: NEVER, cleanup: () => {} };

  return from(search()).pipe(
    expand(() => timer(pollInterval).pipe(switchMap(search))),
    tap((response) => {
      if (isErrorResponse(response)) throw new AbortError();
    }),
    takeWhile<Response>(isPartialResponse, true),
    takeUntil<Response>(from(aborted.promise)),
    finalize(aborted.cleanup)
  );
};
