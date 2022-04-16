/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  CreateExceptionListItemSchema,
  ExceptionListItemSchema,
} from '@kbn/securitysolution-io-ts-list-types';
import { HttpFetchError } from '@kbn/core/public';
import { useMutation, UseMutationResult, UseQueryOptions } from 'react-query';
import { ExceptionsListApiClient } from '../../services/exceptions_list/exceptions_list_api_client';

const DEFAULT_OPTIONS = Object.freeze({});

export function useCreateArtifact(
  exceptionListApiClient: ExceptionsListApiClient,
  customOptions: UseQueryOptions<ExceptionListItemSchema, HttpFetchError> = DEFAULT_OPTIONS
): UseMutationResult<
  ExceptionListItemSchema,
  HttpFetchError,
  CreateExceptionListItemSchema,
  () => void
> {
  return useMutation<
    ExceptionListItemSchema,
    HttpFetchError,
    CreateExceptionListItemSchema,
    () => void
  >((exception: CreateExceptionListItemSchema) => {
    return exceptionListApiClient.create(exception);
  }, customOptions);
}
