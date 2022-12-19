/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiFlexGroup } from '@elastic/eui';
import React, { useMemo, useCallback, useState, useEffect } from 'react';
import type { MappingRuntimeFields } from '@elastic/elasticsearch/lib/api/types';
import type { Filter, Query } from '@kbn/es-query';
import styled from 'styled-components';
import uuid from 'uuid';
import * as i18n from './translations';
import { KpiPanel } from '../common/components';
import { HeaderSection } from '../../../../common/components/header_section';
import { useQueryToggle } from '../../../../common/containers/query_toggle';
import { SeverityLevelChart } from './severity_donut/severity_level_chart';
import { DetectionsTable } from './detections_table/detections_table';
import { HostPieChart } from './host_pie_chart/host_pie_chart';
import { useSummaryChartData } from './use_summary_chart_data';
import { aggregations } from './use_summary_chart_data/aggregations';

const DETECTIONS_ALERTS_CHARTS_ID = 'detections-alerts-charts';
const DETECTIONS_TABLE_ID = 'alerts-summary-detections-table';
const SEVERITY_DONUT_CHART_ID = 'alerts-summary-severity-donut';
const HOST_PIE_CHART_ID = 'alerts-summary-host-pie-chart';

interface Props {
  alignHeader?: 'center' | 'baseline' | 'stretch' | 'flexStart' | 'flexEnd';
  filters?: Filter[];
  addFilter?: ({ field, value }: { field: string; value: string | number }) => void;
  panelHeight?: number;
  query?: Query;
  signalIndexName: string | null;
  title?: React.ReactNode;
  runtimeMappings?: MappingRuntimeFields;
}

export const AlertsSummaryChartsPanel: React.FC<Props> = ({
  alignHeader,
  filters,
  addFilter,
  panelHeight = 330,
  query,
  runtimeMappings,
  signalIndexName,
  title = i18n.CHARTS_TITLE,
}: Props) => {
  const Wrapper = styled.div`
    margin-top: -${({ theme }) => theme.eui.euiSizeS};
    @media only screen and (min-width: ${({ theme }) => theme.eui.euiBreakpoints.l}) {
      ${() => `height: ${panelHeight}px;`}
    }
  `;

  const { toggleStatus, setToggleStatus } = useQueryToggle(DETECTIONS_ALERTS_CHARTS_ID);
  const [querySkip, setQuerySkip] = useState(!toggleStatus);
  useEffect(() => {
    setQuerySkip(!toggleStatus);
  }, [toggleStatus]);
  const toggleQuery = useCallback(
    (status: boolean) => {
      setToggleStatus(status);
      // toggle on = skipQuery false
      setQuerySkip(!status);
    },
    [setQuerySkip, setToggleStatus]
  );

  // create a unique, but stable (across re-renders) query id
  const uniqueDetectionsQueryId = useMemo(() => `${DETECTIONS_TABLE_ID}-${uuid.v4()}`, []);
  const uniqueSeverityQueryId = useMemo(() => `${SEVERITY_DONUT_CHART_ID}-${uuid.v4()}`, []);
  const uniqueHostsQueryId = useMemo(() => `${HOST_PIE_CHART_ID}-${uuid.v4()}`, []);

  const { items: detectionsData, isLoading: isDetectionsLoading } = useSummaryChartData({
    aggregationType: 'Detections',
    aggregations: aggregations.detections,
    filters,
    query,
    signalIndexName,
    runtimeMappings,
    skip: querySkip,
    uniqueQueryId: uniqueDetectionsQueryId,
  });

  const { items: severityData, isLoading: isSeverityLoading } = useSummaryChartData({
    aggregationType: 'Severity',
    aggregations: aggregations.severity,
    filters,
    query,
    signalIndexName,
    runtimeMappings,
    skip: querySkip,
    uniqueQueryId: uniqueSeverityQueryId,
  });

  const { items: hostData, isLoading: isHostsLoading } = useSummaryChartData({
    aggregationType: 'Host',
    aggregations: aggregations.host,
    filters,
    query,
    signalIndexName,
    runtimeMappings,
    skip: querySkip,
    uniqueQueryId: uniqueHostsQueryId,
  });

  return (
    <KpiPanel
      $toggleStatus={toggleStatus}
      data-test-subj="alerts-charts-panel"
      hasBorder
      height={panelHeight}
    >
      <HeaderSection
        alignHeader={alignHeader}
        outerDirection="row"
        title={title}
        titleSize="s"
        hideSubtitle
        showInspectButton={false}
        toggleStatus={toggleStatus}
        toggleQuery={toggleQuery}
      />
      {toggleStatus && (
        <Wrapper className="eui-yScroll">
          <EuiFlexGroup data-test-subj="alerts-charts-container" wrap>
            <DetectionsTable
              data={detectionsData}
              isLoading={isDetectionsLoading}
              uniqueQueryId={uniqueDetectionsQueryId}
            />
            <SeverityLevelChart
              data={severityData}
              isLoading={isSeverityLoading}
              uniqueQueryId={uniqueSeverityQueryId}
              addFilter={addFilter}
            />
            <HostPieChart
              data={hostData}
              isLoading={isHostsLoading}
              uniqueQueryId={uniqueHostsQueryId}
              addFilter={addFilter}
            />
          </EuiFlexGroup>
        </Wrapper>
      )}
    </KpiPanel>
  );
};

AlertsSummaryChartsPanel.displayName = 'AlertsSummaryChartsPanel';
