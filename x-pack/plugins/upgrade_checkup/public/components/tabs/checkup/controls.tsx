/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { StatelessComponent } from 'react';

import { EuiButton, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { DeprecationInfo } from 'src/core_plugins/elasticsearch';
import { LevelFilterBar } from './filter_bar';
import { GroupByBar } from './group_by_bar';
import { GroupByOption, LevelFilterOption, LoadingState } from './types';

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
  <EuiFlexGroup alignItems="center">
    <EuiFlexItem grow>
      <div>
        <EuiButton
          onClick={loadData}
          iconType="refresh"
          isLoading={loadingState === LoadingState.Loading}
        >
          {loadingState === LoadingState.Loading ? 'Loading…' : 'Rerun Checkup'}
        </EuiButton>
      </div>
    </EuiFlexItem>
    <EuiFlexItem grow={false}>
      <GroupByBar {...{ availableGroupByOptions, currentGroupBy, onGroupByChange }} />
    </EuiFlexItem>
    <EuiFlexItem grow={false}>
      <LevelFilterBar {...{ allDeprecations, currentFilter, onFilterChange }} />
    </EuiFlexItem>
  </EuiFlexGroup>
);
