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
  name?: string;
  page?: number;
  sortBy?: string;
  indicatorTypes?: string[];
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
  name = '',
  page = 1,
  sortBy = 'creationTime',
  indicatorTypes = [],
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
      queryKey: sloKeys.list({ name, page, sortBy, indicatorTypes }),
      queryFn: async ({ signal }) => {
        try {
          const response = await http.get<FindSLOResponse>(`/api/observability/slos`, {
            query: {
              ...(page && { page }),
              ...(name && { name }),
              ...(sortBy && { sortBy }),
              ...(indicatorTypes &&
                indicatorTypes.length > 0 && {
                  indicatorTypes: indicatorTypes.join(','),
                }),
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
        if (!shouldRefetch) {
          return;
        }

        if (results.find((slo) => slo.summary.status === 'NO_DATA' || !slo.summary)) {
          setStateRefetchInterval(SHORT_REFETCH_INTERVAL);
        } else {
          setStateRefetchInterval(LONG_REFETCH_INTERVAL);
        }

        queryClient.invalidateQueries(sloKeys.historicalSummaries());
        queryClient.invalidateQueries(sloKeys.activeAlerts());
        queryClient.invalidateQueries(sloKeys.rules());
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
