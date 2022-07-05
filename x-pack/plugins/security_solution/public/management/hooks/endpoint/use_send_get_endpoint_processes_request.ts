/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation, type UseMutationOptions, type UseMutationResult } from 'react-query';
import type { IHttpFetchError } from '@kbn/core-http-browser';
import type {
  RunningProcessesRequestBody,
  ResponseActionApiResponse,
  ProcessesEntry,
} from '../../../../common/endpoint/types/actions';
import { GET_PROCESSES_ROUTE } from '../../../../common/endpoint/constants';
import { KibanaServices } from '../../../common/lib/kibana';

/**
 * Get running processes
 * @param customOptions
 */
export const useSendGetEndpointProcessesRequest = (
  customOptions?: UseMutationOptions<
    ResponseActionApiResponse<ProcessesEntry>,
    IHttpFetchError,
    RunningProcessesRequestBody
  >
): UseMutationResult<
  ResponseActionApiResponse<ProcessesEntry>,
  IHttpFetchError,
  RunningProcessesRequestBody
> => {
  return useMutation<
    ResponseActionApiResponse<ProcessesEntry>,
    IHttpFetchError,
    RunningProcessesRequestBody
  >((getRunningProcessesData: RunningProcessesRequestBody) => {
    return KibanaServices.get().http.post<ResponseActionApiResponse<ProcessesEntry>>(
      GET_PROCESSES_ROUTE,
      {
        body: JSON.stringify(getRunningProcessesData),
      }
    );
  }, customOptions);
};
