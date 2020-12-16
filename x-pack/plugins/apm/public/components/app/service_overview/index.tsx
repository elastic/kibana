/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup, EuiFlexItem, EuiPage, EuiPanel } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { useTrackPageview } from '../../../../../observability/public';
import { isRumAgentName } from '../../../../common/agent_name';
import { AnnotationsContextProvider } from '../../../context/annotations/annotations_context';
import { useApmServiceContext } from '../../../context/apm_service/use_apm_service_context';
import { ChartPointerEventContextProvider } from '../../../context/chart_pointer_event/chart_pointer_event_context';
import { LatencyChart } from '../../shared/charts/latency_chart';
import { TransactionBreakdownChart } from '../../shared/charts/transaction_breakdown_chart';
import { TransactionErrorRateChart } from '../../shared/charts/transaction_error_rate_chart';
import { SearchBar } from '../../shared/search_bar';
import { ServiceOverviewDependenciesTable } from './service_overview_dependencies_table';
import { ServiceOverviewErrorsTable } from './service_overview_errors_table';
import { ServiceOverviewInstancesTable } from './service_overview_instances_table';
import { ServiceOverviewThroughputChart } from './service_overview_throughput_chart';
import { ServiceOverviewTransactionsTable } from './service_overview_transactions_table';

/**
 * The height a chart should be if it's next to a table with 5 rows and a title.
 * Add the height of the pagination row.
 */
export const chartHeight = 322;

interface ServiceOverviewProps {
  agentName?: string;
  serviceName: string;
}

export function ServiceOverview({
  agentName,
  serviceName,
}: ServiceOverviewProps) {
  useTrackPageview({ app: 'apm', path: 'service_overview' });
  useTrackPageview({ app: 'apm', path: 'service_overview', delay: 15000 });

  const { transactionType } = useApmServiceContext();
  const transactionTypeLabel = i18n.translate(
    'xpack.apm.serviceOverview.searchBar.transactionTypeLabel',
    { defaultMessage: 'Type: {transactionType}', values: { transactionType } }
  );

  return (
    <AnnotationsContextProvider>
      <ChartPointerEventContextProvider>
        <SearchBar prepend={transactionTypeLabel} />
        <EuiPage>
          <EuiFlexGroup direction="column" gutterSize="s">
            <EuiFlexItem>
              <EuiPanel>
                <LatencyChart height={200} />
              </EuiPanel>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiFlexGroup gutterSize="s">
                <EuiFlexItem grow={4}>
                  <ServiceOverviewThroughputChart height={chartHeight} />
                </EuiFlexItem>
                <EuiFlexItem grow={6}>
                  <EuiPanel>
                    <ServiceOverviewTransactionsTable
                      serviceName={serviceName}
                    />
                  </EuiPanel>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiFlexGroup gutterSize="s">
                {!isRumAgentName(agentName) && (
                  <EuiFlexItem grow={4}>
                    <TransactionErrorRateChart
                      height={chartHeight}
                      showAnnotations={false}
                    />
                  </EuiFlexItem>
                )}
                <EuiFlexItem grow={6}>
                  <EuiPanel>
                    <ServiceOverviewErrorsTable serviceName={serviceName} />
                  </EuiPanel>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiFlexGroup gutterSize="s">
                <EuiFlexItem grow={4}>
                  <TransactionBreakdownChart showAnnotations={false} />
                </EuiFlexItem>
                <EuiFlexItem grow={6}>
                  <EuiPanel>
                    <ServiceOverviewDependenciesTable
                      serviceName={serviceName}
                    />
                  </EuiPanel>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiPanel>
                <ServiceOverviewInstancesTable serviceName={serviceName} />
              </EuiPanel>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiPage>
      </ChartPointerEventContextProvider>
    </AnnotationsContextProvider>
  );
}
