/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiFilterButton, EuiFilterGroup, EuiFlexItem } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { LevelFilterOption } from '../../types';

const LocalizedOptions: { [option: string]: string } = {
  critical: i18n.translate(
    'xpack.upgradeAssistant.checkupTab.controls.filterBar.criticalButtonLabel',
    { defaultMessage: 'Critical' }
  ),
};
interface DeprecationLevelProps {
  levelsCount: {
    [key: string]: number;
  };
  currentFilter: LevelFilterOption;
  onFilterChange(level: LevelFilterOption): void;
}

export const DeprecationLevelFilter: React.FunctionComponent<DeprecationLevelProps> = ({
  levelsCount,
  currentFilter,
  onFilterChange,
}) => {
  return (
    <EuiFlexItem grow={false}>
      <EuiFilterGroup>
        <EuiFilterButton
          key="critical"
          onClick={() => {
            onFilterChange(currentFilter !== 'critical' ? 'critical' : 'all');
          }}
          hasActiveFilters={currentFilter === 'critical'}
          numFilters={levelsCount.critical || undefined}
          data-test-subj="criticalLevelFilter"
        >
          {LocalizedOptions.critical}
        </EuiFilterButton>
      </EuiFilterGroup>
    </EuiFlexItem>
  );
};
