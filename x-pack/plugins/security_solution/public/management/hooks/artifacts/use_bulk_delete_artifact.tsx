/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import pMap from 'p-map';
import { HttpFetchError } from 'kibana/public';
import { ExceptionListItemSchema } from '@kbn/securitysolution-io-ts-list-types';
import { useMutation, UseMutationResult, UseQueryOptions } from 'react-query';
import { ExceptionsListApiClient } from '../../services/exceptions_list/exceptions_list_api_client';

export function useBulkDeleteArtifact(
  exceptionListApiClient: ExceptionsListApiClient,
  customOptions: UseQueryOptions<ExceptionListItemSchema[], HttpFetchError>,
  options: {
    concurrency: number;
  } = {
    concurrency: 5,
  }
): UseMutationResult<ExceptionListItemSchema[], HttpFetchError, string[], () => void> {
  return useMutation<ExceptionListItemSchema[], HttpFetchError, string[], () => void>(
    (exceptionIds: string[]) => {
      return pMap(
        exceptionIds,
        (id) => {
          return exceptionListApiClient.delete(id);
        },
        options
      );
    },
    customOptions
  );
}
