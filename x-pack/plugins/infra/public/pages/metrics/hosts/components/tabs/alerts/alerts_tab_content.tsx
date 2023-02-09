/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import {
  getAlertSummaryTimeRange,
  ObservabilityAlertStatusFilter,
  useTimeBuckets,
} from '@kbn/observability-plugin/public';
import { AlertConsumers } from '@kbn/rule-data-utils';
import { InfraClientCoreStart, InfraClientStartDeps } from '../../../../../../types';
import { useUnifiedSearchContext } from '../../../hooks/use_unified_search';

import {
  ALERTS_PER_PAGE,
  ALERTS_TABLE_ID,
  casesFeatures,
  casesOwner,
  infraAlertFeatureIds,
} from '../config';
import { useAlertsQuery } from '../../../hooks/use_alerts_query';

export const AlertsTabContent = React.memo(() => {
  const { services } = useKibana<InfraClientCoreStart & InfraClientStartDeps>();

  const { alertStatus, setAlertStatus, alertsEsQueryByStatus } = useAlertsQuery();

  const { unifiedSearchDateRange } = useUnifiedSearchContext();

  const timeBuckets = useTimeBuckets();

  const { application, cases, charts, triggersActionsUi } = services;

  const {
    alertsTableConfigurationRegistry,
    getAlertsStateTable: AlertsStateTable,
    getAlertSummaryWidget: AlertSummaryWidget,
  } = triggersActionsUi;

  const CasesContext = cases.ui.getCasesContext();
  const uiCapabilities = application?.capabilities;
  const casesCapabilities = cases.helpers.getUICapabilities(uiCapabilities.observabilityCases);

  const summaryTimeRange = getAlertSummaryTimeRange(unifiedSearchDateRange, timeBuckets);

  const chartThemes = {
    theme: charts.theme.useChartsTheme(),
    baseTheme: charts.theme.useChartsBaseTheme(),
  };

  return (
    <EuiFlexGroup direction="column" gutterSize="m">
      <EuiFlexGroup justifyContent="flexStart" alignItems="center">
        <EuiFlexItem grow={false}>
          <ObservabilityAlertStatusFilter onChange={setAlertStatus} status={alertStatus} />
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
          <CasesContext features={casesFeatures} owner={casesOwner} permissions={casesCapabilities}>
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
  );
});
