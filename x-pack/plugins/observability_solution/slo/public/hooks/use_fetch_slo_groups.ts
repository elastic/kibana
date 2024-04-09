/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useQuery } from '@tanstack/react-query';
import { i18n } from '@kbn/i18n';
import { buildQueryFromFilters, Filter } from '@kbn/es-query';
import { useMemo } from 'react';
import { FindSLOGroupsResponse } from '@kbn/slo-schema';
import { useKibana } from '../utils/kibana_react';
import { useCreateDataView } from './use_create_data_view';
import { sloKeys } from './query_key_factory';
import { DEFAULT_SLO_GROUPS_PAGE_SIZE } from '../../common/constants';
import { SearchState } from '../pages/slos/hooks/use_url_search_state';
import { SLO_SUMMARY_DESTINATION_INDEX_NAME } from '../../common/constants';

interface SLOGroupsParams {
  page?: number;
  perPage?: number;
  groupBy?: string;
  kqlQuery?: string;
  tagsFilter?: SearchState['tagsFilter'];
  statusFilter?: SearchState['statusFilter'];
  filters?: Filter[];
  lastRefresh?: number;
}

interface UseFetchSloGroupsResponse {
  isLoading: boolean;
  isRefetching: boolean;
  isSuccess: boolean;
  isError: boolean;
  data: FindSLOGroupsResponse | undefined;
  refetch: void;
}

export function useFetchSloGroups({
  page = 1,
  perPage = DEFAULT_SLO_GROUPS_PAGE_SIZE,
  groupBy = 'ungrouped',
  kqlQuery = '',
  tagsFilter,
  statusFilter,
  filters: filterDSL = [],
  lastRefresh,
}: SLOGroupsParams = {}): UseFetchSloGroupsResponse {
  const {
    http,
    notifications: { toasts },
  } = useKibana().services;

  const { dataView } = useCreateDataView({
    indexPatternString: SLO_SUMMARY_DESTINATION_INDEX_NAME,
  });

  const filters = useMemo(() => {
    try {
      return JSON.stringify(
        buildQueryFromFilters(
          [
            ...filterDSL,
            ...(tagsFilter ? [tagsFilter] : []),
            ...(statusFilter ? [statusFilter] : []),
          ],
          dataView,
          {
            ignoreFilterIfFieldNotInIndex: true,
          }
        )
      );
    } catch (e) {
      return '';
    }
  }, [filterDSL, tagsFilter, statusFilter, dataView]);

  const { data, isLoading, isSuccess, isError, isRefetching, refetch } = useQuery({
    queryKey: sloKeys.group({ page, perPage, groupBy, kqlQuery, filters, lastRefresh }),
    queryFn: async ({ signal }) => {
      const response = await http.get<FindSLOGroupsResponse>(
        '/internal/api/observability/slos/_groups',
        {
          query: {
            ...(page && { page }),
            ...(perPage && { perPage }),
            ...(groupBy && { groupBy }),
            ...(kqlQuery && { kqlQuery }),
            ...(filters && { filters }),
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
        title: i18n.translate('xpack.slo.groups.list.errorNotification', {
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
