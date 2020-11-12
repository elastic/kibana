/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { of, merge, timer, throwError } from 'rxjs';
import { takeWhile, switchMap, expand, mergeMap, tap } from 'rxjs/operators';

import {
  doSearch,
  IKibanaSearchResponse,
  isErrorResponse,
} from '../../../../../../src/plugins/data/common';
import { AbortError } from '../../../../../../src/plugins/kibana_utils/common';
import type { IKibanaSearchRequest } from '../../../../../../src/plugins/data/common';
import type { IAsyncSearchOptions } from '../../../common/search/types';

const DEFAULT_POLLING_INTERVAL = 1000;

export const doPartialSearch = <SearchResponse = any>(
  searchMethod: () => Promise<SearchResponse>,
  partialSearchMethod: (id: IKibanaSearchRequest['id']) => Promise<SearchResponse>,
  isCompleteResponse: (response: SearchResponse) => boolean,
  getId: (response: SearchResponse) => IKibanaSearchRequest['id'],
  requestId: IKibanaSearchRequest['id'],
  { abortSignal, pollInterval = DEFAULT_POLLING_INTERVAL }: IAsyncSearchOptions
) =>
  doSearch<SearchResponse>(
    requestId ? () => partialSearchMethod(requestId) : searchMethod,
    abortSignal
  ).pipe(
    tap((response) => (requestId = getId(response))),
    expand(() => timer(pollInterval).pipe(switchMap(() => partialSearchMethod(requestId)))),
    takeWhile((response) => !isCompleteResponse(response), true)
  );

export const throwOnEsError = () =>
  mergeMap((r: IKibanaSearchResponse) =>
    isErrorResponse(r) ? merge(of(r), throwError(new AbortError())) : of(r)
  );
