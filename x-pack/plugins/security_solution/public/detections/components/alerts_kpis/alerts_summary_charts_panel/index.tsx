/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiPanel, EuiTitle } from '@elastic/eui';
import React, { useMemo, useCallback, useState, useEffect } from 'react';
import type { MappingRuntimeFields } from '@elastic/elasticsearch/lib/api/types';
import type { Filter, Query } from '@kbn/es-query';
import { v4 as uuidv4 } from 'uuid';
import * as i18n from './translations';
import { KpiPanel } from '../common/components';
import { HeaderSection } from '../../../../common/components/header_section';
import { useQueryToggle } from '../../../../common/containers/query_toggle';
import { useSeverityChartData } from './severity_donut/use_severity_chart_data';
import { SeverityLevelChart } from './severity_donut/severity_level_chart';

const DETECTIONS_ALERTS_CHARTS_ID = 'detections-alerts-charts';

const PlaceHolder = ({ title }: { title: string }) => {
  return (
    <EuiFlexItem>
      <EuiPanel>
        <EuiTitle size="xs">
          <h4>{title}</h4>
        </EuiTitle>
      </EuiPanel>
    </EuiFlexItem>
  );
};

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
  const uniqueQueryId = useMemo(() => `${DETECTIONS_ALERTS_CHARTS_ID}-${uuidv4()}`, []);

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
          <PlaceHolder title={i18n.DETECTIONS_TITLE} />
          <SeverityLevelChart
            data={severityData}
            isLoading={isSeverityLoading}
            uniqueQueryId={uniqueQueryId}
            addFilter={addFilter}
          />
          <PlaceHolder title={i18n.ALERT_BY_HOST_TITLE} />
        </EuiFlexGroup>
      )}
    </KpiPanel>
  );
};

AlertsSummaryChartsPanel.displayName = 'AlertsSummaryChartsPanel';
