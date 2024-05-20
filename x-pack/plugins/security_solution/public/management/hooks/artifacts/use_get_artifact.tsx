/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { ExceptionListItemSchema } from '@kbn/securitysolution-io-ts-list-types';
import type { IHttpFetchError } from '@kbn/core-http-browser';
import type { QueryObserverResult, UseQueryOptions } from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';
import type { ExceptionsListApiClient } from '../../services/exceptions_list/exceptions_list_api_client';

export function useGetArtifact(
  exceptionListApiClient: ExceptionsListApiClient,
  itemId?: string,
  id?: string,
  customQueryOptions?: UseQueryOptions<ExceptionListItemSchema, IHttpFetchError<Error>>
): QueryObserverResult<ExceptionListItemSchema, IHttpFetchError<Error>> {
  return useQuery<ExceptionListItemSchema, IHttpFetchError<Error>>(
    ['get', exceptionListApiClient, itemId, id],
    () => {
      return exceptionListApiClient.get(itemId, id);
    },
    customQueryOptions
  );
}
