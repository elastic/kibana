/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useMemo } from 'react';
import pMap from 'p-map';
import {
  ExceptionListItemSchema,
  FoundExceptionListItemSchema,
} from '@kbn/securitysolution-io-ts-list-types';
import { QueryObserverResult, useMutation, useQuery, useQueryClient } from 'react-query';
import { ServerApiError } from '../../../../../common/types';
import { useHttp } from '../../../../../common/lib/kibana';
import { EventFiltersHttpService } from '../../../event_filters/service';
import { parseQueryFilterToKQL, parsePoliciesAndFilterToKql } from '../../../../common/utils';
import { SEARCHABLE_FIELDS } from '../../../event_filters/constants';

export function useGetEventFiltersService() {
  const http = useHttp();
  return useMemo(() => new EventFiltersHttpService(http), [http]);
}

export function useGetAllAssignedEventFilters(
  policyId: string,
  enabled: boolean = true,
  customQueryId: string = ''
): QueryObserverResult<FoundExceptionListItemSchema, ServerApiError> {
  const service = useGetEventFiltersService();
  return useQuery<FoundExceptionListItemSchema, ServerApiError>(
    ['eventFilters', 'assigned', policyId, customQueryId],
    () => {
      return service.getList({
        filter: parsePoliciesAndFilterToKql({ policies: [...(policyId ? [policyId] : []), 'all'] }),
      });
    },
    {
      refetchIntervalInBackground: false,
      refetchOnWindowFocus: false,
      enabled,
    }
  );
}

export function useSearchAssignedEventFilters(
  policyId: string,
  options: { filter?: string; page?: number; perPage?: number }
): QueryObserverResult<FoundExceptionListItemSchema, ServerApiError> {
  const service = useGetEventFiltersService();
  const { filter, page, perPage } = options;

  return useQuery<FoundExceptionListItemSchema, ServerApiError>(
    ['eventFilters', 'assigned', 'search', policyId, options],
    () => {
      return service.getList({
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
      refetchOnMount: true,
      keepPreviousData: true,
    }
  );
}

export function useSearchNotAssignedEventFilters(
  eventFiltersService: EventFiltersHttpService,
  policyId: string,
  options: { filter?: string }
): QueryObserverResult<FoundExceptionListItemSchema, ServerApiError> {
  return useQuery<FoundExceptionListItemSchema, ServerApiError>(
    ['eventFilters', 'notAssigned', policyId, options],
    () => {
      const { filter } = options;

      return eventFiltersService.getList({
        filter: parsePoliciesAndFilterToKql({
          excludedPolicies: [policyId, 'all'],
          kuery: parseQueryFilterToKQL(filter || '', SEARCHABLE_FIELDS),
        }),
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

export function useBulkUpdateEventFilters(
  callbacks: {
    onUpdateSuccess?: (updatedExceptions: ExceptionListItemSchema[]) => void;
    onUpdateError?: () => void;
    onSettledCallback?: () => void;
  } = {}
) {
  const http = useHttp();
  const eventFiltersService = new EventFiltersHttpService(http);
  const queryClient = useQueryClient();

  const {
    onUpdateSuccess = () => {},
    onUpdateError = () => {},
    onSettledCallback = () => {},
  } = callbacks;

  return useMutation(
    (eventFilters: ExceptionListItemSchema[]) => {
      return pMap(
        eventFilters,
        (eventFilter) => {
          return eventFiltersService.updateOne(eventFilter);
        },
        {
          concurrency: 5,
        }
      );
    },
    {
      onSuccess: onUpdateSuccess,
      onError: onUpdateError,
      onSettled: () => {
        queryClient.invalidateQueries(['notAssigned']);
        queryClient.invalidateQueries(['assigned']);
        queryClient.invalidateQueries(['eventFilters', 'all']);
        onSettledCallback();
      },
    }
  );
}

export function useGetAllEventFilters(): QueryObserverResult<
  FoundExceptionListItemSchema,
  ServerApiError
> {
  const service = useGetEventFiltersService();
  return useQuery<FoundExceptionListItemSchema, ServerApiError>(
    ['eventFilters', 'all'],
    () => {
      return service.getList();
    },
    {
      refetchIntervalInBackground: false,
      refetchOnWindowFocus: false,
      refetchOnMount: true,
    }
  );
}
