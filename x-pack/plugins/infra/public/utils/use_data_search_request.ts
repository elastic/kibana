/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useCallback } from 'react';
import { Observable, of, Subject } from 'rxjs';
import { catchError, map, share, startWith, switchMap, tap } from 'rxjs/operators';
import {
  IKibanaSearchRequest,
  IKibanaSearchResponse,
  ISearchOptions,
} from '../../../../../src/plugins/data/public';
import { AbortError } from '../../../../../src/plugins/kibana_utils/public';
import { SearchStrategyError } from '../../common/search_strategies/common/errors';
import { useKibanaContextForPlugin } from '../hooks/use_kibana';
import {
  tapUnsubscribe,
  useLatest,
  useObservable,
  useObservableState,
} from '../utils/use_observable';

export interface DataSearchRequestDescriptor<Request extends IKibanaSearchRequest, RawResponse> {
  request: Request;
  options: ISearchOptions;
  response$: Observable<IKibanaSearchResponse<RawResponse>>;
  abortController: AbortController;
}

interface NormalizedKibanaSearchResponse<ResponseData> {
  total?: number;
  loaded?: number;
  isRunning: boolean;
  isPartial: boolean;
  data: ResponseData;
  errors: SearchStrategyError[];
}

interface DataSearchResponseDescriptor<Request extends IKibanaSearchRequest, Response> {
  request: Request;
  options: ISearchOptions;
  response: NormalizedKibanaSearchResponse<Response>;
  abortController: AbortController;
}

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

export const useLatestPartialDataSearchRequest = <
  Request extends IKibanaSearchRequest,
  RawResponse,
  Response,
  InitialResponse
>(
  requests$: Observable<DataSearchRequestDescriptor<Request, RawResponse>>,
  initialResponse: InitialResponse,
  projectResponse: (rawResponse: RawResponse) => { data: Response; errors?: SearchStrategyError[] }
) => {
  const latestInitialResponse = useLatest(initialResponse);
  const latestProjectResponse = useLatest(projectResponse);

  const latestResponse$: Observable<
    DataSearchResponseDescriptor<Request, Response | InitialResponse>
  > = useObservable(
    (inputs$) =>
      inputs$.pipe(
        switchMap(([currentRequests$]) =>
          currentRequests$.pipe(
            switchMap(({ abortController, options, request, response$ }) =>
              response$.pipe(
                map((response) => {
                  const { data, errors = [] } = latestProjectResponse.current(response.rawResponse);
                  return {
                    abortController,
                    options,
                    request,
                    response: {
                      data,
                      errors,
                      isPartial: response.isPartial ?? false,
                      isRunning: response.isRunning ?? false,
                      loaded: response.loaded,
                      total: response.total,
                    },
                  };
                }),
                startWith({
                  abortController,
                  options,
                  request,
                  response: {
                    data: latestInitialResponse.current,
                    errors: [],
                    isPartial: true,
                    isRunning: true,
                    loaded: 0,
                    total: undefined,
                  },
                }),
                catchError((error) =>
                  of({
                    abortController,
                    options,
                    request,
                    response: {
                      data: latestInitialResponse.current,
                      errors: [
                        error instanceof AbortError
                          ? {
                              type: 'aborted' as const,
                            }
                          : {
                              type: 'generic' as const,
                              message: `${error.message ?? error}`,
                            },
                      ],
                      isPartial: true,
                      isRunning: false,
                      loaded: 0,
                      total: undefined,
                    },
                  })
                )
              )
            )
          )
        )
      ),
    [requests$] as const
  );

  const { latestValue } = useObservableState(latestResponse$, undefined);

  const cancelRequest = useCallback(() => {
    latestValue?.abortController.abort();
  }, [latestValue]);

  return {
    cancelRequest,
    isRequestRunning: latestValue?.response.isRunning ?? false,
    isResponsePartial: latestValue?.response.isPartial ?? false,
    latestResponseData: latestValue?.response.data,
    latestResponseErrors: latestValue?.response.errors,
    loaded: latestValue?.response.loaded,
    total: latestValue?.response.total,
  };
};
