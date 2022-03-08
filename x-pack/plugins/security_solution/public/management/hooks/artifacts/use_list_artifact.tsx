/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { FoundExceptionListItemSchema } from '@kbn/securitysolution-io-ts-list-types';
import { HttpFetchError } from 'kibana/public';
import { QueryObserverResult, useQuery, UseQueryOptions } from 'react-query';
import { useMemo } from 'react';
import { MANAGEMENT_DEFAULT_PAGE, MANAGEMENT_DEFAULT_PAGE_SIZE } from '../../common/constants';
import { parsePoliciesAndFilterToKql, parseQueryFilterToKQL } from '../../common/utils';
import { ExceptionsListApiClient } from '../../services/exceptions_list/exceptions_list_api_client';
import { DEFAULT_EXCEPTION_LIST_ITEM_SEARCHABLE_FIELDS } from '../../../../common/endpoint/service/artifacts/constants';
import { MaybeImmutable } from '../../../../common/endpoint/types';

export function useListArtifact(
  exceptionListApiClient: ExceptionsListApiClient,
  options: Partial<{
    filter: string;
    page: number;
    perPage: number;
    policies: string[];
  }> = {},
  searchableFields: MaybeImmutable<string[]> = DEFAULT_EXCEPTION_LIST_ITEM_SEARCHABLE_FIELDS,
  customQueryOptions: UseQueryOptions<FoundExceptionListItemSchema, HttpFetchError> = {}
): QueryObserverResult<FoundExceptionListItemSchema, HttpFetchError> {
  const {
    filter = '',
    page = MANAGEMENT_DEFAULT_PAGE + 1,
    perPage = MANAGEMENT_DEFAULT_PAGE_SIZE,
    policies,
  } = options;
  const filterKuery = useMemo<string | undefined>(() => {
    return parsePoliciesAndFilterToKql({
      kuery: parseQueryFilterToKQL(filter, searchableFields),
      policies: policies ?? [],
    });
  }, [filter, searchableFields, policies]);

  return useQuery<FoundExceptionListItemSchema, HttpFetchError>(
    ['list', exceptionListApiClient, filterKuery, page, perPage],
    () => {
      return exceptionListApiClient.find({
        filter: filterKuery,
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
