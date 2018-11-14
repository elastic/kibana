/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { EuiFilterButton, EuiFilterGroup } from '@elastic/eui';
import { LevelFilterOption } from './types';

interface LevelFilterBarProps {
  currentFilter: Set<LevelFilterOption>;
  onFilterChange(level: LevelFilterOption): void;
}

const allFilterOptions = Object.keys(LevelFilterOption) as LevelFilterOption[];

export class LevelFilterBar extends React.Component<LevelFilterBarProps> {
  public render() {
    const { currentFilter } = this.props;

    return (
      <EuiFilterGroup>
        {allFilterOptions.map(option => (
          <EuiFilterButton
            key={option}
            onClick={this.filterClicked.bind(this, option)}
            hasActiveFilters={currentFilter.has(option)}
          >
            {option}
          </EuiFilterButton>
        ))}
      </EuiFilterGroup>
    );
  }

  private filterClicked(level: LevelFilterOption) {
    this.props.onFilterChange(level);
  }
}
