/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IHttpFetchError } from '@kbn/core-http-browser';
import type { UseMutationOptions, UseMutationResult } from '@tanstack/react-query';
import { useMutation } from '@tanstack/react-query';
import type { ResponseActionGetFileRequestBody } from '../../../../common/api/endpoint';
import { GET_FILE_ROUTE } from '../../../../common/endpoint/constants';
import type { ResponseActionApiResponse } from '../../../../common/endpoint/types';
import { KibanaServices } from '../../../common/lib/kibana';

export const useSendGetFileRequest = (
  customOptions?: UseMutationOptions<
    ResponseActionApiResponse,
    IHttpFetchError,
    ResponseActionGetFileRequestBody
  >
): UseMutationResult<
  ResponseActionApiResponse,
  IHttpFetchError,
  ResponseActionGetFileRequestBody
> => {
  return useMutation<ResponseActionApiResponse, IHttpFetchError, ResponseActionGetFileRequestBody>(
    (reqBody) => {
      return KibanaServices.get().http.post<ResponseActionApiResponse>(GET_FILE_ROUTE, {
        body: JSON.stringify(reqBody),
        version: '2023-10-31',
      });
    },
    customOptions
  );
};
