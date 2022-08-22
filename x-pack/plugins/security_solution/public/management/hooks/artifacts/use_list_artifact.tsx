/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { FoundExceptionListItemSchema } from '@kbn/securitysolution-io-ts-list-types';
import type { IHttpFetchError } from '@kbn/core-http-browser';
import type { QueryObserverResult, UseQueryOptions } from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import {
  MANAGEMENT_DEFAULT_PAGE,
  MANAGEMENT_DEFAULT_PAGE_SIZE,
  MANAGEMENT_DEFAULT_SORT_FIELD,
  MANAGEMENT_DEFAULT_SORT_ORDER,
} from '../../common/constants';
import { parsePoliciesAndFilterToKql, parseQueryFilterToKQL } from '../../common/utils';
import type { ExceptionsListApiClient } from '../../services/exceptions_list/exceptions_list_api_client';
import { DEFAULT_EXCEPTION_LIST_ITEM_SEARCHABLE_FIELDS } from '../../../../common/endpoint/service/artifacts/constants';
import type { MaybeImmutable } from '../../../../common/endpoint/types';

const DEFAULT_OPTIONS = Object.freeze({});

export function useListArtifact(
  exceptionListApiClient: ExceptionsListApiClient,
  options: Partial<{
    filter: string;
    page: number;
    perPage: number;
    policies: string[];
    excludedPolicies: string[];
  }> = DEFAULT_OPTIONS,
  searchableFields: MaybeImmutable<string[]> = DEFAULT_EXCEPTION_LIST_ITEM_SEARCHABLE_FIELDS,
  customQueryOptions?: Partial<UseQueryOptions<FoundExceptionListItemSchema, IHttpFetchError>>,
  customQueryIds: string[] = []
): QueryObserverResult<FoundExceptionListItemSchema, IHttpFetchError> {
  const {
    filter = '',
    page = MANAGEMENT_DEFAULT_PAGE + 1,
    perPage = MANAGEMENT_DEFAULT_PAGE_SIZE,
    policies = [],
    excludedPolicies = [],
  } = options;
  const filterKuery = useMemo<string | undefined>(() => {
    return parsePoliciesAndFilterToKql({
      kuery: parseQueryFilterToKQL(filter, searchableFields),
      policies,
      excludedPolicies,
    });
  }, [filter, searchableFields, policies, excludedPolicies]);

  return useQuery<FoundExceptionListItemSchema, IHttpFetchError>(
    [...customQueryIds, 'list', exceptionListApiClient, filterKuery, page, perPage],
    async () => {
      const result = await exceptionListApiClient.find({
        filter: filterKuery,
        perPage,
        page,
        sortField: MANAGEMENT_DEFAULT_SORT_FIELD,
        sortOrder: MANAGEMENT_DEFAULT_SORT_ORDER,
      });

      return result;
    },
    customQueryOptions
  );
}
