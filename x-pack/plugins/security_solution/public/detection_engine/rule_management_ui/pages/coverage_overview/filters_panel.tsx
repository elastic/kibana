/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiFilterButton,
  EuiFilterGroup,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSearchBar,
} from '@elastic/eui';
import React, { memo, useCallback, useMemo, useState } from 'react';
import { css } from '@emotion/css';
import type {
  CoverageOverviewRuleActivity,
  CoverageOverviewRuleSource,
} from '../../../../../common/api/detection_engine';
import { useCoverageOverviewDashboardContext } from './coverage_overview_page';
import { DashboardFilterButtonComponent } from './shared_components/dashboard_filter_button';
import { CoverageOverviewLegend } from './shared_components/dashboard_legend';
import {
  formatRuleFilterOptions,
  getInitialRuleStatusFilter,
  getInitialRuleTypeFilter,
} from './helpers';
import * as i18n from './translations';

export interface CoverageOverviewFiltersPanelProps {
  isLoading: boolean;
}

const CoverageOverviewFiltersPanelComponent = ({
  isLoading,
}: CoverageOverviewFiltersPanelProps) => {
  const {
    dispatch,
    state: { showExpandedCells, filter },
  } = useCoverageOverviewDashboardContext();

  const setShowExpandedCells = useCallback(
    (value: boolean): void => {
      dispatch({
        type: 'setShowExpandedCells',
        value,
      });
    },
    [dispatch]
  );

  const setRuleStatusFilter = useCallback(
    (value: CoverageOverviewRuleActivity[]): void => {
      dispatch({
        type: 'setRuleStatusFilter',
        value,
      });
    },
    [dispatch]
  );

  const setRuleTypeFilter = useCallback(
    (value: CoverageOverviewRuleSource[]): void => {
      dispatch({
        type: 'setRuleTypeFilter',
        value,
      });
    },
    [dispatch]
  );

  const setRuleSearchFilter = useCallback(
    (value: string): void => {
      dispatch({
        type: 'setRuleSearchFilter',
        value,
      });
    },
    [dispatch]
  );

  const handleExpandCellsFilterClick = () => setShowExpandedCells(true);
  const handleCollapseCellsFilterClick = () => setShowExpandedCells(false);

  const ruleStatusFilterInitalValue = useMemo(() => getInitialRuleStatusFilter(filter), [filter]);
  const ruleTypeFilterInitalValue = useMemo(() => getInitialRuleTypeFilter(filter), [filter]);

  const [ruleStatusFilterOptions, setRuleStatusFilterOptions] = useState(
    ruleStatusFilterInitalValue
  );

  const [ruleTypeFilterOptions, setRuleTypeFilterOptions] = useState(ruleTypeFilterInitalValue);

  const handleRuleStatusFilterOnChange = useCallback(
    (options) => {
      setRuleStatusFilterOptions(options);
      const formattedOptions = formatRuleFilterOptions<CoverageOverviewRuleActivity>(options);
      setRuleStatusFilter(formattedOptions);
    },
    [setRuleStatusFilter]
  );

  const handleRuleTypeFilterOnChange = useCallback(
    (options) => {
      setRuleTypeFilterOptions(options);
      const formattedOptions = formatRuleFilterOptions<CoverageOverviewRuleSource>(options);
      setRuleTypeFilter(formattedOptions);
    },
    [setRuleTypeFilter]
  );

  const handleRuleSearchOnChange = useCallback(
    ({ queryText }: { queryText: string }) => {
      setRuleSearchFilter(queryText);
    },
    [setRuleSearchFilter]
  );

  return (
    <EuiPanel>
      <EuiFlexGroup justifyContent="spaceBetween">
        <EuiFlexItem>
          <EuiFlexGroup
            css={css`
              flex-grow: 0;
            `}
          >
            <DashboardFilterButtonComponent
              title="Installed rule status"
              options={ruleStatusFilterOptions}
              onChange={handleRuleStatusFilterOnChange}
              isLoading={isLoading}
            />
            <DashboardFilterButtonComponent
              title="Installed rule type"
              options={ruleTypeFilterOptions}
              onChange={handleRuleTypeFilterOnChange}
              isLoading={isLoading}
            />
          </EuiFlexGroup>
          <EuiFlexGroup alignItems="center">
            <EuiFlexItem>
              <EuiSearchBar onChange={handleRuleSearchOnChange} />
            </EuiFlexItem>
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
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <CoverageOverviewLegend />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};

export const CoverageOverviewFiltersPanel = memo(CoverageOverviewFiltersPanelComponent);
