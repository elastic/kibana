/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { assertNever } from '@elastic/eui';

import type { CaseUserActionsStats } from '../../containers/types';
import type { UserActivityParams } from '../user_actions_activity_bar/types';

export const useLastPage = ({
  userActivityQueryParams,
  userActionsStats,
}: {
  userActivityQueryParams: UserActivityParams;
  userActionsStats: CaseUserActionsStats;
}) => {
  const lastPage = useMemo(() => {
    if (!userActionsStats) {
      return 0;
    }

    const perPage = userActivityQueryParams.perPage;

    switch (userActivityQueryParams.type) {
      case 'action':
        return Math.ceil(userActionsStats.totalOtherActions / perPage);
      case 'user':
        return Math.ceil(userActionsStats.totalComments / perPage);
      case 'all':
        return Math.ceil(userActionsStats.total / perPage);
      default:
        assertNever(userActivityQueryParams.type);
    }
  }, [userActionsStats, userActivityQueryParams]);

  return { lastPage };
};
