/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { useQuery } from '@tanstack/react-query';
import { investigationKeys } from './query_key_factory';
import { useKibana } from './use_kibana';

export interface Response {
  isInitialLoading: boolean;
  isLoading: boolean;
  isRefetching: boolean;
  isSuccess: boolean;
  isError: boolean;
  data: string[] | undefined;
}

export function useFetchAllInvestigationTags(): Response {
  const {
    core: {
      http,
      notifications: { toasts },
    },
  } = useKibana();

  const { isInitialLoading, isLoading, isError, isSuccess, isRefetching, data } = useQuery({
    queryKey: investigationKeys.tags(),
    queryFn: async ({ signal }) => {
      return await http.get<string[]>(`/api/observability/investigations/_tags`, {
        version: '2023-10-31',
        signal,
      });
    },
    cacheTime: 600 * 1000, // 10_minutes
    staleTime: 0,
    refetchOnWindowFocus: false,
    retry: false,
    onError: (error: Error) => {
      toasts.addError(error, {
        title: i18n.translate('xpack.investigateApp.useFetchAllInvestigationTags.errorTitle', {
          defaultMessage: 'Something went wrong while fetching the investigation tags',
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
