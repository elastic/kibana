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

interface UseLoadTagsQueryProps {
  enabled: boolean;
  refresh?: Date;
  filter?: LoadRuleTagsProps['filter'];
}

const EMPTY_TAGS: string[] = [];

// React query will refetch all prev pages:
// https://github.com/TanStack/query/discussions/3576
export function useLoadTagsQuery(props: UseLoadTagsQueryProps) {
  const { enabled, refresh, filter } = props;

  const {
    http,
    notifications: { toasts },
  } = useKibana().services;

  const queryFn = ({ pageParam: after }: { pageParam?: LoadRuleTagsProps['after'] }) => {
    return loadRuleTags({
      http,
      filter,
      ...(after ? { after } : {}),
    });
  };

  const onErrorFn = () => {
    toasts.addDanger(
      i18n.translate('xpack.triggersActionsUI.sections.rulesList.unableToLoadRuleTags', {
        defaultMessage: 'Unable to load rule tags',
      })
    );
  };

  const { refetch, data, fetchNextPage, isLoading, isFetching } = useInfiniteQuery({
    queryKey: [
      'loadRuleTags',
      filter,
      {
        refresh: refresh?.toISOString(),
      },
    ],
    queryFn,
    onError: onErrorFn,
    enabled,
    getNextPageParam: (lastPage) => lastPage.afterKey,
    refetchOnWindowFocus: false,
  });

  const tags = useMemo(() => {
    return (
      data?.pages.reduce<string[]>((result, current) => {
        return [...result, ...current.ruleTags];
      }, []) || EMPTY_TAGS
    );
  }, [data]);

  return {
    tags,
    afterKey: data?.pages[data.pages.length - 1].afterKey,
    refetch,
    isLoading: isLoading || isFetching,
    fetchNextPage,
  };
}
