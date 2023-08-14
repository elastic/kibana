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
import { ALL_VALUE, SLOWithSummaryResponse } from '@kbn/slo-schema';
import React, { Fragment, useState } from 'react';
import { i18n } from '@kbn/i18n';

import { useLocation } from 'react-router-dom';
import { useFetchActiveAlerts } from '../../../hooks/slo/use_fetch_active_alerts';
import { formatHistoricalData } from '../../../utils/slo/chart_data_formatter';
import { useFetchHistoricalSummary } from '../../../hooks/slo/use_fetch_historical_summary';
import { ErrorBudgetChartPanel } from './error_budget_chart_panel';
import { Overview } from './overview/overview';
import { SliChartPanel } from './sli_chart_panel';
import { SloDetailsAlerts } from './slo_detail_alerts';
import { BurnRates } from './burn_rates';

export interface Props {
  slo: SLOWithSummaryResponse;
  isAutoRefreshing: boolean;
}

const TAB_ID_URL_PARAM = 'tabId';
const OVERVIEW_TAB_ID = 'overview';
const ALERTS_TAB_ID = 'alerts';

type TabId = typeof OVERVIEW_TAB_ID | typeof ALERTS_TAB_ID;

export function SloDetails({ slo, isAutoRefreshing }: Props) {
  const { search } = useLocation();
  const { data: activeAlerts } = useFetchActiveAlerts({
    sloIdsAndInstanceIds: [[slo.id, slo.instanceId ?? ALL_VALUE]],
  });
  const { isLoading: historicalSummaryLoading, data: historicalSummaries = [] } =
    useFetchHistoricalSummary({
      list: [{ sloId: slo.id, instanceId: slo.instanceId ?? ALL_VALUE }],
      shouldRefetch: isAutoRefreshing,
    });

  const sloHistoricalSummary = historicalSummaries.find(
    (historicalSummary) =>
      historicalSummary.sloId === slo.id &&
      historicalSummary.instanceId === (slo.instanceId ?? ALL_VALUE)
  );

  const errorBudgetBurnDownData = formatHistoricalData(
    sloHistoricalSummary?.data,
    'error_budget_remaining'
  );
  const historicalSliData = formatHistoricalData(sloHistoricalSummary?.data, 'sli_value');

  const tabs: EuiTabbedContentTab[] = [
    {
      id: OVERVIEW_TAB_ID,
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
                <BurnRates slo={slo} isAutoRefreshing={isAutoRefreshing} />
              </EuiFlexItem>
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
      id: ALERTS_TAB_ID,
      name: i18n.translate('xpack.observability.slo.sloDetails.tab.alertsLabel', {
        defaultMessage: 'Alerts',
      }),
      'data-test-subj': 'alertsTab',
      append: (
        <EuiNotificationBadge className="eui-alignCenter" size="m">
          {(activeAlerts && activeAlerts.get(slo)) ?? 0}
        </EuiNotificationBadge>
      ),
      content: <SloDetailsAlerts slo={slo} />,
    },
  ];

  const [selectedTabId, setSelectedTabId] = useState(() => {
    const searchParams = new URLSearchParams(search);
    const urlTabId = searchParams.get(TAB_ID_URL_PARAM);
    return urlTabId && [OVERVIEW_TAB_ID, ALERTS_TAB_ID].includes(urlTabId)
      ? (urlTabId as TabId)
      : OVERVIEW_TAB_ID;
  });

  const handleSelectedTab = (newTabId: TabId) => {
    setSelectedTabId(newTabId);
  };

  return (
    <EuiTabbedContent
      data-test-subj="sloDetailsTabbedContent"
      tabs={tabs}
      selectedTab={tabs.find((tab) => tab.id === selectedTabId) ?? tabs[0]}
      onTabClick={(tab) => handleSelectedTab(tab.id as TabId)}
    />
  );
}
