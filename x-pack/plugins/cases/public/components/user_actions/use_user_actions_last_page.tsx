/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo, useRef } from 'react';
import deepEqual from 'fast-deep-equal';

import type { CaseUserActions } from '../../containers/types';
import { useFindCaseUserActions } from '../../containers/use_find_case_user_actions';
import type { UserActivityParams } from '../user_actions_activity_bar/types';

interface LastPageUserActions {
  userActivityQueryParams: UserActivityParams;
  caseId: string;
  lastPage: number;
}

export const useLastPageUserActions = ({
  userActivityQueryParams,
  caseId,
  lastPage,
}: LastPageUserActions) => {
  const isFirstRender = useRef(true);
  const activityParams = useRef(userActivityQueryParams);

  const skipRefetchBottomActions =
    userActivityQueryParams.sortOrder === 'desc' &&
    deepEqual(activityParams.current, userActivityQueryParams) &&
    !isFirstRender.current; // do not refetch bottom actions when new action added in the top list

  const { data: lastPageUserActionsData, isLoading: isLoadingLastPageUserActions } =
    useFindCaseUserActions(
      caseId,
      { ...userActivityQueryParams, page: lastPage },
      isFirstRender.current || !skipRefetchBottomActions
    );

  if (isFirstRender.current) {
    isFirstRender.current = false;
  }

  if (skipRefetchBottomActions) {
    activityParams.current = userActivityQueryParams;
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
