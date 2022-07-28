/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import pMap from 'p-map';
import type { IHttpFetchError } from '@kbn/core-http-browser';
import type {
  UpdateExceptionListItemSchema,
  ExceptionListItemSchema,
} from '@kbn/securitysolution-io-ts-list-types';
import type { UseMutationOptions, UseMutationResult } from '@tanstack/react-query';
import { useMutation } from '@tanstack/react-query';
import type { ExceptionsListApiClient } from '../../services/exceptions_list/exceptions_list_api_client';

const DEFAULT_OPTIONS = Object.freeze({});

export function useBulkUpdateArtifact(
  exceptionListApiClient: ExceptionsListApiClient,
  customOptions: UseMutationOptions<
    ExceptionListItemSchema[],
    IHttpFetchError,
    UpdateExceptionListItemSchema[],
    () => void
  > = DEFAULT_OPTIONS,
  options: {
    concurrency: number;
  } = {
    concurrency: 5,
  }
): UseMutationResult<
  ExceptionListItemSchema[],
  IHttpFetchError,
  UpdateExceptionListItemSchema[],
  () => void
> {
  return useMutation<
    ExceptionListItemSchema[],
    IHttpFetchError,
    UpdateExceptionListItemSchema[],
    () => void
  >((exceptions: UpdateExceptionListItemSchema[]) => {
    return pMap(
      exceptions,
      (exception) => {
        return exceptionListApiClient.update(exception);
      },
      options
    );
  }, customOptions);
}
