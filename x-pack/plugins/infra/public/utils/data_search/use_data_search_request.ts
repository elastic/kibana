/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import { Subject } from 'rxjs';
import { map, share, switchMap, tap } from 'rxjs/operators';
import {
  IKibanaSearchRequest,
  IKibanaSearchResponse,
  ISearchOptions,
} from '../../../../../../src/plugins/data/public';
import { useKibanaContextForPlugin } from '../../hooks/use_kibana';
import { tapUnsubscribe, useObservable } from '../use_observable';

export type DataSearchRequestFactory<Args extends any[], Request extends IKibanaSearchRequest> = (
  ...args: Args
) =>
  | {
      request: Request;
      options: ISearchOptions;
    }
  | null
  | undefined;

export const useDataSearch = <
  RequestFactoryArgs extends any[],
  Request extends IKibanaSearchRequest,
  RawResponse
>({
  getRequest,
}: {
  getRequest: DataSearchRequestFactory<RequestFactoryArgs, Request>;
}) => {
  const { services } = useKibanaContextForPlugin();
  const request$ = useObservable(
    () => new Subject<{ request: Request; options: ISearchOptions }>(),
    []
  );
  const requests$ = useObservable(
    (inputs$) =>
      inputs$.pipe(
        switchMap(([currentRequest$]) => currentRequest$),
        map(({ request, options }) => {
          const abortController = new AbortController();
          let isAbortable = true;

          return {
            abortController,
            request,
            options,
            response$: services.data.search
              .search<Request, IKibanaSearchResponse<RawResponse>>(request, {
                abortSignal: abortController.signal,
                ...options,
              })
              .pipe(
                // avoid aborting failed or completed requests
                tap({
                  error: () => {
                    isAbortable = false;
                  },
                  complete: () => {
                    isAbortable = false;
                  },
                }),
                tapUnsubscribe(() => {
                  if (isAbortable) {
                    abortController.abort();
                  }
                }),
                share()
              ),
          };
        })
      ),
    [request$]
  );

  const search = useCallback(
    (...args: RequestFactoryArgs) => {
      const request = getRequest(...args);

      if (request) {
        request$.next(request);
      }
    },
    [getRequest, request$]
  );

  return {
    requests$,
    search,
  };
};
