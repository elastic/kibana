/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo, useRef } from 'react';
import deepEqual from 'fast-deep-equal';

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
  const isFirstRender = useRef(true);
  const activityParams = useRef(userActivityQueryParams);
  const actionsStats = useRef(userActionsStats);

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

  const isExpandable = userActivityQueryParams.page <= lastPage;

  const isActivityParamsUpdated =
    !deepEqual(activityParams.current, userActivityQueryParams) && !isFirstRender.current; // refetch top actions when query params changed

  const isActionsStatsUpdated =
    userActivityQueryParams.sortOrder === 'desc' &&
    !deepEqual(actionsStats.current, userActionsStats) &&
    !isFirstRender.current; // refetch top actions only when new action added in the top list (i.e. in descending order)

  // console.log('pagination hook', {isFirstRender: isFirstRender.current, isActionsStatsUpdated, isActivityParamsUpdated, lastPage, isExpandable })

  const {
    data: caseInfiniteUserActionsData,
    isLoading: isLoadingInfiniteUserActions,
    hasNextPage,
    fetchNextPage,
  } = useInfiniteFindCaseUserActions(
    caseId,
    userActivityQueryParams,
    isExpandable &&
      (isFirstRender.current || isActivityParamsUpdated || isActionsStatsUpdated || lastPage === 1)
  );

  if (isFirstRender.current) {
    isFirstRender.current = false;
  }

  if (isActivityParamsUpdated) {
    activityParams.current = userActivityQueryParams;
  }

  if (isActionsStatsUpdated) {
    actionsStats.current = userActionsStats;
  }

  const showBottomList = lastPage > 1;

  const showLoadMore = !isLoadingInfiniteUserActions && userActivityQueryParams.page < lastPage;

  const infiniteCaseUserActions = useMemo<CaseUserActions[]>(() => {
    if (
      !caseInfiniteUserActionsData ||
      !caseInfiniteUserActionsData?.pages?.length ||
      isLoadingInfiniteUserActions
    ) {
      return [];
    }

    const userActionsData: CaseUserActions[] = [];

    caseInfiniteUserActionsData.pages.forEach((page) => userActionsData.push(...page.userActions));

    return userActionsData;
  }, [caseInfiniteUserActionsData, isLoadingInfiniteUserActions]);

  return {
    lastPage,
    showBottomList,
    showLoadMore,
    isLoadingInfiniteUserActions,
    infiniteCaseUserActions,
    hasNextPage,
    fetchNextPage,
  };
};
