/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { AlertConsumers } from '@kbn/rule-data-utils';
import React, { useMemo } from 'react';
import { InfraClientCoreStart, InfraClientStartDeps } from '../../../../../../types';
import { useHostsViewContext } from '../../../hooks/use_hosts_view';
import { useUnifiedSearchContext } from '../../../hooks/use_unified_search';
import { StringDateRangeTimestamp } from '../../../hooks/use_unified_search_url_state';

import {
  ALERTS_PER_PAGE,
  ALERTS_TABLE_ID,
  infraAlertFeatureId,
  infraAlertFeatureIds,
} from './config';

export const AlertsTabContent = () => {
  const { services } = useKibana<InfraClientCoreStart & InfraClientStartDeps>();
  const { application, cases, charts, triggersActionsUi } = services;

  const {
    alertsTableConfigurationRegistry,
    getAlertSummaryWidget: AlertSummaryWidget,
    getAlertsStateTable: AlertsStateTable,
  } = triggersActionsUi;

  const { alertsEsQueryFilter } = useHostsViewContext();

  const { getDateRangeAsTimestamp } = useUnifiedSearchContext();

  const uiCapabilities = application?.capabilities;
  const CasesContext = cases.ui.getCasesContext();
  const casesCapabilities = cases.helpers.getUICapabilities(uiCapabilities.observabilityCases);

  const summaryTimeRange = useMemo(() => {
    const dateRangeTimestamp = getDateRangeAsTimestamp();
    return createAlertSummaryTimeRange(dateRangeTimestamp);
  }, [getDateRangeAsTimestamp]);

  const chartThemes = {
    theme: charts.theme.useChartsTheme(),
    baseTheme: charts.theme.useChartsBaseTheme(),
  };

  return (
    <EuiFlexGroup direction="column" gutterSize="m">
      <EuiFlexItem>
        <AlertSummaryWidget
          featureIds={infraAlertFeatureIds}
          filter={alertsEsQueryFilter}
          fullSize
          timeRange={summaryTimeRange}
          chartThemes={chartThemes}
        />
      </EuiFlexItem>
      {alertsEsQueryFilter && (
        <EuiFlexItem>
          <CasesContext
            owner={[infraAlertFeatureId]}
            permissions={casesCapabilities}
            features={{ alerts: { sync: false } }}
          >
            <AlertsStateTable
              alertsTableConfigurationRegistry={alertsTableConfigurationRegistry}
              configurationId={AlertConsumers.OBSERVABILITY}
              featureIds={infraAlertFeatureIds}
              flyoutSize="s"
              id={ALERTS_TABLE_ID}
              pageSize={ALERTS_PER_PAGE}
              query={alertsEsQueryFilter}
              showAlertStatusWithFlapping
              showExpandToDetails={false}
            />
          </CasesContext>
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};

/**
 * Helpers
 */
const createAlertSummaryTimeRange = (dateRange: StringDateRangeTimestamp) => ({
  utcFrom: new Date(dateRange.from).toISOString(),
  utcTo: new Date(dateRange.to).toISOString(),
  fixedInterval: '10800s',
  dateFormat: 'YYYY-MM-DD HH:mm',
});
