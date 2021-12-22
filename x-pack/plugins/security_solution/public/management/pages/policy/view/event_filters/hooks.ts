/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { FoundExceptionListItemSchema } from '@kbn/securitysolution-io-ts-list-types';
import { QueryObserverResult, useQuery } from 'react-query';
import { ServerApiError } from '../../../../../common/types';
import { useHttp } from '../../../../../common/lib/kibana/hooks';
import { EventFiltersHttpService } from '../../../event_filters/service';
import { parseQueryFilterToKQL } from '../../../../common/utils';
import { SEARCHABLE_FIELDS } from '../../../event_filters/constants';

export function useGetAllAssignedEventFilters(
  policyId?: string
): QueryObserverResult<FoundExceptionListItemSchema, ServerApiError> {
  const http = useHttp();
  const eventFiltersService = new EventFiltersHttpService(http);

  return useQuery<FoundExceptionListItemSchema, ServerApiError>(
    ['eventFilters', 'assigned', policyId],
    () => {
      return eventFiltersService.getList({
        filter: `(exception-list-agnostic.attributes.tags:"policy:${policyId}" OR exception-list-agnostic.attributes.tags:"policy:all")`,
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
  policyId: string,
  options: { filter?: string; page?: number; perPage?: number }
): QueryObserverResult<FoundExceptionListItemSchema, ServerApiError> {
  const http = useHttp();
  const eventFiltersService = new EventFiltersHttpService(http);

  const { filter, page, perPage } = options;

  return useQuery<FoundExceptionListItemSchema, ServerApiError>(
    ['eventFilters', 'assigned', 'search', policyId],
    () => {
      const kuery = [
        `((exception-list-agnostic.attributes.tags:"policy:${policyId}") OR (exception-list-agnostic.attributes.tags:"policy:all"))`,
      ];

      if (filter) {
        const filterKuery = parseQueryFilterToKQL(filter, SEARCHABLE_FIELDS) || undefined;
        if (filterKuery) {
          kuery.push(filterKuery);
        }
      }

      return eventFiltersService.getList({
        filter: kuery.join(' AND '),
      });
    },
    {
      refetchIntervalInBackground: false,
      refetchOnWindowFocus: false,
    }
  );
}

export function useGetAllEventFilters(): QueryObserverResult<
  FoundExceptionListItemSchema,
  ServerApiError
> {
  const http = useHttp();
  const eventFiltersService = new EventFiltersHttpService(http);

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
