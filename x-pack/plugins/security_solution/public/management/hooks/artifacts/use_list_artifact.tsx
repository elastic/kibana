/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { FoundExceptionListItemSchema } from '@kbn/securitysolution-io-ts-list-types';
import { HttpFetchError } from 'kibana/public';
import { QueryObserverResult, useQuery, UseQueryOptions } from 'react-query';
import { MANAGEMENT_DEFAULT_PAGE, MANAGEMENT_DEFAULT_PAGE_SIZE } from '../../common/constants';
import { parsePoliciesAndFilterToKql, parseQueryFilterToKQL } from '../../common/utils';
import { ExceptionsListApiClient } from '../../services/exceptions_list/exceptions_list_api_client';

export function useListArtifact(
  exceptionListApiClient: ExceptionsListApiClient,
  searcheableFields: string[],
  options: {
    filter: string;
    page: number;
    perPage: number;
    policies: string[];
  } = {
    filter: '',
    page: MANAGEMENT_DEFAULT_PAGE,
    perPage: MANAGEMENT_DEFAULT_PAGE_SIZE,
    policies: [],
  },
  customQueryOptions: UseQueryOptions<FoundExceptionListItemSchema, HttpFetchError>
): QueryObserverResult<FoundExceptionListItemSchema, HttpFetchError> {
  const { filter, page, perPage, policies } = options;

  return useQuery<FoundExceptionListItemSchema, HttpFetchError>(
    ['list', exceptionListApiClient, options],
    () => {
      return exceptionListApiClient.find({
        filter: parsePoliciesAndFilterToKql({
          policies,
          kuery: parseQueryFilterToKQL(filter, searcheableFields),
        }),
        perPage,
        page,
      });
    },
    {
      refetchIntervalInBackground: false,
      refetchOnWindowFocus: false,
      refetchOnMount: true,
      keepPreviousData: true,
      ...customQueryOptions,
    }
  );
}
