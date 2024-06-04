/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IHttpFetchError } from '@kbn/core-http-browser';
import {
  useMutation,
  type UseMutationOptions,
  type UseMutationResult,
} from '@tanstack/react-query';
import type { ResponseActionApiResponse } from '../../../../common/endpoint/types';
import type { ScanActionRequestBody } from '../../../../common/api/endpoint';
import { KibanaServices } from '../../../common/lib/kibana';
import { SCAN_ROUTE } from '../../../../common/endpoint/constants';

/**
 * Create scan request
 * @param customOptions
 */
export const useSendScanRequest = (
  customOptions?: UseMutationOptions<
    ResponseActionApiResponse,
    IHttpFetchError,
    ScanActionRequestBody
  >
): UseMutationResult<ResponseActionApiResponse, IHttpFetchError, ScanActionRequestBody> => {
  return useMutation<ResponseActionApiResponse, IHttpFetchError, ScanActionRequestBody>(
    (reqBody) => {
      return KibanaServices.get().http.post<ResponseActionApiResponse>(SCAN_ROUTE, {
        body: JSON.stringify(reqBody),
        version: '2023-10-31',
      });
    },
    customOptions
  );
};
