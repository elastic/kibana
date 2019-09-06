/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Observable, from, interval, of } from 'rxjs';
import { switchMap, concatMap, takeWhile, map } from 'rxjs/operators';
import {
  TClientSearchStrategyProvider,
  IKibanaClientSearchRequest,
  IKibanaClientSearchResponse,
  IClientSearchStrategy,
  ISearchContext,
  SYNC_SEARCH_STRATEGY,
  ISearchOptions,
} from '../../../../src/plugins/search/public';

const search = (context: ISearchContext) => (
  request: IKibanaClientSearchRequest,
  options: ISearchOptions
): Observable<IKibanaClientSearchResponse<any>> => {
  const pingInterval = 500;
  return interval(pingInterval)
    .pipe(
      switchMap(() =>
        from(
          context.search.search<IKibanaClientSearchRequest, IKibanaClientSearchResponse<any>>(
            request,
            options,
            SYNC_SEARCH_STRATEGY
          )
        )
      )
    )
    .pipe<IKibanaClientSearchResponse<any>>(
      // Once we have RxJs 6.4 we can use the built in takeWhile inclusive option
      // and simplify this.
      concatMap((response: IKibanaClientSearchResponse<any>) => {
        if (request.id && response.id && request.id !== response.id) {
          throw new Error('Something went wrong, request and response ids not equal!');
        }
        request.id = response.id;
        return response.percentComplete < 100 ? of(response) : of(response, { kill: true });
      }),
      takeWhile(({ kill }: { kill: boolean }) => {
        return !kill && (!options.signal || !options.signal.aborted);
      }),
      map(response => response)
    );
};

export const asyncSearchStrategyProvider: TClientSearchStrategyProvider<
  IKibanaClientSearchRequest,
  IKibanaClientSearchResponse<any>
> = (
  context: ISearchContext
): IClientSearchStrategy<IKibanaClientSearchRequest, IKibanaClientSearchResponse<any>> => {
  return {
    search: (request, options) => search(context)(request, options),
  };
};
