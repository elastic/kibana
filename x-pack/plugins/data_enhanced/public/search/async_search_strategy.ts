/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EMPTY, fromEvent, NEVER, throwError, timer, Observable, from } from 'rxjs';
import { mergeMap, expand, takeUntil, share, flatMap } from 'rxjs/operators';
import { CoreSetup } from '../../../../../src/core/public';
import { AbortError } from '../../../../../src/plugins/data/common';
import {
  ISearch,
  ISearchStrategy,
  ISyncSearchRequest,
  SYNC_SEARCH_STRATEGY,
} from '../../../../../src/plugins/data/public';
import { IAsyncSearchOptions, IAsyncSearchResponse, IAsyncSearchRequest } from './types';
import { DataEnhancedStartDependencies } from '../plugin';

export const ASYNC_SEARCH_STRATEGY = 'ASYNC_SEARCH_STRATEGY';

declare module '../../../../../src/plugins/data/public' {
  export interface IRequestTypesMap {
    [ASYNC_SEARCH_STRATEGY]: IAsyncSearchRequest;
  }
}

export function asyncSearchStrategyProvider(
  core: CoreSetup<DataEnhancedStartDependencies>
): ISearchStrategy<typeof ASYNC_SEARCH_STRATEGY> {
  const startServices$ = from(core.getStartServices()).pipe(share());

  const search: ISearch<typeof ASYNC_SEARCH_STRATEGY> = (
    request: ISyncSearchRequest,
    { pollInterval = 1000, ...options }: IAsyncSearchOptions = {}
  ) => {
    const { serverStrategy } = request;
    let { id } = request;

    const aborted$ = options.signal
      ? fromEvent(options.signal, 'abort').pipe(
          mergeMap(() => {
            // If we haven't received the response to the initial request, including the ID, then
            // we don't need to send a follow-up request to delete this search. Otherwise, we
            // send the follow-up request to delete this search, then throw an abort error.
            if (id !== undefined) {
              core.http.delete(`/internal/search/${request.serverStrategy}/${id}`);
            }
            return throwError(new AbortError());
          })
        )
      : NEVER;

    return startServices$.pipe(
      flatMap((startServices) => {
        const syncSearch = startServices[1].data.search.getSearchStrategy(SYNC_SEARCH_STRATEGY);
        return (syncSearch.search(request, options) as Observable<IAsyncSearchResponse>).pipe(
          expand((response) => {
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
                return syncSearch.search({ id, serverStrategy }, options);
              })
            );
          }),
          takeUntil(aborted$)
        );
      })
    );
  };
  return { search };
}
