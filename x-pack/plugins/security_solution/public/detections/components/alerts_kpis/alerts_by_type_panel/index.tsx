/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiPanel } from '@elastic/eui';
import React, { useMemo } from 'react';
import { v4 as uuid } from 'uuid';
import type { ChartsPanelProps } from '../alerts_summary_charts_panel/types';
import { AlertsByType } from './alerts_by_type';
import { HeaderSection } from '../../../../common/components/header_section';
import { InspectButtonContainer } from '../../../../common/components/inspect';
import { useSummaryChartData } from '../alerts_summary_charts_panel/use_summary_chart_data';
import { alertTypeAggregations } from '../alerts_summary_charts_panel/aggregations';
import { isAlertsTypeData } from './helpers';
import * as i18n from './translations';

const ALERTS_BY_TYPE_CHART_ID = 'alerts-summary-alert_by_type';

export const AlertsByTypePanel: React.FC<ChartsPanelProps> = ({
  filters,
  query,
  signalIndexName,
  runtimeMappings,
  skip,
}) => {
  const uniqueQueryId = useMemo(() => `${ALERTS_BY_TYPE_CHART_ID}-${uuid()}`, []);

  const { items, isLoading } = useSummaryChartData({
    aggregationType: 'Type',
    aggregations: alertTypeAggregations,
    filters,
    query,
    signalIndexName,
    runtimeMappings,
    skip,
    uniqueQueryId,
  });
  const data = useMemo(() => (isAlertsTypeData(items) ? items : []), [items]);

  return (
    <InspectButtonContainer>
      <EuiPanel hasBorder hasShadow={false} data-test-subj="alerts-by-type-panel">
        <HeaderSection
          id={uniqueQueryId}
          inspectTitle={i18n.ALERTS_TYPE_TITLE}
          outerDirection="row"
          title={i18n.ALERTS_TYPE_TITLE}
          titleSize="xs"
          hideSubtitle
        />
        <AlertsByType data={data} isLoading={isLoading} />
      </EuiPanel>
    </InspectButtonContainer>
  );
};

AlertsByTypePanel.displayName = 'AlertsByTypePanel';
