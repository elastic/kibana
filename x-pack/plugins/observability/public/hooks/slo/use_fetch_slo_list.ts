/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { FindSLOResponse } from '@kbn/slo-schema';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';
import { buildQueryFromFilters, Filter } from '@kbn/es-query';
import { SearchState } from '../../pages/slos/hooks/use_url_search_state';
import { useCreateDataView } from '../use_create_data_view';
import {
  DEFAULT_SLO_PAGE_SIZE,
  SLO_SUMMARY_DESTINATION_INDEX_NAME,
} from '../../../common/slo/constants';

import { useKibana } from '../../utils/kibana_react';
import { sloKeys } from './query_key_factory';

interface SLOListParams {
  kqlQuery?: string;
  page?: number;
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
  perPage?: number;
  filters?: Filter[];
  lastRefresh?: number;
  tags?: SearchState['tags'];
}

export interface UseFetchSloListResponse {
  isInitialLoading: boolean;
  isLoading: boolean;
  isRefetching: boolean;
  isSuccess: boolean;
  isError: boolean;
  data: FindSLOResponse | undefined;
}

export function useFetchSloList({
  kqlQuery = '',
  page = 1,
  sortBy = 'status',
  sortDirection = 'desc',
  perPage = DEFAULT_SLO_PAGE_SIZE,
  filters: filterDSL = [],
  lastRefresh,
  tags,
}: SLOListParams = {}): UseFetchSloListResponse {
  const {
    http,
    notifications: { toasts },
  } = useKibana().services;
  const queryClient = useQueryClient();

  const { dataView } = useCreateDataView({
    indexPatternString: SLO_SUMMARY_DESTINATION_INDEX_NAME,
  });

  const filters = useMemo(() => {
    try {
      return JSON.stringify(
        buildQueryFromFilters(filterDSL, dataView, {
          ignoreFilterIfFieldNotInIndex: true,
        })
      );
    } catch (e) {
      return '';
    }
  }, [filterDSL, dataView]);

  const kqlQueryValue = useMemo(() => {
    return mixKqlWithTags(kqlQuery, tags);
  }, [kqlQuery, tags]);

  const { isInitialLoading, isLoading, isError, isSuccess, isRefetching, data } = useQuery({
    queryKey: sloKeys.list({
      kqlQuery: kqlQueryValue,
      page,
      perPage,
      sortBy,
      sortDirection,
      filters,
      lastRefresh,
    }),
    queryFn: async ({ signal }) => {
      return await http.get<FindSLOResponse>(`/api/observability/slos`, {
        query: {
          ...(kqlQueryValue && { kqlQuery: kqlQueryValue }),
          ...(sortBy && { sortBy }),
          ...(sortDirection && { sortDirection }),
          ...(page && { page }),
          ...(perPage && { perPage }),
          ...(filters && { filters }),
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
      return failureCount < 4;
    },
    onSuccess: ({ results }: FindSLOResponse) => {
      queryClient.invalidateQueries({ queryKey: sloKeys.historicalSummaries(), exact: false });
      queryClient.invalidateQueries({ queryKey: sloKeys.activeAlerts(), exact: false });
      queryClient.invalidateQueries({ queryKey: sloKeys.rules(), exact: false });
    },
    onError: (error: Error) => {
      toasts.addError(error, {
        title: i18n.translate('xpack.observability.slo.list.errorNotification', {
          defaultMessage: 'Something went wrong while fetching SLOs',
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

const mixKqlWithTags = (kqlQuery: string, tags: SearchState['tags']) => {
  if (!tags) {
    return kqlQuery;
  }
  const tagsKqlIncluded = tags.included?.join(' or ') || '';
  const excludedTagsKql = tags.excluded?.join(' or ') || '';

  let tagsQuery = '';
  if (tagsKqlIncluded && excludedTagsKql) {
    tagsQuery = `slo.tags: (${excludedTagsKql}) and not slo.tags: (${tagsKqlIncluded})`;
  }
  if (!excludedTagsKql && tagsKqlIncluded) {
    tagsQuery = `slo.tags: (${tagsKqlIncluded})`;
  }
  if (!tagsKqlIncluded && excludedTagsKql) {
    tagsQuery = `not slo.tags: (${excludedTagsKql})`;
  }

  if (!kqlQuery) {
    return tagsQuery;
  }

  return `${kqlQuery} and ${tagsQuery}`;
};
