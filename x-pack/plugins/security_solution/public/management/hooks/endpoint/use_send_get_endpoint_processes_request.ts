/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation, UseMutationOptions, UseMutationResult } from 'react-query';
import { HttpFetchError } from '@kbn/core/public';
import {
  ProcessesRequestBody,
  ResponseActionApiResponse,
  ProcessesEntry,
} from '../../../../common/endpoint/types/actions';
import { GET_RUNNING_PROCESSES_ROUTE } from '../../../../common/endpoint/constants';
import { KibanaServices } from '../../../common/lib/kibana';

/**
 * Get running processes
 * @param customOptions
 */
export const useSendGetEndpointProcessesRequest = (
  customOptions?: UseMutationOptions<
    ResponseActionApiResponse<ProcessesEntry>,
    HttpFetchError,
    ProcessesRequestBody
  >
): UseMutationResult<
  ResponseActionApiResponse<ProcessesEntry>,
  HttpFetchError,
  ProcessesRequestBody
> => {
  return useMutation<
    ResponseActionApiResponse<ProcessesEntry>,
    HttpFetchError,
    ProcessesRequestBody
  >((getRunningProcessesData: ProcessesRequestBody) => {
    return KibanaServices.get().http.post<ResponseActionApiResponse<ProcessesEntry>>(
      GET_RUNNING_PROCESSES_ROUTE,
      {
        body: JSON.stringify(getRunningProcessesData),
      }
    );
  }, customOptions);
};
