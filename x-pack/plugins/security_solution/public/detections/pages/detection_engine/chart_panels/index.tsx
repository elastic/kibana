/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MappingRuntimeFields } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type { Filter, Query } from '@kbn/es-query';
import { EuiFlexItem, EuiLoadingSpinner } from '@elastic/eui';
import React, { useCallback, useMemo } from 'react';
import styled from 'styled-components';

import { useAlertsLocalStorage } from './alerts_local_storage';
import type { AlertsSettings } from './alerts_local_storage/types';
import { ChartContextMenu } from './chart_context_menu';
import { ChartSelect } from './chart_select';
import { AlertsTreemapPanel } from '../../../../common/components/alerts_treemap_panel';
import type { UpdateDateRange } from '../../../../common/components/charts/common';
import { AlertsHistogramPanel } from '../../../components/alerts_kpis/alerts_histogram_panel';
import {
  DEFAULT_STACK_BY_FIELD,
  DEFAULT_STACK_BY_FIELD1,
} from '../../../components/alerts_kpis/common/config';
import { AlertsCountPanel } from '../../../components/alerts_kpis/alerts_count_panel';
import { GROUP_BY_LABEL } from '../../../components/alerts_kpis/common/translations';

const TABLE_PANEL_HEIGHT = 330; // px
const TRENT_CHART_HEIGHT = 127; // px
const TREND_CHART_PANEL_HEIGHT = 256; // px

const AlertsCountPanelFlexItem = styled(EuiFlexItem)`
  margin-left: ${({ theme }) => theme.eui.euiSizeM};
`;

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

  const chartOptionsContextMenu = useCallback(
    (queryId: string) => (
      <ChartContextMenu
        defaultStackByField={DEFAULT_STACK_BY_FIELD}
        defaultStackByField1={DEFAULT_STACK_BY_FIELD1}
        queryId={queryId}
        setStackBy={updateCommonStackBy0}
        setStackByField1={updateCommonStackBy1}
      />
    ),
    [updateCommonStackBy0, updateCommonStackBy1]
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

  return (
    <div data-test-subj="chartPanels">
      {alertViewSelection === 'trend' && (
        <FullHeightFlexItem grow={2}>
          {isLoadingIndexPattern ? (
            <EuiLoadingSpinner data-test-subj="trendLoadingSpinner" size="xl" />
          ) : (
            <AlertsHistogramPanel
              alignHeader="flexStart"
              chartHeight={TRENT_CHART_HEIGHT}
              chartOptionsContextMenu={chartOptionsContextMenu}
              defaultStackByOption={trendChartStackBy}
              filters={alertsHistogramDefaultFilters}
              onFieldSelected={updateCommonStackBy0}
              panelHeight={TREND_CHART_PANEL_HEIGHT}
              query={query}
              showCountsInLegend={true}
              showGroupByPlaceholder={true}
              showTotalAlertsCount={false}
              stackByLabel={GROUP_BY_LABEL}
              title={title}
              titleSize={'s'}
              signalIndexName={signalIndexName}
              updateDateRange={updateDateRangeCallback}
              runtimeMappings={runtimeMappings}
            />
          )}
        </FullHeightFlexItem>
      )}

      {alertViewSelection === 'table' && (
        <AlertsCountPanelFlexItem grow={1}>
          {isLoadingIndexPattern ? (
            <EuiLoadingSpinner data-test-subj="tableLoadingSpinner" size="xl" />
          ) : (
            <AlertsCountPanel
              alignHeader="flexStart"
              chartOptionsContextMenu={chartOptionsContextMenu}
              filters={alertsHistogramDefaultFilters}
              panelHeight={TABLE_PANEL_HEIGHT}
              query={query}
              runtimeMappings={runtimeMappings}
              setStackByField0={updateCommonStackBy0}
              setStackByField1={updateCommonStackBy1}
              signalIndexName={signalIndexName}
              stackByField0={countTableStackBy0}
              stackByField1={countTableStackBy1}
              title={title}
            />
          )}
        </AlertsCountPanelFlexItem>
      )}

      {alertViewSelection === 'treemap' && (
        <FullHeightFlexItem grow={1}>
          {isLoadingIndexPattern ? (
            <EuiLoadingSpinner data-test-subj="treemapLoadingSpinner" size="xl" />
          ) : (
            <AlertsTreemapPanel
              addFilter={addFilter}
              alignHeader="flexStart"
              chartOptionsContextMenu={chartOptionsContextMenu}
              isPanelExpanded={isTreemapPanelExpanded}
              filters={alertsHistogramDefaultFilters}
              query={query}
              setIsPanelExpanded={setIsTreemapPanelExpanded}
              setStackByField0={updateCommonStackBy0}
              setStackByField1={updateCommonStackBy1}
              signalIndexName={signalIndexName}
              stackByField0={riskChartStackBy0}
              stackByField1={riskChartStackBy1}
              title={title}
              riskSubAggregationField="kibana.alert.risk_score"
              runtimeMappings={runtimeMappings}
            />
          )}
        </FullHeightFlexItem>
      )}
    </div>
  );
};

export const ChartPanels = React.memo(ChartPanelsComponent);
