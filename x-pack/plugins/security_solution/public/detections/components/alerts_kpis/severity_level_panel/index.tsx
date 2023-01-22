/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiPanel } from '@elastic/eui';
import React, { useMemo } from 'react';
import uuid from 'uuid';
import type { ChartsPanelProps } from '../alerts_summary_charts_panel/types';
import type { SeverityBuckets as SeverityData } from '../../../../overview/components/detection_response/alerts_by_status/types';
import { HeaderSection } from '../../../../common/components/header_section';
import { InspectButtonContainer } from '../../../../common/components/inspect';
import { useSummaryChartData } from '../alerts_summary_charts_panel/use_summary_chart_data';
import { severityAggregations } from '../alerts_summary_charts_panel/aggregations';
import { SeverityLevelChart } from './severity_level_chart';
import * as i18n from './translations';

const SEVERITY_DONUT_CHART_ID = 'alerts-summary-severity-donut';

export const SeverityLevelPanel: React.FC<ChartsPanelProps> = ({
  filters,
  query,
  signalIndexName,
  runtimeMappings,
  addFilter,
  skip,
}) => {
  const uniqueQueryId = useMemo(() => `${SEVERITY_DONUT_CHART_ID}-${uuid.v4()}`, []);

  const { items, isLoading } = useSummaryChartData({
    aggregationType: 'Severity',
    aggregations: severityAggregations,
    filters,
    query,
    signalIndexName,
    runtimeMappings,
    skip,
    uniqueQueryId,
  });

  return (
    <InspectButtonContainer>
      <EuiPanel hasBorder hasShadow={false} data-test-subj="severty-level-panel">
        <HeaderSection
          id={uniqueQueryId}
          inspectTitle={i18n.SEVERITY_LEVELS_TITLE}
          outerDirection="row"
          title={i18n.SEVERITY_LEVELS_TITLE}
          titleSize="xs"
          hideSubtitle
        />
        <SeverityLevelChart
          items={items as SeverityData[]}
          isLoading={isLoading}
          addFilter={addFilter}
        />
      </EuiPanel>
    </InspectButtonContainer>
  );
};

SeverityLevelPanel.displayName = 'SeverityLevelPanel';
