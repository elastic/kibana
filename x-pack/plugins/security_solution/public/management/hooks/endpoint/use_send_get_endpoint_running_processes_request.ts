/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation, UseMutationOptions, UseMutationResult } from 'react-query';
import { HttpFetchError } from '@kbn/core/public';
import {
  RunningProcessesRequestBody,
  ResponseActionApiResponse,
  RunningProcessesEntry,
} from '../../../../common/endpoint/types/actions';
import { GET_RUNNING_PROCESSES_ROUTE } from '../../../../common/endpoint/constants';
import { KibanaServices } from '../../../common/lib/kibana';

/**
 * Get running processes
 * @param customOptions
 */
export const useSendGetEndpointRunningProcessesRequest = (
  customOptions?: UseMutationOptions<
    ResponseActionApiResponse<RunningProcessesEntry>,
    HttpFetchError,
    RunningProcessesRequestBody
  >
): UseMutationResult<
  ResponseActionApiResponse<RunningProcessesEntry>,
  HttpFetchError,
  RunningProcessesRequestBody
> => {
  return useMutation<
    ResponseActionApiResponse<RunningProcessesEntry>,
    HttpFetchError,
    RunningProcessesRequestBody
  >((getRunningProcessesData: RunningProcessesRequestBody) => {
    return KibanaServices.get().http.post<ResponseActionApiResponse<RunningProcessesEntry>>(
      GET_RUNNING_PROCESSES_ROUTE,
      {
        body: JSON.stringify(getRunningProcessesData),
      }
    );
  }, customOptions);
};
