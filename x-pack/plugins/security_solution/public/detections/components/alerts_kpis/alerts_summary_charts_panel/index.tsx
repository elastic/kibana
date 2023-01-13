/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
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
import { AlertsByType } from './alerts_by_type/alerts_by_type';
import { AlertsByHost } from './alerts_by_host/alerts_by_host';
import { useSummaryChartData } from './use_summary_chart_data';
import { aggregations } from './use_summary_chart_data/aggregations';

const DETECTIONS_ALERTS_CHARTS_ID = 'detections-alerts-charts';
const SEVERITY_DONUT_CHART_ID = 'alerts-summary-severity-donut';
const ALERTS_BY_TYPE_CHART_ID = 'alerts-summary-alert_by_type';
const ALERTS_BY_HOST_CHART_ID = 'alerts-summary-alert_by_host';

const StyledFlexGroup = styled(EuiFlexGroup)`
  @media only screen and (min-width: ${({ theme }) => theme.eui.euiBreakpoints.l})
`;

const StyledFlexItem = styled(EuiFlexItem)`
  min-width: 355px
`;
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
  panelHeight,
  query,
  runtimeMappings,
  signalIndexName,
  title = i18n.CHARTS_TITLE,
}: Props) => {
  
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
  const uniqueDetectionsQueryId = useMemo(() => `${ALERTS_BY_TYPE_CHART_ID}-${uuid.v4()}`, []);
  const uniqueHostsQueryId = useMemo(() => `${ALERTS_BY_HOST_CHART_ID}-${uuid.v4()}`, []);
  const uniqueSeverityQueryId = useMemo(() => `${SEVERITY_DONUT_CHART_ID}-${uuid.v4()}`, []);

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
            <StyledFlexGroup data-test-subj="alerts-charts-container"  className="eui-yScroll" wrap gutterSize='m'>
              <StyledFlexItem>
                <SeverityLevelChart
                  data={severityData}
                  isLoading={isSeverityLoading}
                  uniqueQueryId={uniqueSeverityQueryId}
                  addFilter={addFilter}
                />
              </StyledFlexItem>
              <StyledFlexItem>
                <AlertsByType
                  data={detectionsData}
                  isLoading={isDetectionsLoading}
                  uniqueQueryId={uniqueDetectionsQueryId}
                />
              </StyledFlexItem>
              <StyledFlexItem>
                <AlertsByHost
                  data={hostData}
                  isLoading={isHostsLoading}
                  uniqueQueryId={uniqueHostsQueryId}
                  addFilter={addFilter}
                />
              </StyledFlexItem>
          </StyledFlexGroup>
        )}
      </KpiPanel>
  );
};

AlertsSummaryChartsPanel.displayName = 'AlertsSummaryChartsPanel';
