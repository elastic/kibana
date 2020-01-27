/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EMPTY, fromEvent, NEVER, Observable, of, throwError } from 'rxjs';
import { mergeMap, takeWhile, expand, delay, first, takeUntil } from 'rxjs/operators';
import {
  IKibanaSearchResponse,
  ISearchContext,
  ISearchGeneric,
  ISearchStrategy,
  SYNC_SEARCH_STRATEGY,
  TSearchStrategyProvider,
} from '../../../../../src/plugins/data/public';
import { IAsyncSearchRequest, IAsyncSearchOptions } from './types';

export const ASYNC_SEARCH_STRATEGY = 'ASYNC_SEARCH_STRATEGY';

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
      const { serverStrategy } = request;
      let id: string | undefined = request.id;

      const aborted$ = options.signal
        ? fromEvent(options.signal, 'abort').pipe(
            first(),
            mergeMap(() => {
              // If we haven't received the response to the initial request, including the ID, then
              // we don't need to send a follow-up request to delete this search
              if (id === undefined) return EMPTY; // mergeMap expects to return an observable

              // Send the follow-up request to delete this search, then throw an abort error
              context.core.http.delete(`/internal/search/${request.serverStrategy}/${id}`);
              return throwError(new AbortError());
            })
          )
        : NEVER;

      return search(request, options, SYNC_SEARCH_STRATEGY).pipe(
        expand(response => {
          id = response.id;
          return of(null).pipe(
            // Delay by the given poll interval
            delay(pollInterval),
            // Send future requests using just the ID from the response
            mergeMap(() => search({ id, serverStrategy }, options, SYNC_SEARCH_STRATEGY))
          );
        }),
        // Stop polling if the signal is aborted
        takeUntil(aborted$),
        // Continue polling until the response indicates it is complete
        takeWhile(({ total = 1, loaded = 1 }) => loaded < total, true)
      );
    },
  };
};

export class AbortError extends Error {
  constructor(...args: Parameters<ErrorConstructor>) {
    super(...args);
    this.name = 'AbortError';
  }
}
