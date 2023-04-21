/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiNotificationBadge,
  EuiSpacer,
  EuiTabbedContent,
  EuiTabbedContentTab,
} from '@elastic/eui';
import { SLOWithSummaryResponse } from '@kbn/slo-schema';
import React, { Fragment } from 'react';
import { AlertConsumers } from '@kbn/rule-data-utils';
import { i18n } from '@kbn/i18n';

import { useFetchActiveAlerts } from '../../../hooks/slo/use_fetch_active_alerts';
import { useKibana } from '../../../utils/kibana_react';
import { formatHistoricalData } from '../../../utils/slo/chart_data_formatter';
import { useFetchHistoricalSummary } from '../../../hooks/slo/use_fetch_historical_summary';
import { ErrorBudgetChartPanel } from './error_budget_chart_panel';
import { Overview as Overview } from './overview';
import { SliChartPanel } from './sli_chart_panel';

export interface Props {
  slo: SLOWithSummaryResponse;
  isAutoRefreshing: boolean;
}
const ALERTS_TABLE_ID = 'xpack.observability.slo.sloDetails.alertTable';
const OVERVIEW_TAB = 'overview';
const ALERTS_TAB = 'alerts';

export function SloDetails({ slo, isAutoRefreshing }: Props) {
  const {
    triggersActionsUi: { alertsTableConfigurationRegistry, getAlertsStateTable: AlertsStateTable },
  } = useKibana().services;

  const { data: activeAlerts } = useFetchActiveAlerts({
    sloIds: [slo.id],
  });
  const { isLoading: historicalSummaryLoading, sloHistoricalSummaryResponse = {} } =
    useFetchHistoricalSummary({ sloIds: [slo.id], shouldRefetch: isAutoRefreshing });

  const errorBudgetBurnDownData = formatHistoricalData(
    sloHistoricalSummaryResponse[slo.id],
    'error_budget_remaining'
  );
  const historicalSliData = formatHistoricalData(sloHistoricalSummaryResponse[slo.id], 'sli_value');

  const tabs: EuiTabbedContentTab[] = [
    {
      id: OVERVIEW_TAB,
      name: i18n.translate('xpack.observability.slo.sloDetails.tab.overviewLabel', {
        defaultMessage: 'Overview',
      }),
      'data-test-subj': 'overviewTab',
      content: (
        <Fragment>
          <EuiSpacer size="l" />
          <EuiFlexGroup direction="column" gutterSize="xl">
            <EuiFlexItem>
              <Overview slo={slo} />
            </EuiFlexItem>
            <EuiFlexGroup direction="column" gutterSize="l">
              <EuiFlexItem>
                <SliChartPanel
                  data={historicalSliData}
                  isLoading={historicalSummaryLoading}
                  slo={slo}
                />
              </EuiFlexItem>
              <EuiFlexItem>
                <ErrorBudgetChartPanel
                  data={errorBudgetBurnDownData}
                  isLoading={historicalSummaryLoading}
                  slo={slo}
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexGroup>
        </Fragment>
      ),
    },
    {
      id: ALERTS_TAB,
      name: i18n.translate('xpack.observability.slo.sloDetails.tab.alertsLabel', {
        defaultMessage: 'Alerts',
      }),
      'data-test-subj': 'alertsTab',
      append: (
        <EuiNotificationBadge className="eui-alignCenter" size="m">
          {(activeAlerts && activeAlerts[slo.id]?.count) ?? 0}
        </EuiNotificationBadge>
      ),
      content: (
        <Fragment>
          <EuiSpacer size="l" />
          <EuiFlexGroup direction="column" gutterSize="xl">
            <EuiFlexItem>
              <AlertsStateTable
                alertsTableConfigurationRegistry={alertsTableConfigurationRegistry}
                configurationId={AlertConsumers.OBSERVABILITY}
                id={ALERTS_TABLE_ID}
                flyoutSize="s"
                data-test-subj="alertTable"
                featureIds={[AlertConsumers.SLO]}
                query={{ bool: { filter: { term: { 'slo.id': slo.id } } } }}
                showExpandToDetails={false}
                showAlertStatusWithFlapping
                pageSize={100}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </Fragment>
      ),
    },
  ];

  return (
    <EuiTabbedContent
      data-test-subj="sloDetailsTabbedContent"
      tabs={tabs}
      initialSelectedTab={tabs[0]}
    />
  );
}
