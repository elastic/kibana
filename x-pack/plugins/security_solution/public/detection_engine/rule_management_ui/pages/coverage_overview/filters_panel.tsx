/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFilterButton, EuiFilterGroup, EuiPanel } from '@elastic/eui';
import React, { memo, useCallback } from 'react';
import * as i18n from './translations';

export interface CoverageOverviewFiltersPanelProps {
  setShowExpandedCells: (arg: boolean) => void;
  showExpandedCells: boolean;
}

const CoverageOverviewFiltersPanelComponent = ({
  setShowExpandedCells,
  showExpandedCells,
}: CoverageOverviewFiltersPanelProps) => {
  const handleExpandCellsFilterClick = useCallback(
    () => setShowExpandedCells(true),
    [setShowExpandedCells]
  );
  const handleCollapseCellsFilterClick = useCallback(
    () => setShowExpandedCells(false),
    [setShowExpandedCells]
  );

  return (
    <EuiPanel>
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
    </EuiPanel>
  );
};

export const CoverageOverviewFiltersPanel = memo(CoverageOverviewFiltersPanelComponent);
