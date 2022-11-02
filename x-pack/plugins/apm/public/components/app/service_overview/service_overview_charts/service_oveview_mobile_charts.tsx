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
import { FailedTransactionRateChart } from '../../../shared/charts/failed_transaction_rate_chart';
import { ServiceOverviewDependenciesTable } from '../service_overview_dependencies_table';
import { ServiceOverviewThroughputChart } from '../service_overview_throughput_chart';
import { TransactionsTable } from '../../../shared/transactions_table';
import { AggregatedTransactionsBadge } from '../../../shared/aggregated_transactions_badge';
import { useApmParams } from '../../../../hooks/use_apm_params';
import { useTimeRange } from '../../../../hooks/use_time_range';
import { MostUsedChart } from './most_used_chart';
import { LatencyMap } from './latency_map';
import { MobileFilters } from './filters';
import { useFiltersForMobileCharts } from './use_filters_for_mobile_charts';
import {
  DEVICE_MODEL_NAME,
  HOST_OS_VERSION,
  NETWORK_CONNECTION_TYPE,
  SERVICE_VERSION,
} from '../../../../../common/elasticsearch_fieldnames';
interface Props {
  latencyChartHeight: number;
  rowDirection: 'column' | 'row';
  nonLatencyChartHeight: number;
  isSingleColumn: boolean;
}

export function ServiceOverviewMobileCharts({
  latencyChartHeight,
  rowDirection,
  nonLatencyChartHeight,
  isSingleColumn,
}: Props) {
  const { fallbackToTransactions, serviceName } = useApmServiceContext();
  const router = useApmRouter();
  const filters = useFiltersForMobileCharts();

  const {
    query,
    query: {
      environment,
      kuery,
      rangeFrom,
      rangeTo,
      netConnectionType,
      device,
      osVersion,
      appVersion,
      transactionType,
    },
  } = useApmParams('/services/{serviceName}/overview');

  const { start, end } = useTimeRange({ rangeFrom, rangeTo });

  const dependenciesLink = router.link('/services/{serviceName}/dependencies', {
    path: {
      serviceName,
    },
    query,
  });

  return (
    <EuiFlexGroup direction="column" gutterSize="s">
      <EuiFlexItem>
        <MobileFilters
          start={start}
          end={end}
          environment={environment}
          transactionType={transactionType}
          kuery={kuery}
          filters={{
            device,
            osVersion,
            appVersion,
            netConnectionType,
          }}
        />
      </EuiFlexItem>
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
          <EuiFlexItem grow={3}>
            <FailedTransactionRateChart
              height={nonLatencyChartHeight}
              showAnnotations={false}
              kuery={kuery}
            />
          </EuiFlexItem>

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
        </EuiFlexGroup>
      </EuiFlexItem>

      <EuiFlexItem>
        <EuiPanel hasBorder={true}>
          <LatencyMap filters={filters} />
        </EuiPanel>
      </EuiFlexItem>

      <EuiFlexItem>
        <EuiFlexGroup direction={rowDirection} gutterSize="s">
          {/* Device */}
          <EuiFlexItem>
            <MostUsedChart
              title={i18n.translate(
                'xpack.apm.serviceOverview.mostUsed.device',
                {
                  defaultMessage: 'Most used device',
                }
              )}
              metric={DEVICE_MODEL_NAME}
              start={start}
              end={end}
              kuery={kuery}
              filters={filters}
            />
          </EuiFlexItem>
          {/* NCT */}
          <EuiFlexItem>
            <MostUsedChart
              title={i18n.translate('xpack.apm.serviceOverview.mostUsed.nct', {
                defaultMessage: 'Most used NCT',
              })}
              metric={NETWORK_CONNECTION_TYPE}
              start={start}
              end={end}
              kuery={kuery}
              filters={filters}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiFlexGroup direction={rowDirection} gutterSize="s">
          {/* OS Version */}
          <EuiFlexItem>
            <MostUsedChart
              title={i18n.translate(
                'xpack.apm.serviceOverview.mostUsed.osVersion',
                {
                  defaultMessage: 'Most used OS version',
                }
              )}
              metric={HOST_OS_VERSION}
              start={start}
              end={end}
              kuery={kuery}
              filters={filters}
            />
          </EuiFlexItem>
          {/* App version */}
          <EuiFlexItem>
            <MostUsedChart
              title={i18n.translate(
                'xpack.apm.serviceOverview.mostUsed.appVersion',
                {
                  defaultMessage: 'Most used app version',
                }
              )}
              metric={SERVICE_VERSION}
              start={start}
              end={end}
              kuery={kuery}
              filters={filters}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
