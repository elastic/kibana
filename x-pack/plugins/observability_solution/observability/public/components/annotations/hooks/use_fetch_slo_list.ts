/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { FindSLOResponse } from '@kbn/slo-schema';
import { useQuery } from '@tanstack/react-query';
import { useKibana } from '../../../utils/kibana_react';

export interface SLOListParams {
  kqlQuery?: string;
  page?: number;
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
  perPage?: number;
  lastRefresh?: number;
  disabled?: boolean;
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
  perPage = 25,
  lastRefresh,
  disabled = false,
}: SLOListParams = {}): UseFetchSloListResponse {
  const {
    http,
    notifications: { toasts },
  } = useKibana().services;

  const { isInitialLoading, isLoading, isError, isSuccess, isRefetching, data } = useQuery({
    queryKey: ['slo', { kqlQuery, page, sortBy, sortDirection, perPage, lastRefresh }],
    queryFn: async ({ signal }) => {
      return await http.get<FindSLOResponse>(`/api/observability/slos`, {
        query: {
          ...(sortBy && { sortBy }),
          ...(sortDirection && { sortDirection }),
          ...(page !== undefined && { page }),
          ...(perPage !== undefined && { perPage }),
          hideStale: true,
        },
        signal,
      });
    },
    enabled: !disabled,
    cacheTime: 0,
    refetchOnWindowFocus: false,
    onError: (error: Error) => {
      toasts.addError(error, {
        title: i18n.translate('xpack.observability.list.errorNotification', {
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
