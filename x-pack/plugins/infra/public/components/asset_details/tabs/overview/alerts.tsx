/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useCallback, useMemo, useState } from 'react';
import {
  calculateTimeRangeBucketSize,
  getAlertSummaryTimeRange,
  useTimeBuckets,
} from '@kbn/observability-plugin/public';
import { TimeRange } from '@kbn/es-query';
import { BrushEndListener, XYBrushEvent } from '@elastic/charts';

import styled from 'styled-components';
import { AlertStatus } from '../../../../pages/metrics/hosts/types';
import {
  DEFAULT_DATE_FORMAT,
  DEFAULT_INTERVAL,
  infraAlertFeatureIds,
} from '../../../../pages/metrics/hosts/components/tabs/config';
import type {
  HostsState,
  HostsStateUpdater,
} from '../../../../pages/metrics/hosts/hooks/use_unified_search_url_state';
import {
  AlertsEsQuery,
  createAlertsEsQuery,
} from '../../../../pages/metrics/hosts/hooks/use_alerts_query';
import { useUnifiedSearchContext } from '../../../../pages/metrics/hosts/hooks/use_unified_search';
import { useKibanaContextForPlugin } from '../../../../hooks/use_kibana';

export const AlertsSummaryContent = ({ nodeName }: { nodeName: string }) => {
  // TODO check status and if we need to set it
  const [alertStatus, _setAlertStatus] = useState<AlertStatus>('all');
  const { onSubmit, searchCriteria } = useUnifiedSearchContext();

  const getAlertsEsQuery = useCallback(
    (status?: AlertStatus) =>
      // TODO - hostNodes type
      createAlertsEsQuery({
        dateRange: searchCriteria.dateRange,
        hostNodes: [{ name: nodeName }],
        status,
      }),
    [nodeName, searchCriteria.dateRange]
  );

  const alertsEsQueryByStatus = useMemo(
    () => getAlertsEsQuery(alertStatus),
    [getAlertsEsQuery, alertStatus]
  );

  return (
    <ContainerPanel>
      <MemoAlertSummaryWidget
        alertsQuery={alertsEsQueryByStatus}
        dateRange={searchCriteria.dateRange}
        onRangeSelection={onSubmit}
      />
    </ContainerPanel>
  );
};

interface MemoAlertSummaryWidgetProps {
  alertsQuery: AlertsEsQuery;
  dateRange: HostsState['dateRange'];
  onRangeSelection: HostsStateUpdater;
}

const MemoAlertSummaryWidget = React.memo(
  ({ alertsQuery, dateRange, onRangeSelection }: MemoAlertSummaryWidgetProps) => {
    const { services } = useKibanaContextForPlugin();

    const summaryTimeRange = useSummaryTimeRange(dateRange);

    const { charts, triggersActionsUi } = services;
    const { getAlertSummaryWidget: AlertSummaryWidget } = triggersActionsUi;

    const onBrushEnd: BrushEndListener = (brushEvent) => {
      const { x } = brushEvent as XYBrushEvent;
      if (x) {
        const [start, end] = x;

        const from = new Date(start).toISOString();
        const to = new Date(end).toISOString();

        onRangeSelection({ dateRange: { from, to } });
      }
    };

    const chartProps = {
      theme: charts.theme.useChartsTheme(),
      baseTheme: charts.theme.useChartsBaseTheme(),
      onBrushEnd,
    };

    return (
      <AlertSummaryWidget
        chartProps={chartProps}
        featureIds={infraAlertFeatureIds}
        filter={alertsQuery}
        timeRange={summaryTimeRange}
      />
    );
  }
);

const ContainerPanel = styled.div`
  && .euiPanel {
    border: none;
    pointer-events: none;
  }
`;

const useSummaryTimeRange = (unifiedSearchDateRange: TimeRange) => {
  const timeBuckets = useTimeBuckets();

  const bucketSize = useMemo(
    () => calculateTimeRangeBucketSize(unifiedSearchDateRange, timeBuckets),
    [unifiedSearchDateRange, timeBuckets]
  );

  return getAlertSummaryTimeRange(
    unifiedSearchDateRange,
    bucketSize?.intervalString || DEFAULT_INTERVAL,
    bucketSize?.dateFormat || DEFAULT_DATE_FORMAT
  );
};
