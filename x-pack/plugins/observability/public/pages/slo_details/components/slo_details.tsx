/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { SLOWithSummaryResponse } from '@kbn/slo-schema';
import React from 'react';

import { useFetchHistoricalSummary } from '../../../hooks/slo/use_fetch_historical_summary';
import { ErrorBudgetChartPanel } from './error_budget_chart_panel';
import { Overview as Overview } from './overview';

export interface Props {
  slo: SLOWithSummaryResponse;
}

export function SloDetails({ slo }: Props) {
  const { isLoading: historicalSummaryLoading, sloHistoricalSummaryResponse } =
    useFetchHistoricalSummary({ sloIds: [slo.id] });

  const errorBudgetBurnDownData = (sloHistoricalSummaryResponse[slo.id] ?? []).map((data) => ({
    key: new Date(data.date).getTime(),
    value: data.status === 'NO_DATA' ? undefined : data.errorBudget.remaining,
  }));

  return (
    <EuiFlexGroup direction="column">
      <EuiFlexItem>
        <Overview slo={slo} />
      </EuiFlexItem>
      <EuiFlexItem>
        <ErrorBudgetChartPanel
          data={errorBudgetBurnDownData}
          isLoading={historicalSummaryLoading}
          slo={slo}
        />
      </EuiFlexItem>
      <EuiFlexItem>
        <pre data-test-subj="sloDetails">{JSON.stringify(slo, null, 2)}</pre>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
