/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { FoundExceptionListItemSchema } from '@kbn/securitysolution-io-ts-list-types';
import { QueryObserverResult, useQuery } from 'react-query';
import { ServerApiError } from '../../../../../common/types';
import { EventFiltersHttpService } from '../../../event_filters/service';
import { parseQueryFilterToKQL, parsePoliciesAndFilterToKql } from '../../../../common/utils';
import { SEARCHABLE_FIELDS } from '../../../event_filters/constants';

export function useGetAllAssignedEventFilters(
  eventFiltersService: EventFiltersHttpService,
  policyId?: string
): QueryObserverResult<FoundExceptionListItemSchema, ServerApiError> {
  return useQuery<FoundExceptionListItemSchema, ServerApiError>(
    ['eventFilters', 'assigned', policyId],
    () => {
      return eventFiltersService.getList({
        filter: parsePoliciesAndFilterToKql({ policies: [...(policyId ? [policyId] : []), 'all'] }),
      });
    },
    {
      refetchIntervalInBackground: false,
      refetchOnWindowFocus: false,
      enabled: !!policyId,
      refetchOnMount: true,
    }
  );
}

export function useSearchAssignedEventFilters(
  eventFiltersService: EventFiltersHttpService,
  policyId: string,
  options: { filter?: string; page?: number; perPage?: number }
): QueryObserverResult<FoundExceptionListItemSchema, ServerApiError> {
  const { filter, page, perPage } = options;

  return useQuery<FoundExceptionListItemSchema, ServerApiError>(
    ['eventFilters', 'assigned', 'search', policyId, options],
    () => {
      return eventFiltersService.getList({
        filter: parsePoliciesAndFilterToKql({
          policies: [policyId, 'all'],
          kuery: parseQueryFilterToKQL(filter || '', SEARCHABLE_FIELDS),
        }),
        perPage,
        page: (page ?? 0) + 1,
      });
    },
    {
      refetchIntervalInBackground: false,
      refetchOnWindowFocus: false,
      cacheTime: 0, // No cache this query as the search results need to be fresh
    }
  );
}

export function useGetAllEventFilters(
  eventFiltersService: EventFiltersHttpService
): QueryObserverResult<FoundExceptionListItemSchema, ServerApiError> {
  return useQuery<FoundExceptionListItemSchema, ServerApiError>(
    ['eventFilters', 'all'],
    () => {
      return eventFiltersService.getList();
    },
    {
      refetchIntervalInBackground: false,
      refetchOnWindowFocus: false,
      refetchOnMount: true,
    }
  );
}
