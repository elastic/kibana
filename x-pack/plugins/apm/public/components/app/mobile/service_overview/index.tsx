/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiFlexGroupProps,
  EuiFlexGroup,
  EuiHorizontalRule,
  EuiFlexItem,
  EuiLink,
  EuiPanel,
  EuiSpacer,
  EuiTitle,
  EuiCallOut,
  EuiBadge,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { AnnotationsContextProvider } from '../../../../context/annotations/annotations_context';
import { useApmServiceContext } from '../../../../context/apm_service/use_apm_service_context';
import { ChartPointerEventContextProvider } from '../../../../context/chart_pointer_event/chart_pointer_event_context';
import { useBreakpoints } from '../../../../hooks/use_breakpoints';
import { useApmParams } from '../../../../hooks/use_apm_params';
import { useTimeRange } from '../../../../hooks/use_time_range';
import { useApmRouter } from '../../../../hooks/use_apm_router';
import { ServiceOverviewThroughputChart } from '../../service_overview/service_overview_throughput_chart';
import { TransactionsTable } from '../../../shared/transactions_table';
import {
  DEVICE_MODEL_IDENTIFIER,
  HOST_OS_VERSION,
  NETWORK_CONNECTION_TYPE,
  SERVICE_VERSION,
} from '../../../../../common/es_fields/apm';
import { MostUsedChart } from './most_used_chart';
import { LatencyMap } from './latency_map';
import { FailedTransactionRateChart } from '../../../shared/charts/failed_transaction_rate_chart';
import { ServiceOverviewDependenciesTable } from '../../service_overview/service_overview_dependencies_table';
import { AggregatedTransactionsBadge } from '../../../shared/aggregated_transactions_badge';
import { LatencyChart } from '../../../shared/charts/latency_chart';
import { useFiltersForEmbeddableCharts } from '../../../../hooks/use_filters_for_embeddable_charts';
import { getKueryWithMobileFilters } from '../../../../../common/utils/get_kuery_with_mobile_filters';
import { MobileStats } from './stats';
/**
 * The height a chart should be if it's next to a table with 5 rows and a title.
 * Add the height of the pagination row.
 */
export const chartHeight = 288;

export function MobileServiceOverview() {
  const { serviceName, fallbackToTransactions } = useApmServiceContext();
  const router = useApmRouter();
  const embeddableFilters = useFiltersForEmbeddableCharts();

  const {
    query,
    query: {
      environment,
      kuery,
      rangeFrom,
      rangeTo,
      device,
      osVersion,
      appVersion,
      netConnectionType,
      comparisonEnabled,
    },
  } = useApmParams('/mobile-services/{serviceName}/overview');

  const kueryWithMobileFilters = getKueryWithMobileFilters({
    device,
    osVersion,
    appVersion,
    netConnectionType,
    kuery,
  });

  const { start, end } = useTimeRange({ rangeFrom, rangeTo });
  const dependenciesLink = router.link('/services/{serviceName}/dependencies', {
    path: {
      serviceName,
    },
    query,
  });

  // The default EuiFlexGroup breaks at 768, but we want to break at 1200, so we
  // observe the window width and set the flex directions of rows accordingly
  const { isLarge } = useBreakpoints();
  const isSingleColumn = isLarge;

  const latencyChartHeight = 200;
  const nonLatencyChartHeight = isSingleColumn
    ? latencyChartHeight
    : chartHeight;

  const rowDirection: EuiFlexGroupProps['direction'] = isSingleColumn
    ? 'column'
    : 'row';

  return (
    <AnnotationsContextProvider
      serviceName={serviceName}
      environment={environment}
      start={start}
      end={end}
    >
      <ChartPointerEventContextProvider>
        <EuiFlexGroup direction="column" gutterSize="s">
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
          {fallbackToTransactions && (
            <EuiFlexItem>
              <AggregatedTransactionsBadge />
            </EuiFlexItem>
          )}
          <EuiFlexItem>
            <MobileStats
              start={start}
              end={end}
              kuery={kueryWithMobileFilters}
            />
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiFlexGroup gutterSize="s">
              <EuiFlexItem grow={5}>
                <EuiPanel hasBorder={true}>
                  <LatencyMap
                    start={start}
                    end={end}
                    kuery={kueryWithMobileFilters}
                    filters={embeddableFilters}
                    comparisonEnabled={comparisonEnabled}
                  />
                </EuiPanel>
              </EuiFlexItem>

              <EuiFlexItem grow={7}>
                <EuiPanel hasBorder={true}>
                  <EuiFlexGroup
                    direction={rowDirection}
                    justifyContent="spaceBetween"
                  >
                    <EuiFlexItem grow={false}>
                      <EuiTitle size="xs">
                        <h2>
                          {i18n.translate(
                            'xpack.apm.serviceOverview.mostUsedTitle',
                            {
                              defaultMessage: 'Top 5 most used',
                            }
                          )}
                        </h2>
                      </EuiTitle>
                    </EuiFlexItem>
                    <EuiFlexItem grow={false}>
                      {comparisonEnabled && (
                        <EuiBadge color="warning">
                          {i18n.translate('xpack.apm.comparison.not.support', {
                            defaultMessage: 'comparison not supported',
                          })}
                        </EuiBadge>
                      )}
                    </EuiFlexItem>
                  </EuiFlexGroup>

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
                        metric={DEVICE_MODEL_IDENTIFIER}
                        start={start}
                        end={end}
                        kuery={kueryWithMobileFilters}
                        filters={embeddableFilters}
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
                        kuery={kueryWithMobileFilters}
                        filters={embeddableFilters}
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
                        kuery={kueryWithMobileFilters}
                        filters={embeddableFilters}
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
                        kuery={kueryWithMobileFilters}
                        filters={embeddableFilters}
                      />
                    </EuiFlexItem>
                  </EuiFlexGroup>
                </EuiPanel>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiPanel hasBorder={true}>
              <LatencyChart
                height={latencyChartHeight}
                kuery={kueryWithMobileFilters}
              />
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
                  kuery={kueryWithMobileFilters}
                />
              </EuiFlexItem>
              <EuiFlexItem grow={7}>
                <EuiPanel hasBorder={true}>
                  <TransactionsTable
                    kuery={kueryWithMobileFilters}
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
                  kuery={kueryWithMobileFilters}
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
      </ChartPointerEventContextProvider>
    </AnnotationsContextProvider>
  );
}
