/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';

import { FilterActivity } from './filter_activity';
import { SortActivity } from './sort_activity';
import type { UserActivityFilter, UserActivitySortOrder, UserActivityParams } from './types';
import type { CaseUserActionsStats } from '../../containers/types';

interface UserActionsActivityProps {
  isLoading?: boolean;
  params: UserActivityParams;
  userActionsStats?: CaseUserActionsStats;
  onUserActionsActivityChanged: (params: UserActivityParams) => void;
}

export const UserActionsActivityBar = React.memo<UserActionsActivityProps>(
  ({ params, onUserActionsActivityChanged, userActionsStats, isLoading }) => {
    const handleFilterChange = (type: UserActivityFilter) => {
      onUserActionsActivityChanged({ ...params, type });
    };

    const handleOrderChange = (sortOrder: UserActivitySortOrder) => {
      onUserActionsActivityChanged({ ...params, sortOrder });
    };

    return (
      <EuiFlexGroup
        wrap={true}
        responsive={false}
        justifyContent="spaceBetween"
        data-test-subj="user-actions-activity-bar"
      >
        <EuiFlexItem grow={false}>
          <FilterActivity
            type={params.type}
            onFilterChange={handleFilterChange}
            userActionsStats={userActionsStats}
            isLoading={isLoading}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <SortActivity
            sortOrder={params.sortOrder}
            onOrderChange={handleOrderChange}
            isLoading={isLoading}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }
);

UserActionsActivityBar.displayName = 'UserActionsActivityBar';
