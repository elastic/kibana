/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { groupBy } from 'lodash';
import React from 'react';

import { EuiFilterButton, EuiFilterGroup, EuiFlexItem } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { DeprecationInfo } from 'src/core_plugins/elasticsearch';
import { LevelFilterOption } from '../../types';

const LocalizedOptions: { [option: string]: string } = {
  warning: i18n.translate(
    'xpack.upgradeAssistant.checkupTab.controls.filterBar.warningButtonLabel',
    { defaultMessage: 'warning' }
  ),
  critical: i18n.translate(
    'xpack.upgradeAssistant.checkupTab.controls.filterBar.criticalButtonLabel',
    { defaultMessage: 'critical' }
  ),
};

const allFilterOptions = Object.keys(LevelFilterOption) as LevelFilterOption[];

interface FilterBarProps {
  allDeprecations?: DeprecationInfo[];
  currentFilter: Set<LevelFilterOption>;
  onFilterChange(level: LevelFilterOption): void;
}

export const FilterBar: React.StatelessComponent<FilterBarProps> = ({
  allDeprecations = [],
  currentFilter,
  onFilterChange,
}) => {
  const levelGroups = groupBy(allDeprecations, 'level');
  const levelCounts = Object.keys(levelGroups).reduce(
    (counts, level) => {
      counts[level] = levelGroups[level].length;
      return counts;
    },
    {} as { [level: string]: number }
  );

  return (
    <EuiFlexItem grow={false}>
      <EuiFilterGroup>
        {allFilterOptions.map(option => (
          <EuiFilterButton
            key={option}
            onClick={onFilterChange.bind(null, option)}
            hasActiveFilters={currentFilter.has(option)}
            numFilters={levelCounts[option] || undefined}
          >
            {LocalizedOptions[option]}
          </EuiFilterButton>
        ))}
      </EuiFilterGroup>
    </EuiFlexItem>
  );
};
