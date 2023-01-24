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
import type { FilterType, SortOrderType } from './types';

export interface Params {
  type: FilterType;
  sortOrder: SortOrderType;
}

interface UserActionsActivityProps {
  isLoading?: boolean;
  params: Params;
  onUserActionsActivityChanged: (params: Params) => void;
}

export const UserActionsActivityBar = React.memo<UserActionsActivityProps>(
  ({ params, onUserActionsActivityChanged, isLoading }) => {
    const handleFilterChange = (type: FilterType) => {
      onUserActionsActivityChanged({ ...params, type });
    };

    const handleOrderChange = (sortOrder: SortOrderType) => {
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
