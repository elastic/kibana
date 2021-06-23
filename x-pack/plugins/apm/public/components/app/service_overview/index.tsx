/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiPanel } from '@elastic/eui';
import React from 'react';
import { useTrackPageview } from '../../../../../observability/public';
import { isRumAgentName } from '../../../../common/agent_name';
import { AnnotationsContextProvider } from '../../../context/annotations/annotations_context';
import { useApmServiceContext } from '../../../context/apm_service/use_apm_service_context';
import { ChartPointerEventContextProvider } from '../../../context/chart_pointer_event/chart_pointer_event_context';
import { useBreakPoints } from '../../../hooks/use_break_points';
import { LatencyChart } from '../../shared/charts/latency_chart';
import { TransactionBreakdownChart } from '../../shared/charts/transaction_breakdown_chart';
import { TransactionErrorRateChart } from '../../shared/charts/transaction_error_rate_chart';
import { ServiceOverviewDependenciesTable } from './service_overview_dependencies_table';
import { ServiceOverviewErrorsTable } from './service_overview_errors_table';
import { ServiceOverviewInstancesChartAndTable } from './service_overview_instances_chart_and_table';
import { ServiceOverviewThroughputChart } from './service_overview_throughput_chart';
import { ServiceOverviewTransactionsTable } from './service_overview_transactions_table';

/**
 * The height a chart should be if it's next to a table with 5 rows and a title.
 * Add the height of the pagination row.
 */
export const chartHeight = 288;

interface ServiceOverviewProps {
  serviceName: string;
}

export function ServiceOverview({ serviceName }: ServiceOverviewProps) {
  const { agentName } = useApmServiceContext();

  useTrackPageview({ app: 'apm', path: 'service_overview' });
  useTrackPageview({ app: 'apm', path: 'service_overview', delay: 15000 });

  // The default EuiFlexGroup breaks at 768, but we want to break at 992, so we
  // observe the window width and set the flex directions of rows accordingly
  const { isMedium } = useBreakPoints();
  const rowDirection = isMedium ? 'column' : 'row';
  const isRumAgent = isRumAgentName(agentName);

  return (
    <AnnotationsContextProvider>
      <ChartPointerEventContextProvider>
        <EuiFlexGroup direction="column" gutterSize="s">
          <EuiFlexItem>
            <EuiPanel hasBorder={true}>
              <LatencyChart height={200} />
            </EuiPanel>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiFlexGroup
              direction={rowDirection}
              gutterSize="s"
              responsive={false}
            >
              <EuiFlexItem grow={3}>
                <ServiceOverviewThroughputChart height={chartHeight} />
              </EuiFlexItem>
              <EuiFlexItem grow={7}>
                <EuiPanel hasBorder={true}>
                  <ServiceOverviewTransactionsTable serviceName={serviceName} />
                </EuiPanel>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiFlexGroup
              direction={rowDirection}
              gutterSize="s"
              responsive={false}
            >
              {!isRumAgent && (
                <EuiFlexItem grow={3}>
                  <TransactionErrorRateChart
                    height={chartHeight}
                    showAnnotations={false}
                  />
                </EuiFlexItem>
              )}
              <EuiFlexItem grow={7}>
                <EuiPanel hasBorder={true}>
                  <ServiceOverviewErrorsTable serviceName={serviceName} />
                </EuiPanel>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiFlexGroup
              direction={rowDirection}
              gutterSize="s"
              responsive={false}
            >
              <EuiFlexItem grow={3}>
                <TransactionBreakdownChart showAnnotations={false} />
              </EuiFlexItem>
              {!isRumAgent && (
                <EuiFlexItem grow={7}>
                  <EuiPanel hasBorder={true}>
                    <ServiceOverviewDependenciesTable
                      serviceName={serviceName}
                    />
                  </EuiPanel>
                </EuiFlexItem>
              )}
            </EuiFlexGroup>
          </EuiFlexItem>
          {!isRumAgent && (
            <EuiFlexItem>
              <EuiFlexGroup
                direction="column"
                gutterSize="s"
                responsive={false}
              >
                <ServiceOverviewInstancesChartAndTable
                  chartHeight={chartHeight}
                  serviceName={serviceName}
                />
              </EuiFlexGroup>
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      </ChartPointerEventContextProvider>
    </AnnotationsContextProvider>
  );
}
