/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { useInfiniteQuery } from '@tanstack/react-query';
import { loadRuleTags } from '../lib/rule_api/aggregate';
import { useKibana } from '../../common/lib/kibana';
import { LoadRuleTagsProps } from '../lib/rule_api';
import { GetRuleTagsResponse } from '../lib/rule_api/aggregate_helpers';

interface UseLoadTagsQueryProps {
  enabled: boolean;
  refresh?: Date;
  search?: string;
  perPage?: number;
  page?: number;
}

const EMPTY_TAGS: string[] = [];

// React query will refetch all prev pages when the cache keys change:
// https://github.com/TanStack/query/discussions/3576
export function useLoadTagsQuery(props: UseLoadTagsQueryProps) {
  const { enabled, refresh, search, perPage, page = 1 } = props;

  const {
    http,
    notifications: { toasts },
  } = useKibana().services;

  const queryFn = ({ pageParam }: { pageParam?: LoadRuleTagsProps }) => {
    if (pageParam) {
      return loadRuleTags({
        http,
        perPage: pageParam.perPage,
        page: pageParam.page,
        search,
      });
    }
    return loadRuleTags({
      http,
      perPage,
      page,
      search,
    });
  };

  const onErrorFn = () => {
    toasts.addDanger(
      i18n.translate('xpack.triggersActionsUI.sections.rulesList.unableToLoadRuleTags', {
        defaultMessage: 'Unable to load rule tags',
      })
    );
  };

  const getNextPageParam = (lastPage: GetRuleTagsResponse) => {
    const totalPages = Math.max(1, Math.ceil(lastPage.total / lastPage.perPage));
    if (totalPages === lastPage.page) {
      return;
    }
    return {
      ...lastPage,
      page: lastPage.page + 1,
    };
  };

  const { refetch, data, fetchNextPage, isLoading, isFetching, hasNextPage, isFetchingNextPage } =
    useInfiniteQuery({
      queryKey: [
        'loadRuleTags',
        search,
        perPage,
        page,
        {
          refresh: refresh?.toISOString(),
        },
      ],
      queryFn,
      onError: onErrorFn,
      enabled,
      getNextPageParam,
      refetchOnWindowFocus: false,
    });

  const tags = useMemo(() => {
    return (
      data?.pages.reduce<string[]>((result, current) => {
        return result.concat(current.data);
      }, []) || EMPTY_TAGS
    );
  }, [data]);

  return {
    tags,
    hasNextPage,
    refetch,
    isLoading: isLoading || isFetching || isFetchingNextPage,
    fetchNextPage,
  };
}
