/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { SLOWithSummaryResponse } from '@kbn/slo-schema';
import React, { useEffect, useState } from 'react';
import { HistoricalDataCharts } from './historical_data_charts';
import { useBurnRateOptions } from '../hooks/use_burn_rate_options';
import { SLODetailsHistory } from './history/slo_details_history';
import { BurnRates } from '../../../components/slo/burn_rate/burn_rates';
import { EventsChartPanel } from './events_chart_panel';
import { Overview } from './overview/overview';
import { SloDetailsAlerts } from './slo_detail_alerts';
import { SloHealthCallout } from './slo_health_callout';
import { SloRemoteCallout } from './slo_remote_callout';

export const TAB_ID_URL_PARAM = 'tabId';
export const OVERVIEW_TAB_ID = 'overview';
export const HISTORY_TAB_ID = 'history';
export const ALERTS_TAB_ID = 'alerts';
const DAY_IN_MILLISECONDS = 24 * 60 * 60 * 1000;

export type SloTabId = typeof OVERVIEW_TAB_ID | typeof ALERTS_TAB_ID | typeof HISTORY_TAB_ID;

export interface Props {
  slo: SLOWithSummaryResponse;
  isAutoRefreshing: boolean;
  selectedTabId: SloTabId;
}
export function SloDetails({ slo, isAutoRefreshing, selectedTabId }: Props) {
  const { burnRateOptions } = useBurnRateOptions(slo);

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

  return selectedTabId === OVERVIEW_TAB_ID ? (
    <EuiFlexGroup direction="column" gutterSize="xl">
      <SloRemoteCallout slo={slo} />
      <SloHealthCallout slo={slo} />
      <EuiFlexItem>
        <Overview slo={slo} />
      </EuiFlexItem>
      <EuiFlexGroup direction="column" gutterSize="l">
        <EuiFlexItem>
          <BurnRates
            slo={slo}
            isAutoRefreshing={isAutoRefreshing}
            burnRateOptions={burnRateOptions}
            selectedTabId={selectedTabId}
          />
        </EuiFlexItem>
        <HistoricalDataCharts
          slo={slo}
          selectedTabId={selectedTabId}
          isAutoRefreshing={isAutoRefreshing}
        />
        <EuiFlexItem>
          <EventsChartPanel slo={slo} range={range} selectedTabId={selectedTabId} />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFlexGroup>
  ) : selectedTabId === ALERTS_TAB_ID ? (
    <SloDetailsAlerts slo={slo} />
  ) : (
    <SLODetailsHistory
      slo={slo}
      isAutoRefreshing={isAutoRefreshing}
      selectedTabId={selectedTabId}
    />
  );
}
