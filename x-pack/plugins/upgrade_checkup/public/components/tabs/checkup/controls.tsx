/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { StatelessComponent } from 'react';

import { EuiButton, EuiFieldSearch, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { DeprecationInfo } from 'src/core_plugins/elasticsearch';
import { GroupByOption, LevelFilterOption, LoadingState } from '../../types';
import { LevelFilterBar } from './filter_bar';
import { GroupByBar } from './group_by_bar';

interface CheckupControlsProps {
  allDeprecations?: DeprecationInfo[];
  loadingState: LoadingState;
  loadData: () => void;
  currentFilter: Set<LevelFilterOption>;
  onFilterChange: (filter: LevelFilterOption) => void;
  availableGroupByOptions: GroupByOption[];
  currentGroupBy: GroupByOption;
  onGroupByChange: (groupBy: GroupByOption) => void;
}

export const CheckupControls: StatelessComponent<CheckupControlsProps> = ({
  allDeprecations,
  loadingState,
  loadData,
  currentFilter,
  onFilterChange,
  availableGroupByOptions,
  currentGroupBy,
  onGroupByChange,
}) => (
  <EuiFlexGroup alignItems="center" wrap={true} responsive={false}>
    <EuiFlexItem grow={true}>
      <EuiFieldSearch placeholder="Filter list" />
    </EuiFlexItem>
    <EuiFlexItem grow={false}>
      <LevelFilterBar {...{ allDeprecations, currentFilter, onFilterChange }} />
    </EuiFlexItem>
    <EuiFlexItem grow={false}>
      <GroupByBar {...{ availableGroupByOptions, currentGroupBy, onGroupByChange }} />
    </EuiFlexItem>
    <EuiFlexItem grow={false}>
      <EuiButton
        fill
        onClick={loadData}
        iconType="refresh"
        isLoading={loadingState === LoadingState.Loading}
      >
        Refresh
      </EuiButton>
    </EuiFlexItem>
  </EuiFlexGroup>
);
