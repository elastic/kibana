/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { of, merge, timer, throwError } from 'rxjs';
import { takeWhile, switchMap, expand, mergeMap } from 'rxjs/operators';

import {
  AbortError,
  doSearch,
  IKibanaSearchResponse,
  isErrorResponse,
} from '../../../../../../src/plugins/data/common';
import type { IKibanaSearchRequest } from '../../../../../../src/plugins/data/common';
import type { IAsyncSearchOptions } from '../../../common/search/types';

const DEFAULT_POLLING_INTERVAL = 1000;

export const doPartialSearch = <SearchResponse = any>(
  searchMethod: () => Promise<SearchResponse>,
  partialSearchMethod: (id: IKibanaSearchRequest['id']) => Promise<SearchResponse>,
  isPartialResponse: (response: SearchResponse) => boolean,
  getId: (response: SearchResponse) => IKibanaSearchRequest['id'],
  requestId: IKibanaSearchRequest['id'],
  { abortSignal, pollInterval = DEFAULT_POLLING_INTERVAL }: IAsyncSearchOptions
) => {
  const partialSearch = (id: IKibanaSearchRequest['id']) =>
    doSearch<SearchResponse>(() => partialSearchMethod(id), abortSignal).pipe(
      expand(() => timer(pollInterval).pipe(switchMap(() => partialSearchMethod(id)))),
      takeWhile((response) => !isPartialResponse(response), true)
    );

  return requestId
    ? partialSearch(requestId)
    : doSearch<SearchResponse>(searchMethod, abortSignal).pipe(
        mergeMap((response) =>
          !isPartialResponse(response)
            ? merge(of(response), partialSearch(getId(response)))
            : of(response)
        )
      );
};

export const throwOnEsError = () =>
  mergeMap((r: IKibanaSearchResponse) =>
    isErrorResponse(r) ? merge(of(r), throwError(new AbortError())) : of(r)
  );
