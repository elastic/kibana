/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiLink, EuiPanel } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { useHistory } from 'react-router-dom';
import {
  isRumAgentName,
  isIosAgentName,
  isServerlessAgent,
} from '../../../../common/agent_name';
import { AnnotationsContextProvider } from '../../../context/annotations/annotations_context';
import { useApmServiceContext } from '../../../context/apm_service/use_apm_service_context';
import { ChartPointerEventContextProvider } from '../../../context/chart_pointer_event/chart_pointer_event_context';
import { useBreakpoints } from '../../../hooks/use_breakpoints';
import { LatencyChart } from '../../shared/charts/latency_chart';
import { TransactionBreakdownChart } from '../../shared/charts/transaction_breakdown_chart';
import { TransactionColdstartRateChart } from '../../shared/charts/transaction_coldstart_rate_chart';
import { FailedTransactionRateChart } from '../../shared/charts/failed_transaction_rate_chart';
import { ServiceOverviewDependenciesTable } from './service_overview_dependencies_table';
import { ServiceOverviewErrorsTable } from './service_overview_errors_table';
import { ServiceOverviewInstancesChartAndTable } from './service_overview_instances_chart_and_table';
import { ServiceOverviewThroughputChart } from './service_overview_throughput_chart';
import { TransactionsTable } from '../../shared/transactions_table';
import { useApmParams } from '../../../hooks/use_apm_params';
import { AggregatedTransactionsBadge } from '../../shared/aggregated_transactions_badge';
import { useApmRouter } from '../../../hooks/use_apm_router';
import { useTimeRange } from '../../../hooks/use_time_range';
import { replace } from '../../shared/links/url_helpers';

/**
 * The height a chart should be if it's next to a table with 5 rows and a title.
 * Add the height of the pagination row.
 */
export const chartHeight = 288;

export function ServiceOverview() {
  const {
    agentName,
    serviceName,
    transactionType,
    fallbackToTransactions,
    runtimeName,
  } = useApmServiceContext();
  const {
    query,
    query: {
      environment,
      kuery,
      rangeFrom,
      rangeTo,
      transactionType: transactionTypeFromUrl,
    },
  } = useApmParams('/services/{serviceName}/overview');

  const { start, end } = useTimeRange({ rangeFrom, rangeTo });

  const history = useHistory();

  // redirect to first transaction type
  if (!transactionTypeFromUrl && transactionType) {
    replace(history, { query: { transactionType } });
  }

  const latencyChartHeight = 200;

  // The default EuiFlexGroup breaks at 768, but we want to break at 1200, so we
  // observe the window width and set the flex directions of rows accordingly
  const { isLarge } = useBreakpoints();
  const isSingleColumn = isLarge;
  const nonLatencyChartHeight = isSingleColumn
    ? latencyChartHeight
    : chartHeight;
  const rowDirection = isSingleColumn ? 'column' : 'row';
  const isRumAgent = isRumAgentName(agentName);
  const isIosAgent = isIosAgentName(agentName);
  const isServerless = isServerlessAgent(runtimeName);
  const router = useApmRouter();
  const dependenciesLink = router.link('/services/{serviceName}/dependencies', {
    path: {
      serviceName,
    },
    query,
  });

  return (
    <AnnotationsContextProvider
      serviceName={serviceName}
      environment={environment}
      start={start}
      end={end}
    >
      <ChartPointerEventContextProvider>
        <EuiFlexGroup direction="column" gutterSize="s">
          {fallbackToTransactions && (
            <EuiFlexItem>
              <AggregatedTransactionsBadge />
            </EuiFlexItem>
          )}
          <EuiFlexItem>
            <EuiPanel hasBorder={true}>
              <LatencyChart height={latencyChartHeight} kuery={kuery} />
            </EuiPanel>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiFlexGroup
              direction={rowDirection}
              gutterSize="s"
              responsive={false}
            >
              <EuiFlexItem grow={3}>
                <ServiceOverviewThroughputChart
                  height={nonLatencyChartHeight}
                  kuery={kuery}
                />
              </EuiFlexItem>
              <EuiFlexItem grow={7}>
                <EuiPanel hasBorder={true}>
                  <TransactionsTable
                    kuery={kuery}
                    environment={environment}
                    fixedHeight={true}
                    isSingleColumn={isSingleColumn}
                    start={start}
                    end={end}
                    showPerPageOptions={false}
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
                  <FailedTransactionRateChart
                    height={nonLatencyChartHeight}
                    showAnnotations={false}
                    kuery={kuery}
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
              {isServerless ? (
                <EuiFlexItem grow={3}>
                  <TransactionColdstartRateChart
                    showAnnotations={false}
                    environment={environment}
                    kuery={kuery}
                  />
                </EuiFlexItem>
              ) : (
                <EuiFlexItem grow={3}>
                  <TransactionBreakdownChart
                    showAnnotations={false}
                    environment={environment}
                    kuery={kuery}
                  />
                </EuiFlexItem>
              )}
              {!isRumAgent && (
                <EuiFlexItem grow={7}>
                  <EuiPanel hasBorder={true}>
                    <ServiceOverviewDependenciesTable
                      fixedHeight={true}
                      isSingleColumn={isSingleColumn}
                      showPerPageOptions={false}
                      link={
                        <EuiLink href={dependenciesLink}>
                          {i18n.translate(
                            'xpack.apm.serviceOverview.dependenciesTableTabLink',
                            { defaultMessage: 'View dependencies' }
                          )}
                        </EuiLink>
                      }
                    />
                  </EuiPanel>
                </EuiFlexItem>
              )}
            </EuiFlexGroup>
          </EuiFlexItem>
          {!isRumAgent && !isIosAgent && !isServerless && (
            <EuiFlexItem>
              <EuiFlexGroup
                direction="column"
                gutterSize="s"
                responsive={false}
              >
                <ServiceOverviewInstancesChartAndTable
                  chartHeight={nonLatencyChartHeight}
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
