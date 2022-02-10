/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import pMap from 'p-map';
import { ExceptionListItemSchema } from '@kbn/securitysolution-io-ts-list-types';
import { useQueryClient, useMutation } from 'react-query';
import { ServerApiError } from '../../../common/types';
import { ExceptionsListApiClient } from '../../services/exceptions_list/exceptions_list_api_client';

export function useBulkDeleteArtifact(
  exceptionListApiClient: ExceptionsListApiClient,
  callbacks: {
    onDeleteBulkSuccess?: (deletedExceptions: ExceptionListItemSchema[]) => void;
    onDeleteBulkError?: (error?: ServerApiError) => void;
    onSettledCallback?: () => void;
  } = {},
  options: {
    concurrency: number;
  } = {
    concurrency: 5,
  }
) {
  const queryClient = useQueryClient();

  const {
    onDeleteBulkSuccess = () => {},
    onDeleteBulkError = () => {},
    onSettledCallback = () => {},
  } = callbacks;

  return useMutation<ExceptionListItemSchema[], ServerApiError, string[], () => void>(
    (exceptionIds: string[]) => {
      return pMap(
        exceptionIds,
        (id) => {
          return exceptionListApiClient.delete(id);
        },
        options
      );
    },
    {
      onSuccess: onDeleteBulkSuccess,
      onError: onDeleteBulkError,
      onSettled: () => {
        queryClient.invalidateQueries(['list', exceptionListApiClient]);
        queryClient.invalidateQueries(['get', exceptionListApiClient]);
        onSettledCallback();
      },
    }
  );
}
