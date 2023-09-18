/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useState } from 'react';
import {
  QueryObserverResult,
  RefetchOptions,
  RefetchQueryFilters,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { i18n } from '@kbn/i18n';
import { FindSLOResponse } from '@kbn/slo-schema';

import { useKibana } from '../../utils/kibana_react';
import { sloKeys } from './query_key_factory';

interface SLOListParams {
  kqlQuery?: string;
  page?: number;
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
  shouldRefetch?: boolean;
}

export interface UseFetchSloListResponse {
  isInitialLoading: boolean;
  isLoading: boolean;
  isRefetching: boolean;
  isSuccess: boolean;
  isError: boolean;
  sloList: FindSLOResponse | undefined;
  refetch: <TPageData>(
    options?: (RefetchOptions & RefetchQueryFilters<TPageData>) | undefined
  ) => Promise<QueryObserverResult<FindSLOResponse | undefined, unknown>>;
}

const SHORT_REFETCH_INTERVAL = 1000 * 5; // 5 seconds
const LONG_REFETCH_INTERVAL = 1000 * 60; // 1 minute

export function useFetchSloList({
  kqlQuery = '',
  page = 1,
  sortBy = 'status',
  sortDirection = 'desc',
  shouldRefetch,
}: SLOListParams | undefined = {}): UseFetchSloListResponse {
  const {
    http,
    notifications: { toasts },
  } = useKibana().services;
  const queryClient = useQueryClient();

  const [stateRefetchInterval, setStateRefetchInterval] = useState<number | undefined>(
    SHORT_REFETCH_INTERVAL
  );

  const { isInitialLoading, isLoading, isError, isSuccess, isRefetching, data, refetch } = useQuery(
    {
      queryKey: sloKeys.list({ kqlQuery, page, sortBy, sortDirection }),
      queryFn: async ({ signal }) => {
        try {
          const response = await http.get<FindSLOResponse>(`/api/observability/slos`, {
            query: {
              ...(kqlQuery && { kqlQuery }),
              ...(sortBy && { sortBy }),
              ...(sortDirection && { sortDirection }),
              ...(page && { page }),
            },
            signal,
          });

          return response;
        } catch (error) {
          throw error;
        }
      },
      keepPreviousData: true,
      refetchOnWindowFocus: false,
      refetchInterval: shouldRefetch ? stateRefetchInterval : undefined,
      staleTime: 1000,
      retry: (failureCount, error) => {
        if (String(error) === 'Error: Forbidden') {
          return false;
        }
        return failureCount < 4;
      },
      onSuccess: ({ results }: FindSLOResponse) => {
        queryClient.invalidateQueries({ queryKey: sloKeys.historicalSummaries(), exact: false });
        queryClient.invalidateQueries({ queryKey: sloKeys.activeAlerts(), exact: false });
        queryClient.invalidateQueries({ queryKey: sloKeys.rules(), exact: false });

        if (!shouldRefetch) {
          return;
        }

        if (results.find((slo) => slo.summary.status === 'NO_DATA' || !slo.summary)) {
          setStateRefetchInterval(SHORT_REFETCH_INTERVAL);
        } else {
          setStateRefetchInterval(LONG_REFETCH_INTERVAL);
        }
      },
      onError: (error: Error) => {
        toasts.addError(error, {
          title: i18n.translate('xpack.observability.slo.list.errorNotification', {
            defaultMessage: 'Something went wrong while fetching SLOs',
          }),
        });
      },
    }
  );

  return {
    sloList: data,
    isInitialLoading,
    isLoading,
    isRefetching,
    isSuccess,
    isError,
    refetch,
  };
}
