/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  EuiSpacer,
  EuiTitle,
  EuiPanel,
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { ChartPointerEventContextProvider } from '../../../context/chart_pointer_event/chart_pointer_event_context';
import { ServiceOverviewDependenciesTable } from '../service_overview/service_overview_dependencies_table';
import { ServiceDependenciesBreakdownChart } from './service_dependencies_breakdown_chart';
import { useSearchAggregatedTransactionsFetcher } from '../../../hooks/use_search_aggregated_transactions_fetcher';
import { AggregatedTransactionsCallout } from '../../shared/aggregated_transactions_callout';

export function ServiceDependencies() {
  const {
    searchAggregatedTransactions,
  } = useSearchAggregatedTransactionsFetcher();
  return (
    <>
      <ChartPointerEventContextProvider>
        {!searchAggregatedTransactions && (
          <>
            <EuiFlexGroup>
              <EuiFlexItem>
                <AggregatedTransactionsCallout />
              </EuiFlexItem>
            </EuiFlexGroup>
            <EuiSpacer size="s" />
          </>
        )}
        <EuiPanel hasBorder={true}>
          <EuiTitle size="xs">
            <h2>
              {i18n.translate(
                'xpack.apm.serviceDependencies.breakdownChartTitle',
                {
                  defaultMessage: 'Time spent by dependency',
                }
              )}
            </h2>
          </EuiTitle>
          <ServiceDependenciesBreakdownChart height={200} />
        </EuiPanel>
      </ChartPointerEventContextProvider>
      <EuiSpacer size="m" />
      <ServiceOverviewDependenciesTable />
    </>
  );
}
