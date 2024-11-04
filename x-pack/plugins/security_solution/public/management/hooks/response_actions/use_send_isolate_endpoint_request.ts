/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UseMutationOptions, UseMutationResult } from '@tanstack/react-query';
import { useMutation } from '@tanstack/react-query';
import type { IHttpFetchError } from '@kbn/core-http-browser';
import type { IsolationRouteRequestBody } from '../../../../common/api/endpoint';
import { isolateHost } from '../../../common/lib/endpoint/endpoint_isolation';
import type { ResponseActionApiResponse } from '../../../../common/endpoint/types';

/**
 * Create host isolation requests
 * @param customOptions
 */
export const useSendIsolateEndpointRequest = (
  customOptions?: UseMutationOptions<
    ResponseActionApiResponse,
    IHttpFetchError,
    IsolationRouteRequestBody
  >
): UseMutationResult<ResponseActionApiResponse, IHttpFetchError, IsolationRouteRequestBody> => {
  return useMutation<ResponseActionApiResponse, IHttpFetchError, IsolationRouteRequestBody>(
    (isolateData: IsolationRouteRequestBody) => {
      return isolateHost(isolateData);
    },
    customOptions
  );
};
