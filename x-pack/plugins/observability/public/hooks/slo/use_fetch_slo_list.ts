/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { FindSLOResponse } from '@kbn/slo-schema';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { DEFAULT_SLO_PAGE_SIZE } from '../../../common/slo/constants';
import { SLO_LONG_REFETCH_INTERVAL, SLO_SHORT_REFETCH_INTERVAL } from '../../constants';

import { useKibana } from '../../utils/kibana_react';
import { sloKeys } from './query_key_factory';

interface SLOListParams {
  kqlQuery?: string;
  page?: number;
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
  shouldRefetch?: boolean;
  perPage?: number;
}

export interface UseFetchSloListResponse {
  isInitialLoading: boolean;
  isLoading: boolean;
  isRefetching: boolean;
  isSuccess: boolean;
  isError: boolean;
  data: FindSLOResponse | undefined;
}

export function useFetchSloList({
  kqlQuery = '',
  page = 1,
  sortBy = 'status',
  sortDirection = 'desc',
  shouldRefetch,
  perPage = DEFAULT_SLO_PAGE_SIZE,
}: SLOListParams = {}): UseFetchSloListResponse {
  const {
    http,
    notifications: { toasts },
  } = useKibana().services;
  const queryClient = useQueryClient();
  const [stateRefetchInterval, setStateRefetchInterval] = useState<number>(
    SLO_SHORT_REFETCH_INTERVAL
  );

  const { isInitialLoading, isLoading, isError, isSuccess, isRefetching, data } = useQuery({
    queryKey: sloKeys.list({ kqlQuery, page, perPage, sortBy, sortDirection }),
    queryFn: async ({ signal }) => {
      const response = await http.get<FindSLOResponse>(`/api/observability/slos`, {
        query: {
          ...(kqlQuery && { kqlQuery }),
          ...(sortBy && { sortBy }),
          ...(sortDirection && { sortDirection }),
          ...(page && { page }),
          ...(perPage && { perPage }),
        },
        signal,
      });

      return response;
    },
    cacheTime: 0,
    refetchOnWindowFocus: false,
    refetchInterval: shouldRefetch ? stateRefetchInterval : undefined,
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
        setStateRefetchInterval(SLO_SHORT_REFETCH_INTERVAL);
      } else {
        setStateRefetchInterval(SLO_LONG_REFETCH_INTERVAL);
      }
    },
    onError: (error: Error) => {
      toasts.addError(error, {
        title: i18n.translate('xpack.observability.slo.list.errorNotification', {
          defaultMessage: 'Something went wrong while fetching SLOs',
        }),
      });
    },
  });

  return {
    data,
    isInitialLoading,
    isLoading,
    isRefetching,
    isSuccess,
    isError,
  };
}
