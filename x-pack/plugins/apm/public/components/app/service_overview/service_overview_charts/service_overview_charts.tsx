/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiLink, EuiPanel } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useApmRouter } from '../../../../hooks/use_apm_router';
import { useApmServiceContext } from '../../../../context/apm_service/use_apm_service_context';
import { LatencyChart } from '../../../shared/charts/latency_chart';
import { TransactionBreakdownChart } from '../../../shared/charts/transaction_breakdown_chart';
import { TransactionColdstartRateChart } from '../../../shared/charts/transaction_coldstart_rate_chart';
import { FailedTransactionRateChart } from '../../../shared/charts/failed_transaction_rate_chart';
import { ServiceOverviewDependenciesTable } from '../service_overview_dependencies_table';
import { ServiceOverviewErrorsTable } from '../service_overview_errors_table';
import { ServiceOverviewInstancesChartAndTable } from '../service_overview_instances_chart_and_table';
import { ServiceOverviewThroughputChart } from '../service_overview_throughput_chart';
import { TransactionsTable } from '../../../shared/transactions_table';
import { AggregatedTransactionsBadge } from '../../../shared/aggregated_transactions_badge';
import {
  isRumAgentName,
  isServerlessAgent,
} from '../../../../../common/agent_name';
import { useApmParams } from '../../../../hooks/use_apm_params';
import { useTimeRange } from '../../../../hooks/use_time_range';

interface Props {
  latencyChartHeight: number;
  rowDirection: 'column' | 'row';
  nonLatencyChartHeight: number;
  isSingleColumn: boolean;
}

export function ServiceOverviewCharts({
  latencyChartHeight,
  rowDirection,
  nonLatencyChartHeight,
  isSingleColumn,
}: Props) {
  const router = useApmRouter();
  const { agentName, serviceName, fallbackToTransactions, runtimeName } =
    useApmServiceContext();

  const {
    query,
    query: { environment, kuery, rangeFrom, rangeTo },
  } = useApmParams('/services/{serviceName}/overview');

  const { start, end } = useTimeRange({ rangeFrom, rangeTo });

  const isRumAgent = isRumAgentName(agentName);
  const isServerless = isServerlessAgent(runtimeName);

  const dependenciesLink = router.link('/services/{serviceName}/dependencies', {
    path: {
      serviceName,
    },
    query,
  });

  return (
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
      {!isRumAgent && !isServerless && (
        <EuiFlexItem>
          <EuiFlexGroup direction="column" gutterSize="s" responsive={false}>
            <ServiceOverviewInstancesChartAndTable
              chartHeight={nonLatencyChartHeight}
              serviceName={serviceName}
            />
          </EuiFlexGroup>
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
}
