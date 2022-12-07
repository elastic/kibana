/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiPanel,
  EuiSpacer,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { EuiTitle } from '@elastic/eui';
import { EuiHorizontalRule } from '@elastic/eui';
import { EuiCallOut } from '@elastic/eui';
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
} from '../../../../../common/es_fields/apm';
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
      <EuiFlexItem grow={false}>
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
        <EuiHorizontalRule />
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiCallOut
          title={i18n.translate(
            'xpack.apm.serviceOverview.mobileCallOutTitle',
            {
              defaultMessage: 'Mobile APM',
            }
          )}
          iconType="mobile"
        >
          <p>
            <FormattedMessage
              id="xpack.apm.serviceOverview.mobileCallOutText"
              defaultMessage="This is a mobile service, which is currently released as a technical
            preview. You can help us improve the experience by giving feedback. {feedbackLink}."
              values={{
                feedbackLink: (
                  <EuiLink href="https://ela.st/feedback-mobile-apm">
                    {i18n.translate(
                      'xpack.apm.serviceOverview.mobileCallOutLink',
                      {
                        defaultMessage: 'Give feedback',
                      }
                    )}
                  </EuiLink>
                ),
              }}
            />
          </p>
        </EuiCallOut>
        <EuiSpacer size="s" />
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiFlexGroup gutterSize="s">
          <EuiFlexItem grow={5}>
            <EuiPanel hasBorder={true}>
              <LatencyMap filters={filters} />
            </EuiPanel>
          </EuiFlexItem>

          <EuiFlexItem grow={7}>
            <EuiPanel hasBorder={true}>
              <EuiFlexItem grow={false}>
                <EuiTitle size="xs">
                  <h2>
                    {i18n.translate('xpack.apm.serviceOverview.mostUsedTitle', {
                      defaultMessage: 'Most used',
                    })}
                  </h2>
                </EuiTitle>
              </EuiFlexItem>
              <EuiFlexGroup direction={rowDirection} gutterSize="s">
                {/* Device */}
                <EuiFlexItem>
                  <MostUsedChart
                    title={i18n.translate(
                      'xpack.apm.serviceOverview.mostUsed.device',
                      {
                        defaultMessage: 'Devices',
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
                    title={i18n.translate(
                      'xpack.apm.serviceOverview.mostUsed.nct',
                      {
                        defaultMessage: 'Network Connection Type',
                      }
                    )}
                    metric={NETWORK_CONNECTION_TYPE}
                    start={start}
                    end={end}
                    kuery={kuery}
                    filters={filters}
                  />
                </EuiFlexItem>
              </EuiFlexGroup>
              <EuiFlexGroup>
                {/* OS version */}
                <EuiFlexItem>
                  <MostUsedChart
                    title={i18n.translate(
                      'xpack.apm.serviceOverview.mostUsed.osVersion',
                      {
                        defaultMessage: 'OS version',
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
                        defaultMessage: 'App version',
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
            </EuiPanel>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
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
    </EuiFlexGroup>
  );
}
