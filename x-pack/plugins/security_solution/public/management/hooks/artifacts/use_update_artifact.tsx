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
import { useQueryClient, useMutation } from 'react-query';
import { ServerApiError } from '../../../common/types';
import { ExceptionsListApiClient } from '../../services/exceptions_list/exceptions_list_api_client';

export function useUpdateArtifact(
  exceptionListApiClient: ExceptionsListApiClient,
  callbacks: {
    onUpdateSuccess?: (updatedException: ExceptionListItemSchema) => void;
    onUpdateError?: (error?: ServerApiError) => void;
    onSettledCallback?: () => void;
  } = {}
) {
  const queryClient = useQueryClient();
  const {
    onUpdateSuccess = () => {},
    onUpdateError = () => {},
    onSettledCallback = () => {},
  } = callbacks;

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
      onSuccess: onUpdateSuccess,
      onError: onUpdateError,
      onSettled: () => {
        queryClient.invalidateQueries(['list', exceptionListApiClient]);
        queryClient.invalidateQueries(['get', exceptionListApiClient]);
        onSettledCallback();
      },
    }
  );
}
