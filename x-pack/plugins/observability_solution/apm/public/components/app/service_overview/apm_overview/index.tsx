/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  EuiFlexGroup,
  EuiFlexGroupProps,
  EuiFlexItem,
  EuiLink,
  EuiPanel,
  EuiSpacer,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { chartHeight } from '..';
import { AgentName } from '../../../../../typings/es_schemas/ui/fields/agent';
import {
  isOpenTelemetryAgentName,
  isRumAgentName,
  isServerlessAgentName,
} from '../../../../../common/agent_name';
import { useApmServiceContext } from '../../../../context/apm_service/use_apm_service_context';
import { useApmParams } from '../../../../hooks/use_apm_params';
import { useApmRouter } from '../../../../hooks/use_apm_router';
import { useBreakpoints } from '../../../../hooks/use_breakpoints';
import { useTimeRange } from '../../../../hooks/use_time_range';
import { AggregatedTransactionsBadge } from '../../../shared/aggregated_transactions_badge';
import { FailedTransactionRateChart } from '../../../shared/charts/failed_transaction_rate_chart';
import { LatencyChart } from '../../../shared/charts/latency_chart';
import { TransactionBreakdownChart } from '../../../shared/charts/transaction_breakdown_chart';
import { TransactionColdstartRateChart } from '../../../shared/charts/transaction_coldstart_rate_chart';
import { TransactionsTable } from '../../../shared/transactions_table';
import { ServiceOverviewDependenciesTable } from '../service_overview_dependencies_table';
import { ServiceOverviewErrorsTable } from '../service_overview_errors_table';
import { ServiceOverviewInstancesChartAndTable } from '../service_overview_instances_chart_and_table';
import { ServiceOverviewThroughputChart } from '../service_overview_throughput_chart';
import { SloCallout } from '../../../shared/slo_callout';
import { useLocalStorage } from '../../../../hooks/use_local_storage';

const latencyChartHeight = 200;

export function ApmOverview() {
  const router = useApmRouter();
  const { serviceName, fallbackToTransactions, agentName, serverlessType } = useApmServiceContext();
  const {
    query,
    query: { kuery, environment, rangeFrom, rangeTo, transactionType },
  } = useApmParams('/services/{serviceName}/overview');

  const { start, end } = useTimeRange({ rangeFrom, rangeTo });

  const isRumAgent = isRumAgentName(agentName);
  const isOpenTelemetryAgent = isOpenTelemetryAgentName(agentName as AgentName);
  const isServerless = isServerlessAgentName(serverlessType);

  // The default EuiFlexGroup breaks at 768, but we want to break at 1200, so we
  // observe the window width and set the flex directions of rows accordingly
  const { isLarge } = useBreakpoints();
  const isSingleColumn = isLarge;

  const nonLatencyChartHeight = isSingleColumn ? latencyChartHeight : chartHeight;
  const rowDirection: EuiFlexGroupProps['direction'] = isSingleColumn ? 'column' : 'row';

  const [sloCalloutDismissed, setSloCalloutDismissed] = useLocalStorage(
    'apm.sloCalloutDismissed',
    false
  );

  return (
    <>
      {!sloCalloutDismissed && (
        <>
          <SloCallout
            dismissCallout={() => {
              setSloCalloutDismissed(true);
            }}
            serviceName={serviceName}
            environment={environment}
            transactionType={transactionType}
          />
          <EuiSpacer />
        </>
      )}
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
        <EuiFlexGroup direction={rowDirection} gutterSize="s" responsive={false}>
          <EuiFlexItem grow={3}>
            <ServiceOverviewThroughputChart height={nonLatencyChartHeight} kuery={kuery} />
          </EuiFlexItem>
          <EuiFlexItem grow={7}>
            <EuiPanel hasBorder={true}>
              <TransactionsTable
                kuery={kuery}
                environment={environment}
                fixedHeight={true}
                start={start}
                end={end}
                showPerPageOptions={false}
                numberOfTransactionsPerPage={5}
                showSparkPlots={!isSingleColumn}
              />
            </EuiPanel>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiFlexGroup direction={rowDirection} gutterSize="s" responsive={false}>
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
        <EuiFlexGroup direction={rowDirection} gutterSize="s" responsive={false}>
          {isServerless ? (
            <EuiFlexItem grow={3}>
              <TransactionColdstartRateChart
                showAnnotations={false}
                environment={environment}
                kuery={kuery}
              />
            </EuiFlexItem>
          ) : (
            !isOpenTelemetryAgent && (
              <EuiFlexItem grow={3}>
                <TransactionBreakdownChart
                  showAnnotations={false}
                  environment={environment}
                  kuery={kuery}
                />
              </EuiFlexItem>
            )
          )}
          {!isRumAgent && (
            <EuiFlexItem grow={7}>
              <EuiPanel hasBorder={true}>
                <ServiceOverviewDependenciesTable
                  fixedHeight={true}
                  showPerPageOptions={false}
                  link={
                    <EuiLink
                      data-test-subj="apmServiceOverviewViewDependenciesLink"
                      href={router.link('/services/{serviceName}/dependencies', {
                        path: { serviceName },
                        query,
                      })}
                    >
                      {i18n.translate('xpack.apm.serviceOverview.dependenciesTableTabLink', {
                        defaultMessage: 'View dependencies',
                      })}
                    </EuiLink>
                  }
                  showSparkPlots={!isSingleColumn}
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
    </>
  );
}
