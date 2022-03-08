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
import { HttpFetchError } from 'kibana/public';
import { ExceptionsListApiClient } from '../../../services/exceptions_list/exceptions_list_api_client';

// FIXME: delete entire file once PR# 125198 is merged. This entire file was copied from that pr

export interface CallbackTypes {
  onSuccess?: (updatedException: ExceptionListItemSchema) => void;
  onError?: (error?: HttpFetchError) => void;
  onSettled?: () => void;
}

export function useUpdateArtifact(
  exceptionListApiClient: ExceptionsListApiClient,
  callbacks: CallbackTypes = {}
) {
  const queryClient = useQueryClient();
  const { onSuccess = () => {}, onError = () => {}, onSettled = () => {} } = callbacks;

  return useMutation<
    ExceptionListItemSchema,
    HttpFetchError,
    UpdateExceptionListItemSchema,
    () => void
  >(
    async (exception: UpdateExceptionListItemSchema) => {
      return exceptionListApiClient.update(exception);
    },
    {
      onSuccess,
      onError,
      onSettled: () => {
        queryClient.invalidateQueries(['list', exceptionListApiClient]);
        queryClient.invalidateQueries(['get', exceptionListApiClient]);
        onSettled();
      },
    }
  );
}
