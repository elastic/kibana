/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { interval, Observable, merge } from 'rxjs';
import { flatMap, map, takeWhile, tap } from 'rxjs/operators';
import {
  IKibanaSearchResponse,
  ISearchContext,
  ISearchGeneric,
  ISearchOptions,
  ISearchStrategy,
  ISyncSearchRequest,
  SYNC_SEARCH_STRATEGY,
  TSearchStrategyProvider,
} from '../../../../../src/plugins/data/public';

export const ASYNC_SEARCH_STRATEGY = 'ASYNC_SEARCH_STRATEGY';

export interface IAsyncSearchOptions extends ISearchOptions {
  pollInterval?: number;
}

export interface IAsyncSearchRequest extends ISyncSearchRequest {
  id?: string;
}

declare module '../../../../../src/plugins/data/public' {
  export interface IRequestTypesMap {
    [ASYNC_SEARCH_STRATEGY]: IAsyncSearchRequest;
  }
}

export const asyncSearchStrategyProvider: TSearchStrategyProvider<typeof ASYNC_SEARCH_STRATEGY> = (
  context: ISearchContext,
  search: ISearchGeneric
): ISearchStrategy<typeof ASYNC_SEARCH_STRATEGY> => {
  return {
    search: (
      request: IAsyncSearchRequest,
      { pollInterval = 1000, ...options }: IAsyncSearchOptions = {}
    ): Observable<IKibanaSearchResponse> => {
      return merge(
        search(request, options, SYNC_SEARCH_STRATEGY).pipe(
          tap(response => {
            // After the initial request, we only send the ID and server strategy in subsequent requests
            request = { id: response.id, serverStrategy: request.serverStrategy };
          })
        ),
        interval(pollInterval).pipe(
          flatMap(() => {
            return search(request, options, SYNC_SEARCH_STRATEGY);
          })
        )
      ).pipe(
        takeWhile(response => {
          return (response.loaded ?? 0) < (response.total ?? 1);
        })
      );
    },
  };
};
