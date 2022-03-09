/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import pMap from 'p-map';
import {
  ExceptionListItemSchema,
  FoundExceptionListItemSchema,
} from '@kbn/securitysolution-io-ts-list-types';
import { QueryObserverResult, useMutation, useQuery, useQueryClient } from 'react-query';
import { ServerApiError } from '../../../../../common/types';
import { useHttp } from '../../../../../common/lib/kibana';
import { getList, updateOne } from '../../../event_filters/service/service_actions';
import { parseQueryFilterToKQL, parsePoliciesAndFilterToKql } from '../../../../common/utils';
import { SEARCHABLE_FIELDS } from '../../../event_filters/constants';

export function useGetAllAssignedEventFilters(
  policyId: string,
  enabled: boolean = true
): QueryObserverResult<FoundExceptionListItemSchema, ServerApiError> {
  const http = useHttp();
  return useQuery<FoundExceptionListItemSchema, ServerApiError>(
    ['eventFilters', 'assigned', policyId],
    () => {
      return getList({
        http,
        filter: parsePoliciesAndFilterToKql({ policies: [...(policyId ? [policyId] : []), 'all'] }),
      });
    },
    {
      refetchIntervalInBackground: false,
      refetchOnWindowFocus: false,
      refetchOnMount: true,
      enabled,
      keepPreviousData: true,
    }
  );
}

export function useSearchAssignedEventFilters(
  policyId: string,
  options: { filter?: string; page?: number; perPage?: number }
): QueryObserverResult<FoundExceptionListItemSchema, ServerApiError> {
  const http = useHttp();
  const { filter, page, perPage } = options;

  return useQuery<FoundExceptionListItemSchema, ServerApiError>(
    ['eventFilters', 'assigned', 'search', policyId, options],
    () => {
      return getList({
        http,
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
  policyId: string,
  options: { filter?: string; perPage?: number; enabled?: boolean }
): QueryObserverResult<FoundExceptionListItemSchema, ServerApiError> {
  const http = useHttp();
  return useQuery<FoundExceptionListItemSchema, ServerApiError>(
    ['eventFilters', 'notAssigned', policyId, options],
    () => {
      const { filter, perPage } = options;

      return getList({
        http,
        filter: parsePoliciesAndFilterToKql({
          excludedPolicies: [policyId, 'all'],
          kuery: parseQueryFilterToKQL(filter || '', SEARCHABLE_FIELDS),
        }),
        perPage,
      });
    },
    {
      refetchIntervalInBackground: false,
      refetchOnWindowFocus: false,
      refetchOnMount: true,
      keepPreviousData: true,
      enabled: options.enabled ?? true,
    }
  );
}

export function useBulkUpdateEventFilters(
  callbacks: {
    onUpdateSuccess?: (updatedExceptions: ExceptionListItemSchema[]) => void;
    onUpdateError?: (error?: ServerApiError) => void;
    onSettledCallback?: () => void;
  } = {}
) {
  const http = useHttp();
  const queryClient = useQueryClient();

  const {
    onUpdateSuccess = () => {},
    onUpdateError = () => {},
    onSettledCallback = () => {},
  } = callbacks;

  return useMutation<
    ExceptionListItemSchema[],
    ServerApiError,
    ExceptionListItemSchema[],
    () => void
  >(
    (eventFilters: ExceptionListItemSchema[]) => {
      return pMap(
        eventFilters,
        (eventFilter) => {
          return updateOne(http, eventFilter);
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
        queryClient.invalidateQueries(['eventFilters', 'notAssigned']);
        queryClient.invalidateQueries(['eventFilters', 'assigned']);
        onSettledCallback();
      },
    }
  );
}

export function useGetAllEventFilters(): QueryObserverResult<
  FoundExceptionListItemSchema,
  ServerApiError
> {
  const http = useHttp();
  return useQuery<FoundExceptionListItemSchema, ServerApiError>(
    ['eventFilters', 'all'],
    () => {
      return getList({ http });
    },
    {
      refetchIntervalInBackground: false,
      refetchOnWindowFocus: false,
      refetchOnMount: true,
      keepPreviousData: true,
    }
  );
}
