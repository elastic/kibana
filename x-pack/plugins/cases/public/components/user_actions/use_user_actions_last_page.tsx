/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo, useRef } from 'react';
import deepEqual from 'fast-deep-equal';

import type { CaseUserActions, CaseUserActionsStats } from '../../containers/types';
import { useFindCaseUserActions } from '../../containers/use_find_case_user_actions';
import type { UserActivityParams } from '../user_actions_activity_bar/types';

interface LastPageUserActions {
  userActivityQueryParams: UserActivityParams;
  userActionsStats: CaseUserActionsStats;
  caseId: string;
  lastPage: number;
  showBottomList: boolean;
}

export const useLastPageUserActions = ({
  userActivityQueryParams,
  userActionsStats,
  caseId,
  lastPage,
  showBottomList,
}: LastPageUserActions) => {
  const isFirstRender = useRef(true);
  const activityParams = useRef(userActivityQueryParams);
  const actionsStats = useRef(userActionsStats);
  const prevLastPage = useRef(lastPage);

  const isActivityParamsUpdated =
    !deepEqual(activityParams.current, userActivityQueryParams) && !isFirstRender.current; // refetch bottom actions when query params changed

  const isActionsStatsUpdated =
    userActivityQueryParams.sortOrder === 'asc' &&
    !deepEqual(actionsStats.current, userActionsStats) &&
    !isFirstRender.current; // refetch last page actions only when new action added in the bottom list (i.e. in descending order)

  const lastPageChanged = prevLastPage.current !== lastPage; // when comments are 21st comment added, it should refetch user actions as last page has changed

  const { data: lastPageUserActionsData, isLoading: isLoadingLastPageUserActions } =
    useFindCaseUserActions(
      caseId,
      { ...userActivityQueryParams, page: lastPage },
      showBottomList &&
        (isFirstRender.current ||
          isActionsStatsUpdated ||
          isActivityParamsUpdated ||
          lastPageChanged)
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

  if (lastPageChanged) {
    prevLastPage.current = lastPage;
  }

  const lastPageUserActions = useMemo<CaseUserActions[]>(() => {
    if (isLoadingLastPageUserActions || !lastPageUserActionsData) {
      return [];
    }

    return lastPageUserActionsData.userActions;
  }, [lastPageUserActionsData, isLoadingLastPageUserActions]);

  return {
    isLoadingLastPageUserActions,
    lastPageUserActions,
  };
};
