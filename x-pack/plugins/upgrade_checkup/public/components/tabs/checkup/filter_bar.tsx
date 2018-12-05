/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import React from 'react';

import { EuiFilterButton, EuiFilterGroup, EuiFlexItem } from '@elastic/eui';
import { injectI18n } from '@kbn/i18n/react';

import { DeprecationInfo } from 'src/core_plugins/elasticsearch';
import { LevelFilterOption } from '../../types';

interface LevelFilterBarProps extends ReactIntl.InjectedIntlProps {
  allDeprecations?: DeprecationInfo[];
  currentFilter: Set<LevelFilterOption>;
  onFilterChange(level: LevelFilterOption): void;
}

export class LevelFilterBarUI extends React.Component<LevelFilterBarProps> {
  public render() {
    const { allDeprecations = [], currentFilter, intl } = this.props;

    const levelGroups = _.groupBy(allDeprecations, 'level');
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
          {/* Can't loop over LevelFilterOptions because localization strings must be static. */}

          <EuiFilterButton
            onClick={this.filterClicked.bind(this, LevelFilterOption.warning)}
            hasActiveFilters={currentFilter.has(LevelFilterOption.warning)}
            numFilters={levelCounts.warning || undefined}
          >
            {/* Must use intl.formatMessage b/c this component changes size based on its
                contents and is too large with FormatMessage component */}
            {intl.formatMessage({
              id: 'xpack.upgradeCheckup.checkupTab.controls.filterBar.warningButtonLabel',
              defaultMessage: 'warning',
            })}
          </EuiFilterButton>

          <EuiFilterButton
            onClick={this.filterClicked.bind(this, LevelFilterOption.critical)}
            hasActiveFilters={currentFilter.has(LevelFilterOption.critical)}
            numFilters={levelCounts.critical || undefined}
          >
            {intl.formatMessage({
              id: 'xpack.upgradeCheckup.checkupTab.controls.filterBar.criticalButtonLabel',
              defaultMessage: 'critical',
            })}
          </EuiFilterButton>
        </EuiFilterGroup>
      </EuiFlexItem>
    );
  }

  private filterClicked(level: LevelFilterOption) {
    this.props.onFilterChange(level);
  }
}

export const LevelFilterBar = injectI18n(LevelFilterBarUI);
