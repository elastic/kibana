/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@tanstack/react-query';
import { GetInvestigationResponse } from '../../common/schema/get';
import { investigationKeys } from './query_key_factory';
import { useKibana } from './use_kibana';

export interface InvestigationListParams {
  id: string;
}

export interface UseFetchInvestigationResponse {
  isInitialLoading: boolean;
  isLoading: boolean;
  isRefetching: boolean;
  isSuccess: boolean;
  isError: boolean;
  data: GetInvestigationResponse | undefined;
}

export function useFetchInvestigation({
  id,
}: InvestigationListParams): UseFetchInvestigationResponse {
  const {
    core: {
      http,
      notifications: { toasts },
    },
  } = useKibana();

  const { isInitialLoading, isLoading, isError, isSuccess, isRefetching, data } = useQuery({
    queryKey: investigationKeys.fetch({ id }),
    queryFn: async ({ signal }) => {
      return await http.get<GetInvestigationResponse>(`/api/observability/investigations/${id}`, {
        version: '2023-10-31',
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
        title: 'Something went wrong while fetching Investigation',
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
