/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { groupBy } from 'lodash';
import React from 'react';

import { EuiFilterButton, EuiFilterGroup, EuiFlexItem } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { DeprecationInfo } from '../../../../common/types';
import { LevelFilterOption } from '../types';

const LocalizedOptions: { [option: string]: string } = {
  warning: i18n.translate(
    'xpack.upgradeAssistant.checkupTab.controls.filterBar.warningButtonLabel',
    {
      defaultMessage: 'warning',
    }
  ),
  critical: i18n.translate(
    'xpack.upgradeAssistant.checkupTab.controls.filterBar.criticalButtonLabel',
    { defaultMessage: 'critical' }
  ),
};

interface FilterBarProps {
  allDeprecations?: DeprecationInfo[];
  currentFilter: LevelFilterOption;
  onFilterChange(level: LevelFilterOption): void;
}

export const FilterBar: React.FunctionComponent<FilterBarProps> = ({
  allDeprecations = [],
  currentFilter,
  onFilterChange,
}) => {
  const levelGroups = groupBy(allDeprecations, 'level');
  const levelCounts = Object.keys(levelGroups).reduce((counts, level) => {
    counts[level] = levelGroups[level].length;
    return counts;
  }, {} as { [level: string]: number });

  return (
    <EuiFlexItem grow={false}>
      <EuiFilterGroup>
        <EuiFilterButton
          withNext
          key={LevelFilterOption.critical}
          onClick={() => {
            onFilterChange(
              currentFilter !== LevelFilterOption.critical
                ? LevelFilterOption.critical
                : LevelFilterOption.all
            );
          }}
          hasActiveFilters={currentFilter === LevelFilterOption.critical}
          numFilters={levelCounts[LevelFilterOption.critical] || undefined}
          data-test-subj="criticalLevelFilter"
        >
          {LocalizedOptions[LevelFilterOption.critical]}
        </EuiFilterButton>
        <EuiFilterButton
          key={LevelFilterOption.warning}
          onClick={() => {
            onFilterChange(
              currentFilter !== LevelFilterOption.warning
                ? LevelFilterOption.warning
                : LevelFilterOption.all
            );
          }}
          hasActiveFilters={currentFilter === LevelFilterOption.warning}
          numFilters={levelCounts[LevelFilterOption.warning] || undefined}
          data-test-subj="warningLevelFilter"
        >
          {LocalizedOptions[LevelFilterOption.warning]}
        </EuiFilterButton>
      </EuiFilterGroup>
    </EuiFlexItem>
  );
};
