/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { ExceptionListItemSchema } from '@kbn/securitysolution-io-ts-list-types';
import { useQueryClient, useMutation } from 'react-query';
import { ServerApiError } from '../../../common/types';
import { ExceptionsListApiClient } from '../../services/exceptions_list/exceptions_list_api_client';

export type CallbackTypes = {
  onSuccess?: (updatedException: ExceptionListItemSchema) => void;
  onError?: (error?: ServerApiError) => void;
  onSettled?: () => void;
};

export function useDeleteArtifact(
  exceptionListApiClient: ExceptionsListApiClient,
  callbacks: CallbackTypes = {}
) {
  const queryClient = useQueryClient();
  const { onSuccess = () => {}, onError = () => {}, onSettled = () => {} } = callbacks;

  return useMutation<ExceptionListItemSchema, ServerApiError, string, () => void>(
    (id: string) => {
      return exceptionListApiClient.delete(id);
    },
    {
      onSuccess,
      onError,
      onSettled: () => {
        queryClient.invalidateQueries(['list', exceptionListApiClient]);
        onSettled();
      },
    }
  );
}
