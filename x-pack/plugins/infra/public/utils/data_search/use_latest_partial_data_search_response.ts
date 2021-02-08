/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import { Observable, of } from 'rxjs';
import { catchError, map, startWith, switchMap } from 'rxjs/operators';
import { IKibanaSearchRequest } from '../../../../../../src/plugins/data/public';
import { AbortError } from '../../../../../../src/plugins/kibana_utils/public';
import { SearchStrategyError } from '../../../common/search_strategies/common/errors';
import { useLatest, useObservable, useObservableState } from '../use_observable';
import { DataSearchRequestDescriptor, DataSearchResponseDescriptor } from './types';

export const useLatestPartialDataSearchResponse = <
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
