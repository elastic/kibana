/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MappingRuntimeFields } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type { ActionExecutionContext } from '@kbn/ui-actions-plugin/public';
import type { Filter, Query } from '@kbn/es-query';
import { EuiFlexItem, EuiLoadingContent, EuiLoadingSpinner } from '@elastic/eui';
import React, { useCallback, useMemo } from 'react';
import styled from 'styled-components';

import { useIsExperimentalFeatureEnabled } from '../../../../common/hooks/use_experimental_features';
import { useAlertsLocalStorage } from './alerts_local_storage';
import type { AlertsSettings } from './alerts_local_storage/types';
import { ChartContextMenu } from './chart_context_menu';
import { ChartSelect } from './chart_select';
import * as i18n from './chart_select/translations';
import { AlertsTreemapPanel } from '../../../../common/components/alerts_treemap_panel';
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
import { RESET_GROUP_BY_FIELDS } from '../../../../common/components/chart_settings_popover/configurations/default/translations';

const TABLE_PANEL_HEIGHT = 330; // px
const TRENT_CHART_HEIGHT = 127; // px
const TREND_CHART_PANEL_HEIGHT = 256; // px
const ALERTS_CHARTS_PANEL_HEIGHT = 330; // px

const FullHeightFlexItem = styled(EuiFlexItem)`
  height: 100%;
`;

const ChartSelectContainer = styled.div`
  margin-left: ${({ theme }) => theme.eui.euiSizeS};
`;

export interface Props {
  addFilter: ({ field, value }: { field: string; value: string | number }) => void;
  alertsHistogramDefaultFilters: Filter[];
  isLoadingIndexPattern: boolean;
  query: Query;
  runtimeMappings: MappingRuntimeFields;
  signalIndexName: string | null;
  updateDateRangeCallback: UpdateDateRange;
}

const ChartPanelsComponent: React.FC<Props> = ({
  addFilter,
  alertsHistogramDefaultFilters,
  isLoadingIndexPattern,
  query,
  runtimeMappings,
  signalIndexName,
  updateDateRangeCallback,
}: Props) => {
  const {
    alertViewSelection,
    countTableStackBy0,
    countTableStackBy1,
    isTreemapPanelExpanded,
    riskChartStackBy0,
    riskChartStackBy1,
    setAlertViewSelection,
    setCountTableStackBy0,
    setCountTableStackBy1,
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

  const resetGroupByFieldAction = useMemo(
    () => [
      {
        id: 'resetGroupByField',

        getDisplayName(context: ActionExecutionContext<object>): string {
          return RESET_GROUP_BY_FIELDS;
        },
        getIconType(context: ActionExecutionContext<object>): string | undefined {
          return 'editorRedo';
        },
        type: 'actionButton',
        async isCompatible(context: ActionExecutionContext<object>): Promise<boolean> {
          return true;
        },
        async execute(context: ActionExecutionContext<object>): Promise<void> {
          onReset();
          updateCommonStackBy0(DEFAULT_STACK_BY_FIELD);

          if (updateCommonStackBy1 != null) {
            updateCommonStackBy1(DEFAULT_STACK_BY_FIELD1);
          }
        },
        order: 5,
      },
    ],
    [onReset, updateCommonStackBy0, updateCommonStackBy1]
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

  const title = useMemo(
    () => (
      <ChartSelectContainer>
        <ChartSelect
          alertViewSelection={alertViewSelection}
          setAlertViewSelection={setAlertViewSelection}
        />
      </ChartSelectContainer>
    ),
    [alertViewSelection, setAlertViewSelection]
  );
  const isAlertsPageChartsEnabled = useIsExperimentalFeatureEnabled('alertsPageChartsEnabled');

  return (
    <div data-test-subj="chartPanels">
      {alertViewSelection === 'trend' && (
        <FullHeightFlexItem grow={2}>
          {isLoadingIndexPattern ? (
            <EuiLoadingContent lines={10} data-test-subj="trendLoadingSpinner" />
          ) : (
            <AlertsHistogramPanel
              alignHeader="flexStart"
              chartHeight={TRENT_CHART_HEIGHT}
              chartOptionsContextMenu={chartOptionsContextMenu}
              comboboxRef={stackByField0ComboboxRef}
              defaultStackByOption={trendChartStackBy}
              extraActions={resetGroupByFieldAction}
              filters={alertsHistogramDefaultFilters}
              inspectTitle={i18n.TREND}
              onFieldSelected={updateCommonStackBy0}
              panelHeight={TREND_CHART_PANEL_HEIGHT}
              query={query}
              runtimeMappings={runtimeMappings}
              setComboboxInputRef={setStackByField0ComboboxInputRef}
              showCountsInLegend={true}
              showGroupByPlaceholder={false}
              showTotalAlertsCount={false}
              signalIndexName={signalIndexName}
              stackByLabel={GROUP_BY_LABEL}
              title={title}
              titleSize={'s'}
              updateDateRange={updateDateRangeCallback}
            />
          )}
        </FullHeightFlexItem>
      )}

      {alertViewSelection === 'table' && (
        <FullHeightFlexItem grow={1}>
          {isLoadingIndexPattern ? (
            <EuiLoadingContent lines={10} data-test-subj="tableLoadingSpinner" />
          ) : (
            <AlertsCountPanel
              alignHeader="flexStart"
              chartOptionsContextMenu={chartOptionsContextMenu}
              extraActions={resetGroupByFieldAction}
              filters={alertsHistogramDefaultFilters}
              inspectTitle={i18n.TABLE}
              panelHeight={TABLE_PANEL_HEIGHT}
              query={query}
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
            />
          )}
        </FullHeightFlexItem>
      )}

      {alertViewSelection === 'treemap' && (
        <FullHeightFlexItem grow={1}>
          {isLoadingIndexPattern ? (
            <EuiLoadingContent lines={10} data-test-subj="treemapLoadingSpinner" />
          ) : (
            <AlertsTreemapPanel
              addFilter={addFilter}
              alignHeader="flexStart"
              chartOptionsContextMenu={chartOptionsContextMenu}
              filters={alertsHistogramDefaultFilters}
              inspectTitle={i18n.TREEMAP}
              isPanelExpanded={isTreemapPanelExpanded}
              query={query}
              riskSubAggregationField="kibana.alert.risk_score"
              runtimeMappings={runtimeMappings}
              setIsPanelExpanded={setIsTreemapPanelExpanded}
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
            <EuiLoadingSpinner data-test-subj="alertsChartsLoadingSpinner" size="xl" />
          ) : (
            <AlertsSummaryChartsPanel
              alignHeader="flexStart"
              addFilter={addFilter}
              filters={alertsHistogramDefaultFilters}
              query={query}
              panelHeight={ALERTS_CHARTS_PANEL_HEIGHT}
              signalIndexName={signalIndexName}
              title={title}
              runtimeMappings={runtimeMappings}
            />
          )}
        </FullHeightFlexItem>
      )}
    </div>
  );
};

export const ChartPanels = React.memo(ChartPanelsComponent);
