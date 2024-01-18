/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useQuery } from '@tanstack/react-query';
import { i18n } from '@kbn/i18n';
import { FindSLOGroupsResponse } from '@kbn/slo-schema';
import { useKibana } from '../../utils/kibana_react';
import { sloKeys } from './query_key_factory';
import { DEFAULT_SLO_GROUPS_PAGE_SIZE } from '../../../common/slo/constants';

interface SLOGroupsParams {
  page?: number;
  perPage?: number;
}

interface UseFetchSloGroupsResponse {
  isLoading: boolean;
  isRefetching: boolean;
  isSuccess: boolean;
  isError: boolean;
  data: FindSLOGroupsResponse | undefined;
}

export function useFetchSloGroups({
  page = 1,
  perPage = DEFAULT_SLO_GROUPS_PAGE_SIZE,
}: SLOGroupsParams = {}): UseFetchSloGroupsResponse {
  const {
    http,
    notifications: { toasts },
  } = useKibana().services;
  const { data, isLoading, isSuccess, isError, isRefetching } = useQuery({
    queryKey: sloKeys.groups({ page, perPage }),
    queryFn: async ({ signal }) => {
      const response = await http.get<FindSLOGroupsResponse>(
        '/internal/api/observability/slos/_groups',
        {
          query: {
            ...(page && { page }),
            ...(perPage && { perPage }),
          },
          signal,
        }
      );
      return response;
    },
    cacheTime: 0,
    refetchOnWindowFocus: false,
    retry: (failureCount, error) => {
      if (String(error) === 'Error: Forbidden') {
        return false;
      }
      return failureCount < 4;
    },
    onError: (error: Error) => {
      toasts.addError(error, {
        title: i18n.translate('xpack.observability.slo.groups.list.errorNotification', {
          defaultMessage: 'Something went wrong while fetching SLO Groups',
        }),
      });
    },
  });

  return {
    data,
    isLoading,
    isSuccess,
    isError,
    isRefetching,
  };
}
