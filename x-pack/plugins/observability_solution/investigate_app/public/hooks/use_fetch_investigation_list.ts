/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@tanstack/react-query';
import { FindInvestigationsResponse } from '../../common/schema/find';
import { investigationKeys } from './query_key_factory';
import { useKibana } from './use_kibana';

const DEFAULT_PAGE_SIZE = 25;

export interface InvestigationListParams {
  page?: number;
  perPage?: number;
}

export interface UseFetchInvestigationListResponse {
  isInitialLoading: boolean;
  isLoading: boolean;
  isRefetching: boolean;
  isSuccess: boolean;
  isError: boolean;
  data: FindInvestigationsResponse | undefined;
}

export function useFetchInvestigationList({
  page = 1,
  perPage = DEFAULT_PAGE_SIZE,
}: InvestigationListParams = {}): UseFetchInvestigationListResponse {
  const {
    core: {
      http,
      notifications: { toasts },
    },
  } = useKibana();

  const { isInitialLoading, isLoading, isError, isSuccess, isRefetching, data } = useQuery({
    queryKey: investigationKeys.list({
      page,
      perPage,
    }),
    queryFn: async ({ signal }) => {
      return await http.get<FindInvestigationsResponse>(`/api/observability/investigations`, {
        version: '2023-10-31',
        query: {
          ...(page !== undefined && { page }),
          ...(perPage !== undefined && { perPage }),
        },
        signal,
      });
    },
    cacheTime: 0,
    refetchOnWindowFocus: false,
    retry: (failureCount, error) => {
      if (String(error) === 'Error: Forbidden') {
        return false;
      }

      return failureCount < 3;
    },
    onError: (error: Error) => {
      toasts.addError(error, {
        title: 'Something went wrong while fetching Investigations',
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
