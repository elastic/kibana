/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type {
  UpdateExceptionListItemSchema,
  ExceptionListItemSchema,
} from '@kbn/securitysolution-io-ts-list-types';
import type { HttpFetchError } from '@kbn/core/public';
import type { UseMutationOptions, UseMutationResult } from 'react-query';
import { useMutation } from 'react-query';
import type { ExceptionsListApiClient } from '../../services/exceptions_list/exceptions_list_api_client';

const DEFAULT_OPTIONS = Object.freeze({});

export function useUpdateArtifact(
  exceptionListApiClient: ExceptionsListApiClient,
  customQueryOptions: UseMutationOptions<
    ExceptionListItemSchema,
    HttpFetchError,
    UpdateExceptionListItemSchema,
    () => void
  > = DEFAULT_OPTIONS
): UseMutationResult<
  ExceptionListItemSchema,
  HttpFetchError,
  UpdateExceptionListItemSchema,
  () => void
> {
  return useMutation<
    ExceptionListItemSchema,
    HttpFetchError,
    UpdateExceptionListItemSchema,
    () => void
  >((exception: UpdateExceptionListItemSchema) => {
    return exceptionListApiClient.update(exception);
  }, customQueryOptions);
}
