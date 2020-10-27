/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { of, interval, Observable } from 'rxjs';
import { concatMap, takeWhile, switchMap } from 'rxjs/operators';
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
): Observable<TResponse> => {
  return interval(pollInterval ?? 1000).pipe(
    concatMap(() => searchMethod()),
    takeWhile((r) => !hasRequestCompleted(r), true)
  );
};

export const doPartialSearch = <SearchResponse extends IEsRawSearchResponse = IEsRawSearchResponse>(
  searchMethod: SearchMethod,
  partialSearchMethod: SearchMethod,
  requestId: IKibanaSearchRequest['id'],
  asyncOptions: Record<string, any>,
  { abortSignal, pollInterval, waitForCompletion }: IAsyncSearchOptions
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
        concatMap((response) =>
          waitForCompletion && !isCompleted(response)
            ? partialSearch(response.body.id)
            : Promise.resolve(response)
        )
      );
};
