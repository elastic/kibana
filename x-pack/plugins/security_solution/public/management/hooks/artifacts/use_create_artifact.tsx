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
import { useQueryClient, useMutation } from 'react-query';
import { ServerApiError } from '../../../common/types';
import { ExceptionsListApiClient } from '../../services/exceptions_list/exceptions_list_api_client';

export function useCreateArtifact(
  exceptionListApiClient: ExceptionsListApiClient,
  callbacks: {
    onCreateSuccess?: (createdException: ExceptionListItemSchema) => void;
    onCreateError?: (error?: ServerApiError) => void;
    onSettledCallback?: () => void;
  } = {}
) {
  const queryClient = useQueryClient();
  const {
    onCreateSuccess = () => {},
    onCreateError = () => {},
    onSettledCallback = () => {},
  } = callbacks;

  return useMutation<
    ExceptionListItemSchema,
    ServerApiError,
    CreateExceptionListItemSchema,
    () => void
  >(
    (exception: CreateExceptionListItemSchema) => {
      return exceptionListApiClient.create(exception);
    },
    {
      onSuccess: onCreateSuccess,
      onError: onCreateError,
      onSettled: () => {
        queryClient.invalidateQueries(['list', exceptionListApiClient]);
        onSettledCallback();
      },
    }
  );
}
