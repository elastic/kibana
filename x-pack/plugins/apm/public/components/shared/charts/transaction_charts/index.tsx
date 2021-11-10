/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGrid, EuiFlexItem, EuiPanel, EuiSpacer } from '@elastic/eui';
import React from 'react';
import { AnnotationsContextProvider } from '../../../../context/annotations/annotations_context';
import { ChartPointerEventContextProvider } from '../../../../context/chart_pointer_event/chart_pointer_event_context';
import { ServiceOverviewThroughputChart } from '../../../app/service_overview/service_overview_throughput_chart';
import { LatencyChart } from '../latency_chart';
import { TransactionBreakdownChart } from '../transaction_breakdown_chart';
import { FailedTransactionRateChart } from '../failed_transaction_rate_chart';

export function TransactionCharts({
  kuery,
  environment,
  start,
  end,
  transactionName,
}: {
  kuery: string;
  environment: string;
  start: string;
  end: string;
  transactionName?: string;
}) {
  return (
    <>
      <AnnotationsContextProvider
        environment={environment}
        start={start}
        end={end}
      >
        <ChartPointerEventContextProvider>
          <EuiFlexGrid columns={2} gutterSize="s">
            <EuiFlexItem data-cy={`transaction-latency-chart`}>
              <EuiPanel hasBorder={true}>
                <LatencyChart kuery={kuery} environment={environment} />
              </EuiPanel>
            </EuiFlexItem>

            <EuiFlexItem
              style={{ flexShrink: 1 }}
              data-cy={`transaction-throughput-chart`}
            >
              <ServiceOverviewThroughputChart
                environment={environment}
                kuery={kuery}
                transactionName={transactionName}
              />
            </EuiFlexItem>
          </EuiFlexGrid>

          <EuiSpacer size="s" />

          <EuiFlexGrid columns={2} gutterSize="s">
            <EuiFlexItem data-cy={`transaction-failed-transaction-chart`}>
              <FailedTransactionRateChart
                kuery={kuery}
                environment={environment}
              />
            </EuiFlexItem>
            <EuiFlexItem data-cy={`transaction-breakdown-chart`}>
              <TransactionBreakdownChart
                kuery={kuery}
                environment={environment}
              />
            </EuiFlexItem>
          </EuiFlexGrid>
        </ChartPointerEventContextProvider>
      </AnnotationsContextProvider>
    </>
  );
}
