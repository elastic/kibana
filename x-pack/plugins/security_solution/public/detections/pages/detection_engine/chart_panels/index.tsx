/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Filter, Query } from '@kbn/es-query';
import { EuiFlexItem, EuiSkeletonText } from '@elastic/eui';
import React, { useCallback, useMemo } from 'react';
import styled from 'styled-components';

import { useIsExperimentalFeatureEnabled } from '../../../../common/hooks/use_experimental_features';
import { useAlertsLocalStorage } from './alerts_local_storage';
import type { AlertsSettings } from './alerts_local_storage/types';
import { ChartContextMenu } from './chart_context_menu';
import { ChartSelect } from './chart_select';
import { ChartCollapse } from './chart_collapse';
import * as i18n from './chart_select/translations';
import { AlertsTreemapPanel } from '../../../../common/components/alerts_treemap_panel';
import type { RunTimeMappings } from '../../../../common/store/sourcerer/model';
import type { UpdateDateRange } from '../../../../common/components/charts/common';
import { useEuiComboBoxReset } from '../../../../common/components/use_combo_box_reset';
import { AlertsHistogramPanel } from '../../../components/alerts_kpis/alerts_histogram_panel';
import { AlertsSummaryChartsPanel } from '../../../components/alerts_kpis/alerts_summary_charts_panel';
import {
  DEFAULT_STACK_BY_FIELD,
  DEFAULT_STACK_BY_FIELD1,
} from '../../../components/alerts_kpis/common/config';
import { AlertsCountPanel } from '../../../components/alerts_kpis/alerts_count_panel';
import { GROUP_BY_LABEL } from '../../../components/alerts_kpis/common/translations';
import { useQueryToggle } from '../../../../common/containers/query_toggle';
import type { AddFilterProps } from '../../../components/alerts_kpis/common/types';
import { createResetGroupByFieldAction } from '../../../components/alerts_kpis/alerts_histogram_panel/helpers';

const TREND_CHART_HEIGHT = 240; // px
const CHART_PANEL_HEIGHT = 375; // px

const DETECTIONS_ALERTS_CHARTS_PANEL_ID = 'detection-alerts-charts-panel';

const FullHeightFlexItem = styled(EuiFlexItem)`
  height: 100%;
`;

const ChartSelectContainer = styled.div`
  margin-left: ${({ theme }) => theme.eui.euiSizeS};
`;

export interface Props {
  addFilter: ({ field, value, negate }: AddFilterProps) => void;
  alertsDefaultFilters: Filter[];
  isLoadingIndexPattern: boolean;
  query: Query;
  runtimeMappings: RunTimeMappings;
  signalIndexName: string | null;
  updateDateRangeCallback: UpdateDateRange;
}

const ChartPanelsComponent: React.FC<Props> = ({
  addFilter,
  alertsDefaultFilters,
  isLoadingIndexPattern,
  query,
  runtimeMappings,
  signalIndexName,
  updateDateRangeCallback,
}: Props) => {
  const { toggleStatus: isExpanded, setToggleStatus: setIsExpanded } = useQueryToggle(
    DETECTIONS_ALERTS_CHARTS_PANEL_ID
  );
  const isAlertsPageChartsEnabled = useIsExperimentalFeatureEnabled('alertsPageChartsEnabled');

  const {
    alertViewSelection,
    countTableStackBy0,
    countTableStackBy1,
    groupBySelection,
    isTreemapPanelExpanded,
    riskChartStackBy0,
    riskChartStackBy1,
    setAlertViewSelection,
    setCountTableStackBy0,
    setCountTableStackBy1,
    setGroupBySelection,
    setIsTreemapPanelExpanded,
    setRiskChartStackBy0,
    setRiskChartStackBy1,
    setTrendChartStackBy,
    trendChartStackBy,
  }: AlertsSettings = useAlertsLocalStorage();

  const updateCommonStackBy0 = useCallback(
    (value: string) => {
      setTrendChartStackBy(value);
      setCountTableStackBy0(value);
      setRiskChartStackBy0(value);
    },
    [setCountTableStackBy0, setRiskChartStackBy0, setTrendChartStackBy]
  );

  const updateCommonStackBy1 = useCallback(
    (value: string | undefined) => {
      setCountTableStackBy1(value);
      setRiskChartStackBy1(value);
    },
    [setCountTableStackBy1, setRiskChartStackBy1]
  );

  const {
    comboboxRef: stackByField0ComboboxRef,
    onReset: onResetStackByField0,
    setComboboxInputRef: setStackByField0ComboboxInputRef,
  } = useEuiComboBoxReset();

  const {
    comboboxRef: stackByField1ComboboxRef,
    onReset: onResetStackByField1,
    setComboboxInputRef: setStackByField1ComboboxInputRef,
  } = useEuiComboBoxReset();

  const onReset = useCallback(() => {
    onResetStackByField0();
    onResetStackByField1();
  }, [onResetStackByField0, onResetStackByField1]);

  const handleResetGroupByFieldAction = useCallback(() => {
    onReset();
    updateCommonStackBy0(DEFAULT_STACK_BY_FIELD);

    if (updateCommonStackBy1 != null) {
      updateCommonStackBy1(DEFAULT_STACK_BY_FIELD1);
    }
  }, [onReset, updateCommonStackBy0, updateCommonStackBy1]);

  const resetGroupByFieldAction = useMemo(
    () => [createResetGroupByFieldAction({ callback: handleResetGroupByFieldAction, order: 5 })],
    [handleResetGroupByFieldAction]
  );

  const chartOptionsContextMenu = useCallback(
    (queryId: string) => (
      <ChartContextMenu
        defaultStackByField={DEFAULT_STACK_BY_FIELD}
        defaultStackByField1={DEFAULT_STACK_BY_FIELD1}
        onReset={onReset}
        queryId={queryId}
        setStackBy={updateCommonStackBy0}
        setStackByField1={updateCommonStackBy1}
      />
    ),
    [onReset, updateCommonStackBy0, updateCommonStackBy1]
  );

  const title = useMemo(() => {
    if (isAlertsPageChartsEnabled) {
      return isExpanded ? (
        <ChartSelectContainer>
          <ChartSelect
            alertViewSelection={alertViewSelection}
            setAlertViewSelection={setAlertViewSelection}
          />
        </ChartSelectContainer>
      ) : (
        <ChartCollapse
          groupBySelection={groupBySelection}
          filters={alertsDefaultFilters}
          query={query}
          signalIndexName={signalIndexName}
          runtimeMappings={runtimeMappings}
        />
      );
    } else {
      return (
        <ChartSelectContainer>
          <ChartSelect
            alertViewSelection={alertViewSelection}
            setAlertViewSelection={setAlertViewSelection}
          />
        </ChartSelectContainer>
      );
    }
  }, [
    alertViewSelection,
    setAlertViewSelection,
    isAlertsPageChartsEnabled,
    isExpanded,
    groupBySelection,
    alertsDefaultFilters,
    query,
    signalIndexName,
    runtimeMappings,
  ]);

  return (
    <div data-test-subj="chartPanels">
      {alertViewSelection === 'trend' && (
        <FullHeightFlexItem grow={2}>
          {isLoadingIndexPattern ? (
            <EuiSkeletonText lines={10} data-test-subj="trendLoadingSpinner" />
          ) : (
            <AlertsHistogramPanel
              alignHeader="flexStart"
              chartHeight={TREND_CHART_HEIGHT}
              comboboxRef={stackByField0ComboboxRef}
              defaultStackByOption={trendChartStackBy}
              extraActions={resetGroupByFieldAction}
              filters={alertsDefaultFilters}
              inspectTitle={i18n.TREND}
              onFieldSelected={updateCommonStackBy0}
              panelHeight={CHART_PANEL_HEIGHT}
              setComboboxInputRef={setStackByField0ComboboxInputRef}
              showGroupByPlaceholder={false}
              showTotalAlertsCount={false}
              signalIndexName={signalIndexName}
              stackByLabel={GROUP_BY_LABEL}
              title={title}
              titleSize={'s'}
              updateDateRange={updateDateRangeCallback}
              isExpanded={isExpanded}
              setIsExpanded={setIsExpanded}
            />
          )}
        </FullHeightFlexItem>
      )}

      {alertViewSelection === 'table' && (
        <FullHeightFlexItem grow={1}>
          {isLoadingIndexPattern ? (
            <EuiSkeletonText lines={10} data-test-subj="tableLoadingSpinner" />
          ) : (
            <AlertsCountPanel
              alignHeader="flexStart"
              chartOptionsContextMenu={chartOptionsContextMenu}
              extraActions={resetGroupByFieldAction}
              filters={alertsDefaultFilters}
              inspectTitle={isAlertsPageChartsEnabled ? i18n.COUNTS : i18n.TABLE}
              panelHeight={CHART_PANEL_HEIGHT}
              runtimeMappings={runtimeMappings}
              setStackByField0={updateCommonStackBy0}
              setStackByField0ComboboxInputRef={setStackByField0ComboboxInputRef}
              setStackByField1={updateCommonStackBy1}
              setStackByField1ComboboxInputRef={setStackByField1ComboboxInputRef}
              signalIndexName={signalIndexName}
              stackByField0={countTableStackBy0}
              stackByField0ComboboxRef={stackByField0ComboboxRef}
              stackByField1={countTableStackBy1}
              stackByField1ComboboxRef={stackByField1ComboboxRef}
              title={title}
              isExpanded={isExpanded}
              setIsExpanded={setIsExpanded}
            />
          )}
        </FullHeightFlexItem>
      )}

      {alertViewSelection === 'treemap' && (
        <FullHeightFlexItem grow={1}>
          {isLoadingIndexPattern ? (
            <EuiSkeletonText lines={10} data-test-subj="treemapLoadingSpinner" />
          ) : (
            <AlertsTreemapPanel
              addFilter={addFilter}
              alignHeader="flexStart"
              chartOptionsContextMenu={chartOptionsContextMenu}
              height={CHART_PANEL_HEIGHT}
              inspectTitle={i18n.TREEMAP}
              isPanelExpanded={isAlertsPageChartsEnabled ? isExpanded : isTreemapPanelExpanded}
              filters={alertsDefaultFilters}
              query={query}
              riskSubAggregationField="kibana.alert.risk_score"
              setIsPanelExpanded={
                isAlertsPageChartsEnabled ? setIsExpanded : setIsTreemapPanelExpanded
              }
              setStackByField0={updateCommonStackBy0}
              setStackByField0ComboboxInputRef={setStackByField0ComboboxInputRef}
              setStackByField1={updateCommonStackBy1}
              setStackByField1ComboboxInputRef={setStackByField1ComboboxInputRef}
              signalIndexName={signalIndexName}
              stackByField0={riskChartStackBy0}
              stackByField0ComboboxRef={stackByField0ComboboxRef}
              stackByField1={riskChartStackBy1}
              stackByField1ComboboxRef={stackByField1ComboboxRef}
              title={title}
            />
          )}
        </FullHeightFlexItem>
      )}

      {isAlertsPageChartsEnabled && alertViewSelection === 'charts' && (
        <FullHeightFlexItem grow={1}>
          {isLoadingIndexPattern ? (
            <EuiSkeletonText lines={10} data-test-subj="chartsLoadingSpinner" />
          ) : (
            <AlertsSummaryChartsPanel
              alignHeader="flexStart"
              addFilter={addFilter}
              filters={alertsDefaultFilters}
              query={query}
              panelHeight={CHART_PANEL_HEIGHT}
              signalIndexName={signalIndexName}
              title={title}
              runtimeMappings={runtimeMappings}
              isExpanded={isExpanded}
              setIsExpanded={setIsExpanded}
              groupBySelection={groupBySelection}
              setGroupBySelection={setGroupBySelection}
            />
          )}
        </FullHeightFlexItem>
      )}
    </div>
  );
};

export const ChartPanels = React.memo(ChartPanelsComponent);
