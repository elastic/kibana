/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useMemo } from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import {
  calculateTimeRangeBucketSize,
  getAlertSummaryTimeRange,
  useTimeBuckets,
} from '@kbn/observability-plugin/public';
import { AlertConsumers } from '@kbn/rule-data-utils';
import { TimeRange } from '@kbn/es-query';
import { HeightRetainer } from '../../../../../../components/height_retainer';
import type { InfraClientCoreStart, InfraClientStartDeps } from '../../../../../../types';
import { useUnifiedSearchContext } from '../../../hooks/use_unified_search';

import {
  ALERTS_PER_PAGE,
  ALERTS_TABLE_ID,
  casesFeatures,
  casesOwner,
  DEFAULT_DATE_FORMAT,
  DEFAULT_INTERVAL,
  infraAlertFeatureIds,
} from '../config';
import { AlertsEsQuery, useAlertsQuery } from '../../../hooks/use_alerts_query';
import AlertsStatusFilter from './alerts_status_filter';
import { HostsState } from '../../../hooks/use_unified_search_url_state';

export const AlertsTabContent = () => {
  const { services } = useKibana<InfraClientCoreStart & InfraClientStartDeps>();

  const { alertStatus, setAlertStatus, alertsEsQueryByStatus } = useAlertsQuery();

  const { searchCriteria } = useUnifiedSearchContext();

  const { application, cases, triggersActionsUi } = services;

  const { alertsTableConfigurationRegistry, getAlertsStateTable: AlertsStateTable } =
    triggersActionsUi;

  const CasesContext = cases.ui.getCasesContext();
  const uiCapabilities = application?.capabilities;
  const casesCapabilities = cases.helpers.getUICapabilities(uiCapabilities.observabilityCases);

  return (
    <HeightRetainer>
      <EuiFlexGroup direction="column" gutterSize="m" data-test-subj="hostsView-alerts">
        <EuiFlexGroup justifyContent="flexStart" alignItems="center">
          <EuiFlexItem grow={false}>
            <AlertsStatusFilter onChange={setAlertStatus} status={alertStatus} />
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiFlexItem>
          <MemoAlertSummaryWidget
            alertsQuery={alertsEsQueryByStatus}
            dateRange={searchCriteria.dateRange}
          />
        </EuiFlexItem>
        {alertsEsQueryByStatus && (
          <EuiFlexItem>
            <CasesContext
              features={casesFeatures}
              owner={casesOwner}
              permissions={casesCapabilities}
            >
              <AlertsStateTable
                alertsTableConfigurationRegistry={alertsTableConfigurationRegistry}
                configurationId={AlertConsumers.OBSERVABILITY}
                featureIds={infraAlertFeatureIds}
                flyoutSize="s"
                id={ALERTS_TABLE_ID}
                pageSize={ALERTS_PER_PAGE}
                query={alertsEsQueryByStatus}
                showAlertStatusWithFlapping
                showExpandToDetails={false}
              />
            </CasesContext>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    </HeightRetainer>
  );
};

interface MemoAlertSummaryWidgetProps {
  alertsQuery: AlertsEsQuery;
  dateRange: HostsState['dateRange'];
}

const MemoAlertSummaryWidget = React.memo(
  ({ alertsQuery, dateRange }: MemoAlertSummaryWidgetProps) => {
    const { services } = useKibana<InfraClientStartDeps>();

    const summaryTimeRange = useSummaryTimeRange(dateRange);

    const { charts, triggersActionsUi } = services;
    const { getAlertSummaryWidget: AlertSummaryWidget } = triggersActionsUi;

    const chartThemes = {
      theme: charts.theme.useChartsTheme(),
      baseTheme: charts.theme.useChartsBaseTheme(),
    };

    return (
      <AlertSummaryWidget
        chartThemes={chartThemes}
        featureIds={infraAlertFeatureIds}
        filter={alertsQuery}
        fullSize
        timeRange={summaryTimeRange}
      />
    );
  }
);

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
