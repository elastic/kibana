/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { StatelessComponent } from 'react';

import { EuiButton, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { LevelFilterBar } from './filter_bar';
import { LevelFilterOption, LoadingState } from './types';

interface CheckupControlsProps {
  loadingState: LoadingState;
  loadData: () => void;
  currentFilter: LevelFilterOption;
  onFilterChange: (filter: LevelFilterOption) => void;
}

export const CheckupControls: StatelessComponent<CheckupControlsProps> = ({
  loadingState,
  loadData,
  currentFilter,
  onFilterChange,
}) => (
  <EuiFlexGroup>
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
      <LevelFilterBar {...{ currentFilter, onFilterChange }} />
    </EuiFlexItem>
  </EuiFlexGroup>
);
