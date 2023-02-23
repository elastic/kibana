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
import { useAlertsQuery } from '../../../hooks/use_alerts_query';
import AlertsStatusFilter from './alerts_status_filter';

export const AlertsTabContent = React.memo(() => {
  const { services } = useKibana<InfraClientCoreStart & InfraClientStartDeps>();

  const { alertStatus, setAlertStatus, alertsEsQueryByStatus } = useAlertsQuery();

  const { unifiedSearchDateRange } = useUnifiedSearchContext();

  const summaryTimeRange = useSummaryTimeRange(unifiedSearchDateRange);

  const { application, cases, charts, triggersActionsUi } = services;

  const {
    alertsTableConfigurationRegistry,
    getAlertsStateTable: AlertsStateTable,
    getAlertSummaryWidget: AlertSummaryWidget,
  } = triggersActionsUi;

  const CasesContext = cases.ui.getCasesContext();
  const uiCapabilities = application?.capabilities;
  const casesCapabilities = cases.helpers.getUICapabilities(uiCapabilities.observabilityCases);

  const chartThemes = {
    theme: charts.theme.useChartsTheme(),
    baseTheme: charts.theme.useChartsBaseTheme(),
  };

  return (
    <HeightRetainer>
      <EuiFlexGroup direction="column" gutterSize="m" data-test-subj="hostsView-alerts">
        <EuiFlexGroup justifyContent="flexStart" alignItems="center">
          <EuiFlexItem grow={false}>
            <AlertsStatusFilter onChange={setAlertStatus} status={alertStatus} />
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiFlexItem>
          <AlertSummaryWidget
            chartThemes={chartThemes}
            featureIds={infraAlertFeatureIds}
            filter={alertsEsQueryByStatus}
            fullSize
            timeRange={summaryTimeRange}
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
});

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
