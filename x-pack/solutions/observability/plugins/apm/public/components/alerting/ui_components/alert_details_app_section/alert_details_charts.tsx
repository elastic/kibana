/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactElement } from 'react';
import React from 'react';
import type { RecursivePartial } from '@elastic/eui';
import { EuiFlexGroup } from '@elastic/eui';
import type { Theme } from '@elastic/charts';
import type { TopAlert } from '@kbn/observability-plugin/public';
import type { ApmRuleType } from '@kbn/rule-data-utils';
import { ErrorCountChart } from './error_count_chart';
import { FailedTransactionChart } from './failed_transaction_chart';
import { LatencyChart } from './latency_chart';
import { ThroughputChart } from './throughput_chart';
import type { ChartId } from './types';

export function AlertDetailsCharts({
  alert,
  alertRuleTypeId,
  chartLayout,
  serviceName,
  environment,
  transactionName,
  transactionType,
  errorGroupingKey,
  ruleAggregationType,
  comparisonChartTheme,
  timeZone,
  from,
  to,
  thresholdComponent,
}: {
  alert: TopAlert;
  alertRuleTypeId: ApmRuleType;
  chartLayout: { primary: ChartId; secondary: [ChartId, ChartId] };
  serviceName: string;
  environment: string;
  transactionName?: string;
  transactionType?: string;
  errorGroupingKey?: string;
  ruleAggregationType?: string;
  comparisonChartTheme: RecursivePartial<Theme>;
  timeZone: string;
  from: string;
  to: string;
  thresholdComponent?: ReactElement;
}) {
  const chartRenderers: Record<ChartId, (isPrimary: boolean) => ReactElement> = {
    latency: (isPrimary) => (
      <LatencyChart
        alert={alert}
        transactionType={transactionType}
        transactionName={transactionName}
        serviceName={serviceName}
        environment={environment}
        start={from}
        end={to}
        comparisonChartTheme={comparisonChartTheme}
        timeZone={timeZone}
        comparisonEnabled={false}
        offset={''}
        threshold={isPrimary ? thresholdComponent : undefined}
        ruleAggregationType={ruleAggregationType}
        ruleTypeId={alertRuleTypeId}
        compact
        showAlertAnnotations
      />
    ),
    failedTransactionRate: (isPrimary) => (
      <FailedTransactionChart
        alert={alert}
        transactionType={transactionType}
        transactionName={transactionName}
        serviceName={serviceName}
        environment={environment}
        start={from}
        end={to}
        comparisonChartTheme={comparisonChartTheme}
        timeZone={timeZone}
        comparisonEnabled={false}
        offset={''}
        threshold={isPrimary ? thresholdComponent : undefined}
        ruleTypeId={alertRuleTypeId}
        compact
        showAlertAnnotations
      />
    ),
    throughput: (isPrimary) => (
      <ThroughputChart
        alert={alert}
        transactionType={transactionType}
        transactionName={transactionName}
        serviceName={serviceName}
        environment={environment}
        start={from}
        end={to}
        comparisonChartTheme={comparisonChartTheme}
        comparisonEnabled={false}
        offset={''}
        timeZone={timeZone}
        threshold={isPrimary ? thresholdComponent : undefined}
        ruleTypeId={alertRuleTypeId}
        compact
        showAlertAnnotations
      />
    ),
    errorCount: (isPrimary) => (
      <ErrorCountChart
        alert={alert}
        serviceName={serviceName}
        environment={environment}
        start={from}
        end={to}
        comparisonChartTheme={comparisonChartTheme}
        timeZone={timeZone}
        transactionName={transactionName}
        groupId={errorGroupingKey}
        comparisonEnabled={false}
        offset=""
        threshold={isPrimary ? thresholdComponent : undefined}
        ruleTypeId={alertRuleTypeId}
        compact
        showAlertAnnotations
      />
    ),
  };

  const chartIdsInOrder: ChartId[] = [chartLayout.primary, ...chartLayout.secondary];

  return (
    <EuiFlexGroup direction="row" gutterSize="s" responsive={false}>
      {chartIdsInOrder.map((chartId) => (
        <React.Fragment key={chartId}>
          {chartRenderers[chartId](chartId === chartLayout.primary)}
        </React.Fragment>
      ))}
    </EuiFlexGroup>
  );
}
