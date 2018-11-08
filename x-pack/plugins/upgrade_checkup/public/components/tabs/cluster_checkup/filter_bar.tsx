/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { EuiFilterButton, EuiFilterGroup } from '@elastic/eui';
import { LevelFilterOption } from './types';

interface LevelFilterBarProps {
  currentFilter: LevelFilterOption;
  onFilterChange(level: LevelFilterOption): void;
}

export class LevelFilterBar extends React.Component<LevelFilterBarProps> {
  private allClicked = this.filterClicked.bind(this, 'all');
  private infoClicked = this.filterClicked.bind(this, 'info');
  private warningClicked = this.filterClicked.bind(this, 'warning');
  private criticalClicked = this.filterClicked.bind(this, 'critical');

  public render() {
    const { currentFilter } = this.props;

    const isCurrent = (f: LevelFilterOption) => currentFilter === f;

    // const allOptions = keyof LevelFilterOption;

    // const allSel = currentFilter === 'all';
    // const infoSel = currentFilter === 'inf'</EuiFilterGroup>
    return (
      <EuiFilterGroup>
        {Object.keys(LevelFilterOption).map(option => (
          <EuiFilterButton
            key={option}
            onClick={this.filterClicked.bind(this, option)}
            hasActiveFilters={currentFilter === option}
          >
            {option}
          </EuiFilterButton>
        ))}
      </EuiFilterGroup>
    );

    return (
      <EuiFilterGroup>
        <EuiFilterButton onClick={this.allClicked}>All</EuiFilterButton>
        <EuiFilterButton onClick={this.infoClicked}>Info</EuiFilterButton>
        <EuiFilterButton onClick={this.warningClicked}>Warning</EuiFilterButton>
        <EuiFilterButton onClick={this.criticalClicked}>Critical</EuiFilterButton>
      </EuiFilterGroup>
    );
  }

  private filterClicked(level: LevelFilterOption) {
    this.props.onFilterChange(level);
  }
}
