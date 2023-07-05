/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useMemo } from 'react';
import {
  calculateTimeRangeBucketSize,
  getAlertSummaryTimeRange,
  useTimeBuckets,
} from '@kbn/observability-plugin/public';
import { TimeRange } from '@kbn/es-query';
import styled from 'styled-components';
import { createAlertsEsQuery } from '../../../../common/alerts/create_alerts_es_query';
import type { AlertStatus } from '../../../../pages/metrics/hosts/types';
import {
  DEFAULT_DATE_FORMAT,
  DEFAULT_INTERVAL,
  infraAlertFeatureIds,
} from '../../../../pages/metrics/hosts/components/tabs/config';
import type {
  HostsState,
  HostsStateUpdater,
} from '../../../../pages/metrics/hosts/hooks/use_unified_search_url_state';
import type { AlertsEsQuery } from '../../../../pages/metrics/hosts/hooks/use_alerts_query';

// TODO replace once https://github.com/elastic/kibana/pull/160924 is ready
import { useUnifiedSearchContext } from '../../../../pages/metrics/hosts/hooks/use_unified_search';
import { useKibanaContextForPlugin } from '../../../../hooks/use_kibana';

const ALERT_STATUS: AlertStatus = 'all';

export const AlertsSummaryContent = ({ nodeName }: { nodeName: string }) => {
  // TODO replace once https://github.com/elastic/kibana/pull/160924 is ready
  const { onSubmit, searchCriteria } = useUnifiedSearchContext();

  const alertsEsQueryByStatus = useMemo(
    () =>
      createAlertsEsQuery({
        dateRange: searchCriteria.dateRange,
        hostNodeNames: [nodeName],
        status: ALERT_STATUS,
      }),
    [nodeName, searchCriteria.dateRange]
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

    const chartProps = {
      theme: charts.theme.useChartsTheme(),
      baseTheme: charts.theme.useChartsBaseTheme(),
    };

    return (
      <AlertSummaryWidget
        chartProps={chartProps}
        featureIds={infraAlertFeatureIds}
        filter={alertsQuery}
        timeRange={summaryTimeRange}

        // Can be added to hide the chart
        // once https://github.com/elastic/kibana/pull/161263 is merged
        // fullSize
        // shouldHideCharts
      />
    );
  }
);

// This will be removed once https://github.com/elastic/kibana/pull/161263 is merged
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
