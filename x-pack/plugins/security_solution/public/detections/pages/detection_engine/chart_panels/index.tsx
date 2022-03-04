/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MappingRuntimeFields } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type { Filter, Query } from '@kbn/es-query';
import { EuiFlexItem, EuiLoadingSpinner } from '@elastic/eui';
import React, { useCallback, useMemo } from 'react';
import styled from 'styled-components';

import { ChartContextMenu } from '../chart_context_menu';
import { AlertsTreemapPanel } from '../../../../common/components/alerts_treemap';
import { UpdateDateRange } from '../../../../common/components/charts/common';
import { AlertsHistogramPanel } from '../../../components/alerts_kpis/alerts_histogram_panel';
import {
  CHART_HEIGHT,
  DEFAULT_STACK_BY_FIELD,
  DEFAULT_STACK_BY_FIELD1,
} from '../../../components/alerts_kpis/common/config';
import { AlertsCountPanel } from '../../../components/alerts_kpis/alerts_count_panel';

const AlertsCountPanelFlexItem = styled(EuiFlexItem)`
  margin-left: ${({ theme }) => theme.eui.euiSizeM};
`;

const FullHeightFlexItem = styled(EuiFlexItem)`
  height: 100%;
`;

export interface Props {
  addFilter: ({ field, value }: { field: string; value: string | number }) => void;
  alertsHistogramDefaultFilters: Filter[];
  countTableStackBy0: string;
  countTableStackBy1: string | undefined;
  expandRiskChart: boolean;
  isLoadingIndexPattern: boolean;
  query: Query;
  riskChartStackBy0: string;
  riskChartStackBy1: string | undefined;
  runtimeMappings: MappingRuntimeFields;
  setCountTableStackBy0: (value: string) => void;
  setCountTableStackBy1: (value: string | undefined) => void;
  setExpandRiskChart: (value: boolean) => void;
  setRiskChartStackBy0: (value: string) => void;
  setRiskChartStackBy1: (value: string | undefined) => void;
  setShowCountsInTrendChartLegend: (value: boolean) => void;
  setTrendChartStackBy: (value: string) => void;
  signalIndexName: string | null;
  showCountsInTrendChartLegend: boolean;
  showCountTable: boolean;
  showRiskChart: boolean;
  showTrendChart: boolean;
  trendChartStackBy: string;
  updateDateRangeCallback: UpdateDateRange;
}

const ChartPanelsComponent = ({
  addFilter,
  alertsHistogramDefaultFilters,
  countTableStackBy0,
  countTableStackBy1,
  expandRiskChart,
  isLoadingIndexPattern,
  query,
  riskChartStackBy0,
  riskChartStackBy1,
  runtimeMappings,
  setCountTableStackBy0,
  setCountTableStackBy1,
  setExpandRiskChart,
  setRiskChartStackBy0,
  setRiskChartStackBy1,
  setShowCountsInTrendChartLegend,
  setTrendChartStackBy,
  signalIndexName,
  showCountsInTrendChartLegend,
  showCountTable,
  showRiskChart,
  showTrendChart,
  trendChartStackBy,
  updateDateRangeCallback,
}: Props) => {
  const updateCommonStackBy0 = useCallback(
    (value: string) => {
      setCountTableStackBy0(value);
      setRiskChartStackBy0(value);
    },
    [setCountTableStackBy0, setRiskChartStackBy0]
  );

  const updateCommonStackBy1 = useCallback(
    (value: string | undefined) => {
      setCountTableStackBy1(value);
      setRiskChartStackBy1(value);
    },
    [setCountTableStackBy1, setRiskChartStackBy1]
  );

  const CountTableContextMenu = useMemo(
    () => (
      <ChartContextMenu
        defaultStackByField={DEFAULT_STACK_BY_FIELD}
        defaultStackByField1={DEFAULT_STACK_BY_FIELD1}
        setStackBy={updateCommonStackBy0}
        setStackByField1={updateCommonStackBy1}
      />
    ),
    [updateCommonStackBy0, updateCommonStackBy1]
  );

  const RiskChartContextMenu = useMemo(
    () => (
      <ChartContextMenu
        defaultStackByField={DEFAULT_STACK_BY_FIELD}
        defaultStackByField1={DEFAULT_STACK_BY_FIELD1}
        setStackBy={updateCommonStackBy0}
        setStackByField1={updateCommonStackBy1}
      />
    ),
    [updateCommonStackBy0, updateCommonStackBy1]
  );

  const TrendChartContextMenu = useMemo(
    () => (
      <ChartContextMenu
        defaultStackByField={DEFAULT_STACK_BY_FIELD}
        setShowCountsInChartLegend={setShowCountsInTrendChartLegend}
        setStackBy={setTrendChartStackBy}
        showCountsInChartLegend={showCountsInTrendChartLegend}
      />
    ),
    [setShowCountsInTrendChartLegend, setTrendChartStackBy, showCountsInTrendChartLegend]
  );

  return (
    <>
      {showTrendChart && (
        <FullHeightFlexItem grow={2}>
          {isLoadingIndexPattern ? (
            <EuiLoadingSpinner size="xl" />
          ) : (
            <AlertsHistogramPanel
              chartHeight={CHART_HEIGHT}
              chartOptionsContextMenu={TrendChartContextMenu}
              defaultStackByOption={trendChartStackBy}
              filters={alertsHistogramDefaultFilters}
              onFieldSelected={setTrendChartStackBy}
              query={query}
              showCountsInLegend={showCountsInTrendChartLegend}
              showTotalAlertsCount={false}
              titleSize={'s'}
              signalIndexName={signalIndexName}
              updateDateRange={updateDateRangeCallback}
              runtimeMappings={runtimeMappings}
            />
          )}
        </FullHeightFlexItem>
      )}

      {showCountTable && (
        <AlertsCountPanelFlexItem grow={1}>
          {isLoadingIndexPattern ? (
            <EuiLoadingSpinner size="xl" />
          ) : (
            <AlertsCountPanel
              chartOptionsContextMenu={CountTableContextMenu}
              filters={alertsHistogramDefaultFilters}
              query={query}
              setStackByField0={updateCommonStackBy0}
              setStackByField1={updateCommonStackBy1}
              signalIndexName={signalIndexName}
              stackByField0={countTableStackBy0}
              stackByField1={countTableStackBy1}
              runtimeMappings={runtimeMappings}
            />
          )}
        </AlertsCountPanelFlexItem>
      )}

      {showRiskChart && (
        <FullHeightFlexItem grow={1}>
          <AlertsTreemapPanel
            addFilter={addFilter}
            chartOptionsContextMenu={RiskChartContextMenu}
            expandRiskChart={expandRiskChart}
            filters={alertsHistogramDefaultFilters}
            query={query}
            setExpandRiskChart={setExpandRiskChart}
            setStackByField0={updateCommonStackBy0}
            setStackByField1={updateCommonStackBy1}
            signalIndexName={signalIndexName}
            stackByField0={riskChartStackBy0}
            stackByField1={riskChartStackBy1}
            riskSubAggregationField="signal.rule.risk_score" // TODO: 'kibana.alert.rule.risk_score' returns no values
            runtimeMappings={runtimeMappings}
          />
        </FullHeightFlexItem>
      )}
    </>
  );
};

export const ChartPanels = React.memo(ChartPanelsComponent);
