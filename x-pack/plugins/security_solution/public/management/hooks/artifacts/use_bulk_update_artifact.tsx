/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import pMap from 'p-map';
import {
  UpdateExceptionListItemSchema,
  ExceptionListItemSchema,
} from '@kbn/securitysolution-io-ts-list-types';
import { useMutation, UseMutationResult, UseQueryOptions } from 'react-query';
import { ServerApiError } from '../../../common/types';
import { ExceptionsListApiClient } from '../../services/exceptions_list/exceptions_list_api_client';

export function useBulkUpdateArtifact(
  exceptionListApiClient: ExceptionsListApiClient,
  customOptions: UseQueryOptions<ExceptionListItemSchema[], ServerApiError>,
  options: {
    concurrency: number;
  } = {
    concurrency: 5,
  }
): UseMutationResult<
  ExceptionListItemSchema[],
  ServerApiError,
  UpdateExceptionListItemSchema[],
  () => void
> {
  return useMutation<
    ExceptionListItemSchema[],
    ServerApiError,
    UpdateExceptionListItemSchema[],
    () => void
  >((exceptions: UpdateExceptionListItemSchema[]) => {
    return pMap(
      exceptions,
      (exception) => {
        return exceptionListApiClient.update(exception);
      },
      options
    );
  }, customOptions);
}
