/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, htmlIdGenerator } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { ALL_VALUE, SLOWithSummaryResponse } from '@kbn/slo-schema';
import React, { useEffect, useState } from 'react';
import { BurnRateOption, BurnRates } from '../../../components/slo/burn_rate/burn_rates';

import { useFetchHistoricalSummary } from '../../../hooks/use_fetch_historical_summary';
import { useFetchRulesForSlo } from '../../../hooks/use_fetch_rules_for_slo';
import { formatHistoricalData } from '../../../utils/slo/chart_data_formatter';
import { ErrorBudgetChartPanel } from './error_budget_chart_panel';
import { EventsChartPanel } from './events_chart_panel';
import { Overview } from './overview/overview';
import { SliChartPanel } from './sli_chart_panel';
import { SloDetailsAlerts } from './slo_detail_alerts';

export const TAB_ID_URL_PARAM = 'tabId';
export const OVERVIEW_TAB_ID = 'overview';
export const ALERTS_TAB_ID = 'alerts';
const DAY_IN_MILLISECONDS = 24 * 60 * 60 * 1000;

const DEFAULT_BURN_RATE_OPTIONS: BurnRateOption[] = [
  {
    id: htmlIdGenerator()(),
    label: i18n.translate('xpack.slo.burnRates.fromRange.label', {
      defaultMessage: '{duration}h',
      values: { duration: 1 },
    }),
    windowName: 'CRITICAL',
    threshold: 14.4,
    duration: 1,
  },
  {
    id: htmlIdGenerator()(),
    label: i18n.translate('xpack.slo.burnRates.fromRange.label', {
      defaultMessage: '{duration}h',
      values: { duration: 6 },
    }),
    windowName: 'HIGH',
    threshold: 6,
    duration: 6,
  },
  {
    id: htmlIdGenerator()(),
    label: i18n.translate('xpack.slo.burnRates.fromRange.label', {
      defaultMessage: '{duration}h',
      values: { duration: 24 },
    }),
    windowName: 'MEDIUM',
    threshold: 3,
    duration: 24,
  },
  {
    id: htmlIdGenerator()(),
    label: i18n.translate('xpack.slo.burnRates.fromRange.label', {
      defaultMessage: '{duration}h',
      values: { duration: 72 },
    }),
    windowName: 'LOW',
    threshold: 1,
    duration: 72,
  },
];

export type SloTabId = typeof OVERVIEW_TAB_ID | typeof ALERTS_TAB_ID;

export interface Props {
  slo: SLOWithSummaryResponse;
  isAutoRefreshing: boolean;
  selectedTabId: SloTabId;
}
export function SloDetails({ slo, isAutoRefreshing, selectedTabId }: Props) {
  const { data: rules } = useFetchRulesForSlo({ sloIds: [slo.id] });
  const burnRateOptions =
    rules?.[slo.id]?.[0]?.params?.windows?.map((window) => ({
      id: htmlIdGenerator()(),
      label: i18n.translate('xpack.slo.burnRates.fromRange.label', {
        defaultMessage: '{duration}h',
        values: { duration: window.longWindow.value },
      }),
      windowName: window.actionGroup,
      threshold: window.burnRateThreshold,
      duration: window.longWindow.value,
    })) ?? DEFAULT_BURN_RATE_OPTIONS;

  const { data: historicalSummaries = [], isLoading: historicalSummaryLoading } =
    useFetchHistoricalSummary({
      list: [{ sloId: slo.id, instanceId: slo.instanceId ?? ALL_VALUE }],
      shouldRefetch: isAutoRefreshing,
    });

  const sloHistoricalSummary = historicalSummaries.find(
    (historicalSummary) =>
      historicalSummary.sloId === slo.id &&
      historicalSummary.instanceId === (slo.instanceId ?? ALL_VALUE)
  );

  const [range, setRange] = useState({
    start: new Date().getTime() - DAY_IN_MILLISECONDS,
    end: new Date().getTime(),
  });

  useEffect(() => {
    let intervalId: any;
    if (isAutoRefreshing) {
      intervalId = setInterval(() => {
        setRange({ start: new Date().getTime() - DAY_IN_MILLISECONDS, end: new Date().getTime() });
      }, 60 * 1000);
    }

    return () => clearInterval(intervalId);
  }, [isAutoRefreshing]);

  const errorBudgetBurnDownData = formatHistoricalData(
    sloHistoricalSummary?.data,
    'error_budget_remaining'
  );
  const historicalSliData = formatHistoricalData(sloHistoricalSummary?.data, 'sli_value');

  return selectedTabId === OVERVIEW_TAB_ID ? (
    <EuiFlexGroup direction="column" gutterSize="xl">
      <EuiFlexItem>
        <Overview slo={slo} />
      </EuiFlexItem>
      <EuiFlexGroup direction="column" gutterSize="l">
        <EuiFlexItem>
          <BurnRates
            slo={slo}
            isAutoRefreshing={isAutoRefreshing}
            burnRateOptions={burnRateOptions}
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <SliChartPanel data={historicalSliData} isLoading={historicalSummaryLoading} slo={slo} />
        </EuiFlexItem>
        <EuiFlexItem>
          <ErrorBudgetChartPanel
            data={errorBudgetBurnDownData}
            isLoading={historicalSummaryLoading}
            slo={slo}
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <EventsChartPanel slo={slo} range={range} />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFlexGroup>
  ) : (
    <SloDetailsAlerts slo={slo} />
  );
}
