/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { EuiFilterButton, EuiFilterGroup, EuiFlexItem } from '@elastic/eui';
import { injectI18n } from '@kbn/i18n/react';

import { GroupByOption } from '../../types';

interface GroupByBarProps extends ReactIntl.InjectedIntlProps {
  availableGroupByOptions: GroupByOption[];
  currentGroupBy: GroupByOption;
  onGroupByChange: (groupBy: GroupByOption) => void;
}

export class GroupByBarUI extends React.Component<GroupByBarProps> {
  public render() {
    const { availableGroupByOptions, currentGroupBy, intl } = this.props;

    if (availableGroupByOptions.length <= 1) {
      return null;
    }

    return (
      <EuiFlexItem grow={false}>
        <EuiFilterGroup>
          {/* Can't loop over GroupByOption because localization message ids must be static. */}

          <EuiFilterButton
            onClick={this.filterClicked.bind(this, GroupByOption.message)}
            hasActiveFilters={currentGroupBy === GroupByOption.message}
          >
            {/* Must use intl.formatMessage b/c this component changes size based on its
                contents and is too large with FormatMessage component */}
            {intl.formatMessage({
              id: 'xpack.upgradeAssistant.checkupTab.controls.groupByBar.byIssueLabel',
              defaultMessage: 'by issue',
            })}
          </EuiFilterButton>

          <EuiFilterButton
            onClick={this.filterClicked.bind(this, GroupByOption.index)}
            hasActiveFilters={currentGroupBy === GroupByOption.index}
          >
            {intl.formatMessage({
              id: 'xpack.upgradeAssistant.checkupTab.controls.groupByBar.byIndexLabel',
              defaultMessage: 'by index',
            })}
          </EuiFilterButton>
        </EuiFilterGroup>
      </EuiFlexItem>
    );
  }

  private filterClicked(groupBy: GroupByOption) {
    this.props.onGroupByChange(groupBy);
  }
}

export const GroupByBar = injectI18n(GroupByBarUI);
