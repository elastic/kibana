/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { useQuery } from '@tanstack/react-query';
import { GetEventsResponse } from '@kbn/investigation-shared';
import { investigationKeys } from './query_key_factory';
import { useKibana } from './use_kibana';

export interface Response {
  isInitialLoading: boolean;
  isLoading: boolean;
  isRefetching: boolean;
  isSuccess: boolean;
  isError: boolean;
  data?: GetEventsResponse;
}

export function useFetchEvents({
  rangeFrom,
  rangeTo,
  filter,
}: {
  rangeFrom?: string;
  rangeTo?: string;
  filter?: string;
}): Response {
  const {
    core: {
      http,
      notifications: { toasts },
    },
  } = useKibana();

  const { isInitialLoading, isLoading, isError, isSuccess, isRefetching, data } = useQuery({
    queryKey: investigationKeys.events(rangeFrom, rangeTo, filter),
    queryFn: async ({ signal }) => {
      return await http.get<GetEventsResponse>(`/api/observability/events`, {
        query: {
          rangeFrom,
          rangeTo,
          filter,
        },
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
        title: i18n.translate('xpack.investigateApp.events.fetch.error', {
          defaultMessage: 'Something went wrong while fetching the events',
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
