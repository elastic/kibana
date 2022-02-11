/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  UpdateExceptionListItemSchema,
  ExceptionListItemSchema,
} from '@kbn/securitysolution-io-ts-list-types';
import { useQueryClient, useMutation, UseMutationResult, UseQueryOptions } from 'react-query';
import { ServerApiError } from '../../../common/types';
import { ExceptionsListApiClient } from '../../services/exceptions_list/exceptions_list_api_client';

export function useUpdateArtifact(
  exceptionListApiClient: ExceptionsListApiClient,
  customQueryOptions: UseQueryOptions<ExceptionListItemSchema, ServerApiError>
): UseMutationResult<
  ExceptionListItemSchema,
  ServerApiError,
  UpdateExceptionListItemSchema,
  () => void
> {
  const queryClient = useQueryClient();
  return useMutation<
    ExceptionListItemSchema,
    ServerApiError,
    UpdateExceptionListItemSchema,
    () => void
  >(
    (exception: UpdateExceptionListItemSchema) => {
      return exceptionListApiClient.update(exception);
    },
    {
      onSettled: () => {
        queryClient.invalidateQueries(['list', exceptionListApiClient]);
        queryClient.invalidateQueries(['get', exceptionListApiClient]);
      },
      ...customQueryOptions,
    }
  );
}
