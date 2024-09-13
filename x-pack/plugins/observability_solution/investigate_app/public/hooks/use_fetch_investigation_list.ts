/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@tanstack/react-query';
import { FindInvestigationsResponse } from '@kbn/investigation-shared';
import { i18n } from '@kbn/i18n';
import { investigationKeys } from './query_key_factory';
import { useKibana } from './use_kibana';

const DEFAULT_PAGE_SIZE = 25;

export interface InvestigationListParams {
  page?: number;
  perPage?: number;
  search?: string;
  filter?: string;
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
  search,
  filter,
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
      search,
      filter,
    }),
    queryFn: async ({ signal }) => {
      return await http.get<FindInvestigationsResponse>(`/api/observability/investigations`, {
        version: '2023-10-31',
        query: {
          ...(page !== undefined && { page }),
          ...(perPage !== undefined && { perPage }),
          ...(search !== undefined && { search }),
          ...(filter !== undefined && { filter }),
        },
        signal,
      });
    },
    retry: false,
    refetchInterval: 60 * 1000,
    refetchOnWindowFocus: false,
    cacheTime: 600 * 1000, // 10 minutes
    staleTime: 0,
    onError: (error: Error) => {
      toasts.addError(error, {
        title: i18n.translate('xpack.investigateApp.useFetchInvestigationList.errorTitle', {
          defaultMessage: 'Something went wrong while fetching investigations',
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
