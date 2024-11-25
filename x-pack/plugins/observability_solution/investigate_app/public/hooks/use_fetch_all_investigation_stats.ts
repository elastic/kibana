/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { GetAllInvestigationStatsResponse, Status } from '@kbn/investigation-shared';
import { useQuery } from '@tanstack/react-query';
import { investigationKeys } from './query_key_factory';
import { useKibana } from './use_kibana';

export interface Response {
  isInitialLoading: boolean;
  isLoading: boolean;
  isRefetching: boolean;
  isSuccess: boolean;
  isError: boolean;
  data: { count: Record<Status, number>; total: number } | undefined;
}

export function useFetchAllInvestigationStats(): Response {
  const {
    core: {
      http,
      notifications: { toasts },
    },
  } = useKibana();

  const { isInitialLoading, isLoading, isError, isSuccess, isRefetching, data } = useQuery({
    queryKey: investigationKeys.stats(),
    queryFn: async ({ signal }) => {
      const response = await http.get<GetAllInvestigationStatsResponse>(
        `/api/observability/investigations/_stats`,
        {
          version: '2023-10-31',
          signal,
        }
      );

      return {
        count: {
          triage: response.count.triage ?? 0,
          active: response.count.active ?? 0,
          mitigated: response.count.mitigated ?? 0,
          resolved: response.count.resolved ?? 0,
          cancelled: response.count.cancelled ?? 0,
        },
        total: response.total ?? 0,
      };
    },
    retry: false,
    cacheTime: 600 * 1000, // 10 minutes
    staleTime: 0,
    onError: (error: Error) => {
      toasts.addError(error, {
        title: i18n.translate('xpack.investigateApp.useFetchAllInvestigationStats.errorTitle', {
          defaultMessage: 'Something went wrong while fetching the investigation stats',
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
