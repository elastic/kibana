/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { EuiFilterGroup, EuiFilterButton } from '@elastic/eui';

import type { CaseUserActionsStats } from '../../containers/types';
import * as i18n from './translations';
import type { FilterType } from './types';

interface FilterActivityProps {
  isLoading?: boolean;
  type: FilterType;
  userActionsStats?: CaseUserActionsStats;
  onFilterChange: (type: FilterType) => void;
}

export const FilterActivity = React.memo<FilterActivityProps>(
  ({ type, onFilterChange, userActionsStats, isLoading = false }) => {
    const handleFilterChange = useCallback(
      (value: FilterType) => {
        onFilterChange(value);
      },
      [onFilterChange]
    );

    return (
      <EuiFilterGroup data-test-subj="user-actions-filter-activity-group">
        <EuiFilterButton
          withNext
          grow={false}
          onClick={() => handleFilterChange('all')}
          hasActiveFilters={type === 'all'}
          numFilters={userActionsStats?.total}
          isLoading={isLoading}
          data-test-subj="user-actions-filter-activity-button-all"
        >
          {i18n.ALL}
        </EuiFilterButton>
        <EuiFilterButton
          withNext
          grow={false}
          hasActiveFilters={type === 'user'}
          numActiveFilters={userActionsStats?.totalComments}
          isLoading={isLoading}
          onClick={() => handleFilterChange('user')}
          data-test-subj="user-actions-filter-activity-button-comments"
        >
          {i18n.COMMENTS}
        </EuiFilterButton>
        <EuiFilterButton
          hasActiveFilters={type === 'action'}
          numActiveFilters={userActionsStats?.totalOtherActions}
          onClick={() => handleFilterChange('action')}
          isLoading={isLoading}
          data-test-subj="user-actions-filter-activity-button-history"
        >
          {i18n.HISTORY}
        </EuiFilterButton>
      </EuiFilterGroup>
    );
  }
);

FilterActivity.displayName = 'FilterActivity';
