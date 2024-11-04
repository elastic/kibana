/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UseMutationOptions, UseMutationResult } from '@tanstack/react-query';
import { useMutation } from '@tanstack/react-query';
import type { IHttpFetchError } from '@kbn/core-http-browser';
import type { GetProcessesRequestBody } from '../../../../common/api/endpoint';
import type {
  ResponseActionApiResponse,
  GetProcessesActionOutputContent,
} from '../../../../common/endpoint/types/actions';
import { GET_PROCESSES_ROUTE } from '../../../../common/endpoint/constants';
import { KibanaServices } from '../../../common/lib/kibana';

/**
 * Get running processes
 * @param customOptions
 */
export const useSendGetEndpointProcessesRequest = (
  customOptions?: UseMutationOptions<
    ResponseActionApiResponse<GetProcessesActionOutputContent>,
    IHttpFetchError,
    GetProcessesRequestBody
  >
): UseMutationResult<
  ResponseActionApiResponse<GetProcessesActionOutputContent>,
  IHttpFetchError,
  GetProcessesRequestBody
> => {
  return useMutation<
    ResponseActionApiResponse<GetProcessesActionOutputContent>,
    IHttpFetchError,
    GetProcessesRequestBody
  >((getRunningProcessesData: GetProcessesRequestBody) => {
    return KibanaServices.get().http.post<
      ResponseActionApiResponse<GetProcessesActionOutputContent>
    >(GET_PROCESSES_ROUTE, {
      body: JSON.stringify(getRunningProcessesData),
      version: '2023-10-31',
    });
  }, customOptions);
};
