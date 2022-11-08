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
  KillOrSuspendProcessRequestBody,
  ResponseActionApiResponse,
} from '../../../../common/endpoint/types';
import { killProcess } from '../../../common/lib/process_actions';

/**
 * Create kill process requests
 * @param customOptions
 */
export const useSendKillProcessRequest = (
  customOptions?: UseMutationOptions<
    ResponseActionApiResponse,
    IHttpFetchError,
    KillOrSuspendProcessRequestBody
  >
): UseMutationResult<
  ResponseActionApiResponse,
  IHttpFetchError,
  KillOrSuspendProcessRequestBody
> => {
  return useMutation<ResponseActionApiResponse, IHttpFetchError, KillOrSuspendProcessRequestBody>(
    (processData: KillOrSuspendProcessRequestBody) => {
      return killProcess(processData);
    },
    customOptions
  );
};
