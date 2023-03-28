/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';

import { useInfiniteFindCaseUserActions } from '../../containers/use_infinite_find_case_user_actions';
import type { CaseUserActions, CaseUserActionsStats } from '../../containers/types';
import type { UserActivityParams } from '../user_actions_activity_bar/types';

interface UserActionsPagination {
  userActivityQueryParams: UserActivityParams;
  userActionsStats: CaseUserActionsStats;
  caseId: string;
}

export const useUserActionsPagination = ({
  userActivityQueryParams,
  userActionsStats,
  caseId,
}: UserActionsPagination) => {
  const lastPage = useMemo(() => {
    if (!userActionsStats) {
      return 1;
    }

    const perPage = userActivityQueryParams.perPage;

    switch (userActivityQueryParams.type) {
      case 'action':
        return Math.ceil(userActionsStats.totalOtherActions / perPage);
      case 'user':
        return Math.ceil(userActionsStats.totalComments / perPage);
      case 'all':
      default:
        return Math.ceil(userActionsStats.total / perPage);
    }
  }, [userActionsStats, userActivityQueryParams]);

  const {
    data: caseInfiniteUserActionsData,
    isLoading: isLoadingInfiniteUserActions,
    hasNextPage,
    fetchNextPage,
  } = useInfiniteFindCaseUserActions(caseId, userActivityQueryParams, true);

  const showBottomList = lastPage > 1;

  const infiniteCaseUserActions = useMemo<CaseUserActions[]>(() => {
    if (!caseInfiniteUserActionsData?.pages?.length || isLoadingInfiniteUserActions) {
      return [];
    }

    const userActionsData: CaseUserActions[] = [];

    caseInfiniteUserActionsData.pages.forEach((page) => userActionsData.push(...page.userActions));

    return userActionsData;
  }, [caseInfiniteUserActionsData, isLoadingInfiniteUserActions]);

  return {
    lastPage,
    showBottomList,
    isLoadingInfiniteUserActions,
    infiniteCaseUserActions,
    hasNextPage,
    fetchNextPage,
  };
};
