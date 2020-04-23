/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EMPTY, fromEvent, NEVER, Observable, throwError, timer } from 'rxjs';
import { mergeMap, expand, takeUntil } from 'rxjs/operators';
import { AbortError } from '../../../../../src/plugins/data/common';
import {
  IKibanaSearchResponse,
  ISearchContext,
  ISearchStrategy,
  SYNC_SEARCH_STRATEGY,
  TSearchStrategyProvider,
} from '../../../../../src/plugins/data/public';
import { IAsyncSearchRequest, IAsyncSearchOptions, IAsyncSearchResponse } from './types';

export const ASYNC_SEARCH_STRATEGY = 'ASYNC_SEARCH_STRATEGY';

declare module '../../../../../src/plugins/data/public' {
  export interface IRequestTypesMap {
    [ASYNC_SEARCH_STRATEGY]: IAsyncSearchRequest;
  }
}

export const asyncSearchStrategyProvider: TSearchStrategyProvider<typeof ASYNC_SEARCH_STRATEGY> = (
  context: ISearchContext
): ISearchStrategy<typeof ASYNC_SEARCH_STRATEGY> => {
  const syncStrategyProvider = context.getSearchStrategy(SYNC_SEARCH_STRATEGY);
  const { search } = syncStrategyProvider(context);
  return {
    search: (
      request: IAsyncSearchRequest,
      { pollInterval = 1000, ...options }: IAsyncSearchOptions = {}
    ): Observable<IKibanaSearchResponse> => {
      const { serverStrategy } = request;
      let id: string | undefined = request.id;

      const aborted$ = options.signal
        ? fromEvent(options.signal, 'abort').pipe(
            mergeMap(() => {
              // If we haven't received the response to the initial request, including the ID, then
              // we don't need to send a follow-up request to delete this search. Otherwise, we
              // send the follow-up request to delete this search, then throw an abort error.
              if (id !== undefined) {
                context.core.http.delete(`/internal/search/${request.serverStrategy}/${id}`);
              }
              return throwError(new AbortError());
            })
          )
        : NEVER;

      return search(request, options).pipe(
        expand((response: IAsyncSearchResponse) => {
          // If the response indicates of an error, stop polling and complete the observable
          if (!response || (response.is_partial && !response.is_running)) {
            return throwError(new AbortError());
          }

          // If the response indicates it is complete, stop polling and complete the observable
          if (!response.is_running) return EMPTY;

          id = response.id;

          // Delay by the given poll interval
          return timer(pollInterval).pipe(
            // Send future requests using just the ID from the response
            mergeMap(() => {
              return search({ id, serverStrategy }, options);
            })
          );
        }),
        takeUntil(aborted$)
      );
    },
  };
};
