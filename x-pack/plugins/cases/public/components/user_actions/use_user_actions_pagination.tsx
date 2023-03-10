/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo, useRef } from 'react';

import { useInfiniteFindCaseUserActions } from '../../containers/use_infinite_find_case_user_actions';
import type { CaseUserActions, CaseUserActionsStats } from '../../containers/types';
import { useFindCaseUserActions } from '../../containers/use_find_case_user_actions';
import type { UserActivityParams } from '../user_actions_activity_bar/types';

interface UserActionsPagination {
  userActivityQueryParams: UserActivityParams;
  userActionsStats: CaseUserActionsStats;
  caseId: string;
  isExpandable?: boolean;
}

export const useUserActionsPagination = ({
  userActivityQueryParams,
  userActionsStats,
  caseId,
  isExpandable = false,
}: UserActionsPagination) => {
  const isFirstRender = useRef(true);

  const {
    data: caseInfiniteUserActionsData,
    isLoading: isLoadingInfiniteUserActions,
    hasNextPage,
    fetchNextPage,
  } = useInfiniteFindCaseUserActions(caseId, userActivityQueryParams, isExpandable);

  const { data: caseUserActionsData, isLoading: isLoadingUserActions } = useFindCaseUserActions(
    caseId,
    userActivityQueryParams,
    !isExpandable
  );

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

  const showBottomList = lastPage > 0;

  const showLoadMore = isExpandable && userActivityQueryParams.page < lastPage;

  const caseUserActions = useMemo<CaseUserActions[]>(() => {
    if (!isExpandable) {
      return !isLoadingUserActions && caseUserActionsData ? caseUserActionsData.userActions : [];
    } else if (
      !caseInfiniteUserActionsData ||
      !caseInfiniteUserActionsData?.pages?.length ||
      isLoadingInfiniteUserActions
    ) {
      return [];
    }

    const userActionsData: CaseUserActions[] = [];

    caseInfiniteUserActionsData.pages.forEach((page) => userActionsData.push(...page.userActions));

    return userActionsData;
  }, [
    caseUserActionsData,
    caseInfiniteUserActionsData,
    isExpandable,
    isLoadingInfiniteUserActions,
    isLoadingUserActions,
  ]);

  if (isFirstRender.current) {
    isFirstRender.current = false;
  }

  return {
    lastPage,
    showBottomList,
    showLoadMore,
    isLoadingUserActions,
    isLoadingInfiniteUserActions,
    caseUserActions,
    hasNextPage,
    fetchNextPage,
  };
};
