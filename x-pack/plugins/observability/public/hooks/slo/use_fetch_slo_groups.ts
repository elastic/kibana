/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useQuery } from '@tanstack/react-query';
import { i18n } from '@kbn/i18n';
import { useMemo } from 'react';
import { FindSLOGroupsResponse } from '@kbn/slo-schema';
import { useKibana } from '../../utils/kibana_react';
import { sloKeys } from './query_key_factory';
import { DEFAULT_SLO_GROUPS_PAGE_SIZE } from '../../../common/slo/constants';
import { SearchState } from '../../pages/slos/hooks/use_url_search_state';

interface SLOGroupsParams {
  page?: number;
  perPage?: number;
  groupBy?: string;
  kqlQuery?: string;
  tags?: SearchState['tags'];
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
  groupBy = 'ungrouped',
  kqlQuery = '',
  tags,
}: SLOGroupsParams = {}): UseFetchSloGroupsResponse {
  const {
    http,
    notifications: { toasts },
  } = useKibana().services;

  const kqlQueryValue = useMemo(() => {
    return mixKqlWithTags(kqlQuery, tags);
  }, [kqlQuery, tags]);
  const { data, isLoading, isSuccess, isError, isRefetching } = useQuery({
    queryKey: sloKeys.group({ page, perPage, groupBy, kqlQuery: kqlQueryValue }),
    queryFn: async ({ signal }) => {
      const response = await http.get<FindSLOGroupsResponse>(
        '/internal/api/observability/slos/_groups',
        {
          query: {
            ...(page && { page }),
            ...(perPage && { perPage }),
            ...(groupBy && { groupBy }),
            ...(kqlQueryValue && { kqlQuery: kqlQueryValue }),
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
  if (tagsQuery) {
    return `${kqlQuery} and ${tagsQuery}`;
  } else {
    return kqlQuery;
  }
  // return `${kqlQuery} and ${tagsQuery}`;
};
