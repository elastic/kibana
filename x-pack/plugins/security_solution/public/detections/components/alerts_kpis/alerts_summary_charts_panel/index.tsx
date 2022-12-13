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
import uuid from 'uuid';
import * as i18n from './translations';
import { KpiPanel } from '../common/components';
import { HeaderSection } from '../../../../common/components/header_section';
import { useQueryToggle } from '../../../../common/containers/query_toggle';
import { useSeverityChartData } from './severity_donut/use_severity_chart_data';
import { SeverityLevelChart } from './severity_donut/severity_level_chart';
import { DetectionsTable } from './detections_table/detections_table';
import { HostPieChart } from './host_pie_chart/host_name_pie_chart';
import { useHostNameChartData } from './host_pie_chart/use_host_name_chart_data';
import { useDetectionsChartData } from './detections_table/use_detections_chart_data';

const DETECTIONS_ALERTS_CHARTS_ID = 'detections-alerts-charts';

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
  // create a unique, but stable (across re-renders) query id
  const uniqueQueryId = useMemo(() => `${DETECTIONS_ALERTS_CHARTS_ID}-${uuid.v4()}`, []);

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

  const { items: severityData, isLoading: isSeverityLoading } = useSeverityChartData({
    filters,
    query,
    signalIndexName,
    runtimeMappings,
    skip: querySkip,
    uniqueQueryId,
  });

  const { items: detectionsData, isLoading: isDetectionsLoading } = useDetectionsChartData({
    filters,
    query,
    signalIndexName,
    runtimeMappings,
    skip: querySkip,
    uniqueQueryId,
  });

  const { items: hostData, isLoading: isHostsLoading } = useHostNameChartData({
    filters,
    query,
    signalIndexName,
    runtimeMappings,
    skip: querySkip,
    uniqueQueryId,
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
        <EuiFlexGroup data-test-subj="alerts-charts-container">
          <DetectionsTable
            data={detectionsData}
            isLoading={isDetectionsLoading}
            uniqueQueryId={uniqueQueryId}
          />
          {/* <PlaceHolder title={i18n.DETECTIONS_TITLE} /> */}
          <SeverityLevelChart
            data={severityData}
            isLoading={isSeverityLoading}
            uniqueQueryId={uniqueQueryId}
            addFilter={addFilter}
          />
          {/* <PlaceHolder title={i18n.ALERT_BY_HOST_TITLE} /> */}
          <HostPieChart
            data={hostData}
            isLoading={isHostsLoading}
            uniqueQueryId={uniqueQueryId}
            // addFilter={addFilter}
          />
        </EuiFlexGroup>
      )}
    </KpiPanel>
  );
};

AlertsSummaryChartsPanel.displayName = 'AlertsSummaryChartsPanel';
