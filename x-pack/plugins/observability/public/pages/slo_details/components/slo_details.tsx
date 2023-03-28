/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { SLOWithSummaryResponse } from '@kbn/slo-schema';
import React from 'react';

import { formatHistoricalData } from '../../../utils/slo/chart_data_formatter';
import { useFetchHistoricalSummary } from '../../../hooks/slo/use_fetch_historical_summary';
import { ErrorBudgetChartPanel } from './error_budget_chart_panel';
import { Overview as Overview } from './overview';
import { SliChartPanel } from './sli_chart_panel';

export interface Props {
  slo: SLOWithSummaryResponse;
}

export function SloDetails({ slo }: Props) {
  const { isLoading: historicalSummaryLoading, sloHistoricalSummaryResponse = {} } =
    useFetchHistoricalSummary({ sloIds: [slo.id] });

  const errorBudgetBurnDownData = formatHistoricalData(
    sloHistoricalSummaryResponse[slo.id],
    'error_budget_remaining'
  );
  const historicalSliData = formatHistoricalData(sloHistoricalSummaryResponse[slo.id], 'sli_value');

  return (
    <EuiFlexGroup direction="column" gutterSize="xl">
      <EuiFlexItem>
        <Overview slo={slo} />
      </EuiFlexItem>
      <EuiFlexGroup direction="column" gutterSize="l">
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
      </EuiFlexGroup>
    </EuiFlexGroup>
  );
}
