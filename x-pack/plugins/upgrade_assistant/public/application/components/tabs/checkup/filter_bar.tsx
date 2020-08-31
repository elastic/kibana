/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { groupBy } from 'lodash';
import React from 'react';

import { EuiFilterButton, EuiFilterGroup, EuiFlexItem } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { DeprecationInfo } from 'src/legacy/core_plugins/elasticsearch';
import { LevelFilterOption } from '../../types';

const LocalizedOptions: { [option: string]: string } = {
  all: i18n.translate('xpack.upgradeAssistant.checkupTab.controls.filterBar.allButtonLabel', {
    defaultMessage: 'all',
  }),
  critical: i18n.translate(
    'xpack.upgradeAssistant.checkupTab.controls.filterBar.criticalButtonLabel',
    { defaultMessage: 'critical' }
  ),
};

const allFilterOptions = Object.keys(LevelFilterOption) as LevelFilterOption[];

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

  const allCount = allDeprecations.length;

  return (
    <EuiFlexItem grow={false}>
      <EuiFilterGroup>
        {allFilterOptions.map((option) => (
          <EuiFilterButton
            key={option}
            onClick={onFilterChange.bind(null, option)}
            hasActiveFilters={currentFilter === option}
            numFilters={
              option === LevelFilterOption.all ? allCount : levelCounts[option] || undefined
            }
          >
            {LocalizedOptions[option]}
          </EuiFilterButton>
        ))}
      </EuiFilterGroup>
    </EuiFlexItem>
  );
};
