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
import { UserExperienceCallout } from '../transaction_overview/user_experience_callout';
import { ServiceOverviewDependenciesTable } from './service_overview_dependencies_table';
import { ServiceOverviewErrorsTable } from './service_overview_errors_table';
import { ServiceOverviewInstancesTable } from './service_overview_instances_table';
import { ServiceOverviewThroughputChart } from './service_overview_throughput_chart';
import { ServiceOverviewTransactionsTable } from './service_overview_transactions_table';
import { useShouldUseMobileLayout } from './use_should_use_mobile_layout';

/**
 * The height a chart should be if it's next to a table with 5 rows and a title.
 * Add the height of the pagination row.
 */
export const chartHeight = 288;

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

  // The default EuiFlexGroup breaks at 768, but we want to break at 992, so we
  // observe the window width and set the flex directions of rows accordingly
  const shouldUseMobileLayout = useShouldUseMobileLayout();
  const rowDirection = shouldUseMobileLayout ? 'column' : 'row';

  const { transactionType } = useApmServiceContext();
  const transactionTypeLabel = i18n.translate(
    'xpack.apm.serviceOverview.searchBar.transactionTypeLabel',
    { defaultMessage: 'Type: {transactionType}', values: { transactionType } }
  );
  const isRumAgent = isRumAgentName(agentName);

  return (
    <AnnotationsContextProvider>
      <ChartPointerEventContextProvider>
        <SearchBar prepend={transactionTypeLabel} />
        <EuiPage>
          <EuiFlexGroup direction="column" gutterSize="s">
            {isRumAgent && (
              <EuiFlexItem>
                <UserExperienceCallout serviceName={serviceName} />
              </EuiFlexItem>
            )}
            <EuiFlexItem>
              <EuiPanel>
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
                  <EuiPanel>
                    <ServiceOverviewTransactionsTable
                      serviceName={serviceName}
                    />
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
                  <EuiPanel>
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
                    <EuiPanel>
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
                <EuiPanel>
                  <ServiceOverviewInstancesTable serviceName={serviceName} />
                </EuiPanel>
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        </EuiPage>
      </ChartPointerEventContextProvider>
    </AnnotationsContextProvider>
  );
}
