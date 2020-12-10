/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiPage,
  EuiPanel,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { useTrackPageview } from '../../../../../observability/public';
import { isRumAgentName } from '../../../../common/agent_name';
import { ChartPointerEventContextProvider } from '../../../context/chart_pointer_event/chart_pointer_event_context';
import { TransactionBreakdownChart } from '../../shared/charts/transaction_breakdown_chart';
import { TransactionErrorRateChart } from '../../shared/charts/transaction_error_rate_chart';
import { SearchBar } from '../../shared/search_bar';
import { ServiceOverviewErrorsTable } from './service_overview_errors_table';
import { ServiceOverviewDependenciesTable } from './service_overview_dependencies_table';
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

  return (
    <ChartPointerEventContextProvider>
      <SearchBar />
      <EuiPage>
        <EuiFlexGroup direction="column" gutterSize="s">
          <EuiFlexItem>
            <EuiPanel>
              <EuiTitle size="xs">
                <h2>
                  {i18n.translate(
                    'xpack.apm.serviceOverview.latencyChartTitle',
                    {
                      defaultMessage: 'Latency',
                    }
                  )}
                </h2>
              </EuiTitle>
            </EuiPanel>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiFlexGroup gutterSize="s">
              <EuiFlexItem grow={4}>
                <ServiceOverviewThroughputChart height={chartHeight} />
              </EuiFlexItem>
              <EuiFlexItem grow={6}>
                <EuiPanel>
                  <ServiceOverviewTransactionsTable serviceName={serviceName} />
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
                  <ServiceOverviewDependenciesTable serviceName={serviceName} />
                </EuiPanel>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiFlexGroup gutterSize="s">
              <EuiFlexItem grow={4}>
                <EuiPanel>
                  <EuiTitle size="xs">
                    <h2>
                      {i18n.translate(
                        'xpack.apm.serviceOverview.instancesLatencyDistributionChartTitle',
                        {
                          defaultMessage: 'Instances latency distribution',
                        }
                      )}
                    </h2>
                  </EuiTitle>
                </EuiPanel>
              </EuiFlexItem>
              <EuiFlexItem grow={6}>
                <EuiPanel>
                  <EuiTitle size="xs">
                    <h2>
                      {i18n.translate(
                        'xpack.apm.serviceOverview.instancesTableTitle',
                        {
                          defaultMessage: 'Instances',
                        }
                      )}
                    </h2>
                  </EuiTitle>
                </EuiPanel>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPage>
    </ChartPointerEventContextProvider>
  );
}
