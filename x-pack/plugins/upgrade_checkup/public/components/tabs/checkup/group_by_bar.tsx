/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { EuiFilterButton, EuiFilterGroup } from '@elastic/eui';
import { GroupByOption } from './types';

interface GroupByBarProps {
  availableGroupByOptions: GroupByOption[];
  currentGroupBy: GroupByOption;
  onGroupByChange: (groupBy: GroupByOption) => void;
}

export class GroupByBar extends React.Component<GroupByBarProps> {
  public render() {
    const { availableGroupByOptions, currentGroupBy } = this.props;

    if (availableGroupByOptions.length <= 1) {
      return null;
    }

    return (
      <EuiFilterGroup>
        {availableGroupByOptions.map(option => (
          <EuiFilterButton
            key={option}
            onClick={this.filterClicked.bind(this, option)}
            hasActiveFilters={currentGroupBy === option}
          >
            {option}
          </EuiFilterButton>
        ))}
      </EuiFilterGroup>
    );
  }

  private filterClicked(groupBy: GroupByOption) {
    this.props.onGroupByChange(groupBy);
  }
}
