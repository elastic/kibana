/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@tanstack/react-query';
import { GetInvestigationResponse } from '@kbn/investigation-shared';
import { investigationKeys } from './query_key_factory';
import { useKibana } from './use_kibana';

export interface FetchInvestigationParams {
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
}: FetchInvestigationParams): UseFetchInvestigationResponse {
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
    refetchOnWindowFocus: false,
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
