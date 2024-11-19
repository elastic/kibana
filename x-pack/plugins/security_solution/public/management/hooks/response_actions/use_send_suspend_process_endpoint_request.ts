/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation } from '@tanstack/react-query';
import type { UseMutationOptions, UseMutationResult } from '@tanstack/react-query';
import type { IHttpFetchError } from '@kbn/core-http-browser';
import type { SuspendProcessRequestBody } from '../../../../common/api/endpoint';
import type { ResponseActionApiResponse } from '../../../../common/endpoint/types';
import { suspendProcess } from '../../../common/lib/process_actions';

/**
 * Create kill process requests
 * @param customOptions
 */
export const useSendSuspendProcessRequest = (
  customOptions?: UseMutationOptions<
    ResponseActionApiResponse,
    IHttpFetchError,
    SuspendProcessRequestBody
  >
): UseMutationResult<ResponseActionApiResponse, IHttpFetchError, SuspendProcessRequestBody> => {
  return useMutation<ResponseActionApiResponse, IHttpFetchError, SuspendProcessRequestBody>(
    (processData: SuspendProcessRequestBody) => {
      return suspendProcess(processData);
    },
    customOptions
  );
};
