/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFilterButton, EuiFilterGroup, EuiFlexGroup, EuiFlexItem, EuiPanel } from '@elastic/eui';
import React, { memo } from 'react';
import { CoverageOverviewLegend } from './shared_components/dashboard_legend';
import * as i18n from './translations';

export interface CoverageOverviewFiltersPanelProps {
  setShowExpandedCells: (arg: boolean) => void;
  showExpandedCells: boolean;
}

const CoverageOverviewFiltersPanelComponent = ({
  setShowExpandedCells,
  showExpandedCells,
}: CoverageOverviewFiltersPanelProps) => {
  const handleExpandCellsFilterClick = () => setShowExpandedCells(true);
  const handleCollapseCellsFilterClick = () => setShowExpandedCells(false);

  return (
    <EuiPanel>
      <EuiFlexGroup justifyContent="spaceBetween">
        <EuiFlexItem grow={false}>
          <EuiFilterGroup>
            <EuiFilterButton
              withNext
              hasActiveFilters={!showExpandedCells}
              onClick={handleCollapseCellsFilterClick}
            >
              {i18n.COLLAPSE_CELLS_FILTER_BUTTON}
            </EuiFilterButton>
            <EuiFilterButton
              hasActiveFilters={showExpandedCells}
              onClick={handleExpandCellsFilterClick}
            >
              {i18n.EXPAND_CELLS_FILTER_BUTTON}
            </EuiFilterButton>
          </EuiFilterGroup>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <CoverageOverviewLegend />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};

export const CoverageOverviewFiltersPanel = memo(CoverageOverviewFiltersPanelComponent);
