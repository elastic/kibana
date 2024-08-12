/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@tanstack/react-query';
// import { investigationKeys } from './query_key_factory';
import { BASE_RAC_ALERTS_API_PATH, EcsFieldsResponse } from '@kbn/rule-registry-plugin/common';
import { useKibana } from './use_kibana';

export interface AlertParams {
  id: string;
}

export interface UseFetchAlertResponse {
  isInitialLoading: boolean;
  isLoading: boolean;
  isRefetching: boolean;
  isSuccess: boolean;
  isError: boolean;
  data: EcsFieldsResponse | undefined;
}

export function useFetchAlert({ id }: AlertParams): UseFetchAlertResponse {
  const {
    core: {
      http,
      notifications: { toasts },
    },
  } = useKibana();

  const { isInitialLoading, isLoading, isError, isSuccess, isRefetching, data } = useQuery({
    queryKey: ['fetchAlert', id],
    queryFn: async ({ signal }) => {
      if (id === '') return {};
      return await http.get<EcsFieldsResponse>(BASE_RAC_ALERTS_API_PATH, {
        query: {
          id,
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
        title: 'Something went wrong while fetching alert',
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
