/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { from, of, timer, Observable, EMPTY } from 'rxjs';
import { first, expand, mergeMap, takeWhile, switchMap } from 'rxjs/operators';
import { ApiResponse } from '@elastic/elasticsearch';

import {
  doSearch,
  toSnakeCase,
  SearchMethod,
  DoSearchFnArgs,
  IEsRawSearchResponse,
  IKibanaSearchRequest,
  IKibanaSearchResponse,
  isCompleteResponse,
} from '../../../../../../src/plugins/data/common';
import { IAsyncSearchOptions } from '../../../common/search/types';

export const takePartialSearch = <TResponse = any>(
  searchMethod: () => Promise<TResponse> | Observable<TResponse>,
  hasRequestCompleted: (r: TResponse) => boolean,
  pollInterval: IAsyncSearchOptions['pollInterval']
): Observable<TResponse> =>
  from(searchMethod()).pipe(
    expand((r) => {
      if (!hasRequestCompleted(r)) {
        return timer(pollInterval ?? 1000).pipe(
          switchMap(() => takePartialSearch(searchMethod, hasRequestCompleted, pollInterval)),
          first()
        );
      }
      return EMPTY;
    })
  );

export const doPartialSearch = <SearchResponse extends IEsRawSearchResponse = IEsRawSearchResponse>(
  searchMethod: SearchMethod,
  partialSearchMethod: SearchMethod,
  requestId: IKibanaSearchRequest['id'],
  asyncOptions: Record<string, any>,
  { abortSignal, waitForCompletion, pollInterval }: IAsyncSearchOptions
) => ({ params, options }: DoSearchFnArgs) => {
  const isCompleted = (response: ApiResponse<SearchResponse>) =>
    !(response.body.is_partial && response.body.is_running);

  const partialSearch = (id: IKibanaSearchRequest['id']) =>
    takePartialSearch<ApiResponse<SearchResponse>>(
      () =>
        partialSearchMethod(
          {
            id,
            ...toSnakeCase(asyncOptions),
          },
          options
        ),
      (response) => (waitForCompletion ? isCompleted(response) : true),
      pollInterval
    );

  return requestId
    ? partialSearch(requestId)
    : of({ params, options }).pipe(
        switchMap(doSearch<SearchResponse>(searchMethod, abortSignal)),
        mergeMap((response) =>
          waitForCompletion && !isCompleted(response)
            ? partialSearch(response.body.id)
            : Promise.resolve(response)
        )
      );
};

export const takeUntilPollingComplete = (waitForCompletion: boolean = false) =>
  takeWhile(
    (response: IKibanaSearchResponse) => waitForCompletion && !isCompleteResponse(response),
    true
  );
