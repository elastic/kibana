/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EMPTY, fromEvent, NEVER, throwError, timer } from 'rxjs';
import { mergeMap, expand, takeUntil } from 'rxjs/operators';
import { CoreSetup } from '../../../../../src/core/public';
import { AbortError } from '../../../../../src/plugins/data/common';
import {
  DataPublicPluginSetup,
  ISearch,
  ISearchStrategy,
  ISyncSearchRequest,
  SYNC_SEARCH_STRATEGY,
} from '../../../../../src/plugins/data/public';
import { IAsyncSearchOptions } from './types';

export const ASYNC_SEARCH_STRATEGY = 'ASYNC_SEARCH_STRATEGY';

declare module '../../../../../src/plugins/data/public' {
  export interface IRequestTypesMap {
    [ASYNC_SEARCH_STRATEGY]: ISyncSearchRequest;
  }
}

export function asyncSearchStrategyProvider(
  core: CoreSetup,
  data: DataPublicPluginSetup
): ISearchStrategy<typeof ASYNC_SEARCH_STRATEGY> {
  const syncSearch = data.search.getSearchStrategy(SYNC_SEARCH_STRATEGY);
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

    return syncSearch.search(request, options).pipe(
      expand(response => {
        // If the response indicates it is complete, stop polling and complete the observable
        if ((response.loaded ?? 0) >= (response.total ?? 0)) return EMPTY;

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
  };
  return { search };
}
