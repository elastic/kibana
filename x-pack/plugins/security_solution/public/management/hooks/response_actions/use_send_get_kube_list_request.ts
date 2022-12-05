/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UseMutationOptions, UseMutationResult } from '@tanstack/react-query';
import { useMutation } from '@tanstack/react-query';
import type { IHttpFetchError } from '@kbn/core-http-browser';
import type {
  ProcessesRequestBody,
  ResponseActionApiResponse,
  GetProcessesActionOutputContent,
} from '../../../../common/endpoint/types/actions';
import { GET_KUBE_LIST_ROUTE } from '../../../../common/endpoint/constants';
import { KibanaServices } from '../../../common/lib/kibana';

/**
 * Get running processes
 * @param customOptions
 */
export const useSendGetKubeListRequest = (
  customOptions?: UseMutationOptions<
    ResponseActionApiResponse<GetProcessesActionOutputContent>,
    IHttpFetchError,
    ProcessesRequestBody
  >
): UseMutationResult<
  ResponseActionApiResponse<GetProcessesActionOutputContent>,
  IHttpFetchError,
  ProcessesRequestBody
> => {
  return useMutation<
    ResponseActionApiResponse<GetProcessesActionOutputContent>,
    IHttpFetchError,
    ProcessesRequestBody
  >((data: ProcessesRequestBody) => {
    return KibanaServices.get().http.post<
      ResponseActionApiResponse<GetProcessesActionOutputContent>
    >(GET_KUBE_LIST_ROUTE, {
      body: JSON.stringify(data),
    });
  }, customOptions);
};
