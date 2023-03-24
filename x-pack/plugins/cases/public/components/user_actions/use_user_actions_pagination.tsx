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
import { useFindCaseUserActions } from '../../containers/use_find_case_user_actions';
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
  console.log('pagination hook called', isFirstRender.current);

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

  const isExpandable = lastPage > 0 && userActivityQueryParams.page < lastPage;

  const skipRefetchInfiniteActions =
    userActivityQueryParams.sortOrder === 'asc' &&
    deepEqual(activityParams.current, userActivityQueryParams) &&
    !isFirstRender.current; // do not refetch top actions when new action added in the bottom list

  const skipRefetchBottomActions =
    userActivityQueryParams.sortOrder === 'desc' &&
    deepEqual(activityParams.current, userActivityQueryParams) &&
    !isFirstRender.current; // do not refetch bottom actions when new action added in the top list

  const {
    data: caseInfiniteUserActionsData,
    isLoading: isLoadingInfiniteUserActions,
    hasNextPage,
    fetchNextPage,
  } = useInfiniteFindCaseUserActions(
    caseId,
    userActivityQueryParams,
    isExpandable && (isFirstRender.current || !skipRefetchInfiniteActions)
  );

  const { data: caseUserActionsData, isLoading: isLoadingUserActions } = useFindCaseUserActions(
    caseId,
    { ...userActivityQueryParams, page: lastPage },
    isFirstRender.current || !skipRefetchBottomActions
  );

  if (isFirstRender.current) {
    isFirstRender.current = false;
  }

  if (skipRefetchInfiniteActions || skipRefetchBottomActions) {
    activityParams.current = userActivityQueryParams;
  }

  const showBottomList = lastPage > 0;

  const showLoadMore =
    !isLoadingUserActions &&
    !isLoadingInfiniteUserActions &&
    userActivityQueryParams.page < lastPage;

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

  const caseUserActions = useMemo<CaseUserActions[]>(() => {
    if (isLoadingUserActions || !caseUserActionsData) {
      return [];
    }

    return caseUserActionsData.userActions;
  }, [caseUserActionsData, isLoadingUserActions]);

  return {
    lastPage,
    showBottomList,
    showLoadMore,
    isLoadingUserActions,
    isLoadingInfiniteUserActions,
    infiniteCaseUserActions,
    caseUserActions,
    hasNextPage,
    fetchNextPage,
  };
};
