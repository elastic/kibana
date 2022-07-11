/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UseMutationOptions, UseMutationResult } from 'react-query';
import { useMutation } from 'react-query';
import type { HttpFetchError } from '@kbn/core/public';
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
    HttpFetchError,
    KillOrSuspendProcessRequestBody
  >
): UseMutationResult<
  ResponseActionApiResponse,
  HttpFetchError,
  KillOrSuspendProcessRequestBody
> => {
  return useMutation<ResponseActionApiResponse, HttpFetchError, KillOrSuspendProcessRequestBody>(
    (processData: KillOrSuspendProcessRequestBody) => {
      return killProcess(processData);
    },
    customOptions
  );
};
