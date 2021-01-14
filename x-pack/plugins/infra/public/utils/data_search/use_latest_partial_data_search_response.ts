/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useCallback } from 'react';
import { Observable } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { IKibanaSearchRequest } from '../../../../../../src/plugins/data/public';
import { useLatest, useObservable, useObservableState } from '../use_observable';
import { handleDataSearchResponse, ResponseProjection } from './handle_data_search_response';
import { DataSearchRequestDescriptor, DataSearchResponseDescriptor } from './types';

export const useLatestPartialDataSearchResponse = <
  Request extends IKibanaSearchRequest,
  RawResponse,
  Response,
  InitialResponse
>(
  requests$: Observable<DataSearchRequestDescriptor<Request, RawResponse>>,
  initialResponse: InitialResponse,
  projectResponse: ResponseProjection<RawResponse, Response>
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
            switchMap(handleDataSearchResponse(latestInitialResponse, latestProjectResponse))
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
