/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { ExceptionListItemSchema } from '@kbn/securitysolution-io-ts-list-types';
import { HttpFetchError } from 'kibana/public';
import { useMutation, UseMutationResult, UseQueryOptions } from 'react-query';
import { ExceptionsListApiClient } from '../../services/exceptions_list/exceptions_list_api_client';

export function useDeleteArtifact(
  exceptionListApiClient: ExceptionsListApiClient,
  customOptions: UseQueryOptions<ExceptionListItemSchema, HttpFetchError>
): UseMutationResult<ExceptionListItemSchema, HttpFetchError, string, () => void> {
  return useMutation<ExceptionListItemSchema, HttpFetchError, string, () => void>((id: string) => {
    return exceptionListApiClient.delete(id);
  }, customOptions);
}
