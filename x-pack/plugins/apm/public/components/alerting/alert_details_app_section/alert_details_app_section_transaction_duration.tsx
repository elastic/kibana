/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiFlexGroup } from '@elastic/eui';
import { Rule, RuleTypeParams } from '@kbn/alerting-plugin/common';
import { EuiFlexItem } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { EuiPanel } from '@elastic/eui';
import { EuiTitle } from '@elastic/eui';
import { EuiIconTip } from '@elastic/eui';
import { asPercent } from '../../../../common/utils/formatters';
import { APIReturnType } from '../../../services/rest/create_call_apm_api';
import { getDurationFormatter } from '../../../../common/utils/formatters/duration';
import { ApmMlDetectorType } from '../../../../common/anomaly_detection/apm_ml_detectors';
import { LatencyAggregationType } from '../../../../common/latency_aggregation_types';
import { useFetcher } from '../../../hooks/use_fetcher';
import { useTimeRange } from '../../../hooks/use_time_range';
import { isTimeComparison } from '../../shared/time_comparison/get_comparison_options';
import { getComparisonChartTheme } from '../../shared/time_comparison/get_comparison_chart_theme';
import { getLatencyChartSelector } from '../../../selectors/latency_chart_selectors';
import { TimeseriesChart } from '../../shared/charts/timeseries_chart';
import { filterNil } from '../../shared/charts/latency_chart';
import { usePreferredServiceAnomalyTimeseries } from '../../../hooks/use_preferred_service_anomaly_timeseries';
import {
  getMaxY,
  getResponseTimeTickFormatter,
} from '../../shared/charts/transaction_charts/helper';
import { ChartPointerEventContextProvider } from '../../../context/chart_pointer_event/chart_pointer_event_context';
import {
  ChartType,
  getTimeSeriesColor,
} from '../../shared/charts/helper/get_timeseries_color';

export interface AlertDetailsAppSectionProps {
  rule: Rule<RuleTypeParams>;
  timeZone: string;
}
export function AlertDetailsAppSectionTransactionDuration({
  rule,
  timeZone,
}: AlertDetailsAppSectionProps) {
  const params = rule.params;
  const environment = String(params.environment);
  const latencyAggregationType =
    params.aggregationType as LatencyAggregationType;
  const serviceName = String(params.serviceName);
  const transactionType = String(params.transactionType);
  const comparisonEnabled = false;
  const offset = '1d';
  const rangeFrom = 'now-60m';
  const rangeTo = 'now';
  const { start, end } = useTimeRange({ rangeFrom, rangeTo });
  const comparisonChartTheme = getComparisonChartTheme();
  const INITIAL_STATE = {
    currentPeriod: [],
    previousPeriod: [],
  };

  /* Latency Chart */
  const { data, error, status } = useFetcher(
    (callApmApi) => {
      if (
        serviceName &&
        start &&
        end &&
        transactionType &&
        latencyAggregationType
      ) {
        return callApmApi(
          `GET /internal/apm/services/{serviceName}/transactions/charts/latency`,
          {
            params: {
              path: { serviceName },
              query: {
                environment,
                kuery: '',
                start,
                end,
                transactionType,
                transactionName: undefined,
                latencyAggregationType,
                offset:
                  comparisonEnabled && isTimeComparison(offset)
                    ? offset
                    : undefined,
              },
            },
          }
        );
      }
    },
    [
      comparisonEnabled,
      end,
      environment,
      latencyAggregationType,
      serviceName,
      start,
      transactionType,
    ]
  );

  const memoizedData = useMemo(
    () =>
      getLatencyChartSelector({
        latencyChart: data,
        latencyAggregationType,
        previousPeriodLabel: '',
      }),
    // It should only update when the data has changed
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data]
  );
  const { currentPeriod, previousPeriod } = memoizedData;

  const timeseriesLatency = [
    currentPeriod,
    comparisonEnabled && isTimeComparison(offset) ? previousPeriod : undefined,
  ].filter(filterNil);
  const latencyMaxY = getMaxY(timeseriesLatency);
  const latencyFormatter = getDurationFormatter(latencyMaxY);
  const preferredAnomalyTimeseriesLatency =
    usePreferredServiceAnomalyTimeseries(ApmMlDetectorType.txLatency);

  /* Latency Chart */

  /* Throughput Chart */
  const { data: dataThroughput = INITIAL_STATE, status: statusThroughput } =
    useFetcher(
      (callApmApi) => {
        if (serviceName && transactionType && start && end) {
          return callApmApi(
            'GET /internal/apm/services/{serviceName}/throughput',
            {
              params: {
                path: {
                  serviceName,
                },
                query: {
                  environment,
                  kuery: '',
                  start,
                  end,
                  transactionType,
                  offset:
                    comparisonEnabled && isTimeComparison(offset)
                      ? offset
                      : undefined,
                  transactionName: undefined,
                },
              },
            }
          );
        }
      },
      [
        environment,
        serviceName,
        start,
        end,
        transactionType,
        offset,
        comparisonEnabled,
      ]
    );
  const { currentPeriodColor, previousPeriodColor } = getTimeSeriesColor(
    ChartType.THROUGHPUT
  );
  const timeseriesThroughput = [
    {
      data: dataThroughput.currentPeriod,
      type: 'linemark',
      color: currentPeriodColor,
      title: i18n.translate('xpack.apm.serviceOverview.throughtputChartTitle', {
        defaultMessage: 'Throughput',
      }),
    },
    ...(comparisonEnabled
      ? [
          {
            data: dataThroughput.previousPeriod,
            type: 'area',
            color: previousPeriodColor,
            title: '',
          },
        ]
      : []),
  ];
  const preferredAnomalyTimeseriesThroughput =
    usePreferredServiceAnomalyTimeseries(ApmMlDetectorType.txThroughput);
  /* Throughput Chart */

  /* Error Rate */
  type ErrorRate =
    APIReturnType<'GET /internal/apm/services/{serviceName}/transactions/charts/error_rate'>;

  const INITIAL_STATE_ERROR_RATE: ErrorRate = {
    currentPeriod: {
      timeseries: [],
      average: null,
    },
    previousPeriod: {
      timeseries: [],
      average: null,
    },
  };
  function yLabelFormat(y?: number | null) {
    return asPercent(y || 0, 1);
  }
  const {
    data: dataErrorRate = INITIAL_STATE_ERROR_RATE,
    status: statusErrorRate,
  } = useFetcher(
    (callApmApi) => {
      if (transactionType && serviceName && start && end) {
        return callApmApi(
          'GET /internal/apm/services/{serviceName}/transactions/charts/error_rate',
          {
            params: {
              path: {
                serviceName,
              },
              query: {
                environment,
                kuery: '',
                start,
                end,
                transactionType,
                transactionName: undefined,
                offset:
                  comparisonEnabled && isTimeComparison(offset)
                    ? offset
                    : undefined,
              },
            },
          }
        );
      }
    },
    [
      environment,
      serviceName,
      start,
      end,
      transactionType,
      offset,
      comparisonEnabled,
    ]
  );

  const {
    currentPeriodColor: currentPeriodColorErrorRate,
    previousPeriodColor: previousPeriodColorErrorRate,
  } = getTimeSeriesColor(ChartType.FAILED_TRANSACTION_RATE);

  const timeseriesErrorRate = [
    {
      data: dataErrorRate.currentPeriod.timeseries,
      type: 'linemark',
      color: currentPeriodColorErrorRate,
      title: i18n.translate('xpack.apm.errorRate.chart.errorRate', {
        defaultMessage: 'Failed transaction rate (avg.)',
      }),
    },
    ...(comparisonEnabled
      ? [
          {
            data: dataErrorRate.previousPeriod.timeseries,
            type: 'area',
            color: previousPeriodColorErrorRate,
            title: '',
          },
        ]
      : []),
  ];

  const preferredAnomalyTimeseriesErrorRate =
    usePreferredServiceAnomalyTimeseries(ApmMlDetectorType.txFailureRate);
  /* Error Rate */

  const anomalyTimeseriesColor = previousPeriod?.color as string;

  return (
    <EuiFlexGroup direction="column" gutterSize="s">
      <ChartPointerEventContextProvider>
        <EuiFlexItem>
          <EuiPanel hasBorder={true}>
            <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiTitle size="xs">
                  <h2>
                    {i18n.translate(
                      'xpack.apm.dependencyLatencyChart.chartTitle',
                      {
                        defaultMessage: 'Latency',
                      }
                    )}
                  </h2>
                </EuiTitle>
              </EuiFlexItem>
            </EuiFlexGroup>
            <TimeseriesChart
              id="latencyChart"
              height={200}
              comparisonEnabled={comparisonEnabled}
              offset={offset}
              fetchStatus={status}
              customTheme={comparisonChartTheme}
              timeseries={timeseriesLatency}
              yLabelFormat={getResponseTimeTickFormatter(latencyFormatter)}
              anomalyTimeseries={
                preferredAnomalyTimeseriesThroughput
                  ? {
                      ...preferredAnomalyTimeseriesThroughput,
                      color: anomalyTimeseriesColor,
                    }
                  : undefined
              }
              timeZone={timeZone}
            />
          </EuiPanel>
        </EuiFlexItem>

        <EuiFlexItem>
          <EuiFlexGroup direction="row" gutterSize="s">
            <EuiFlexItem>
              <EuiPanel hasBorder={true}>
                <EuiFlexGroup
                  alignItems="center"
                  gutterSize="s"
                  responsive={false}
                >
                  <EuiFlexItem grow={false}>
                    <EuiTitle size="xs">
                      <h2>
                        {i18n.translate(
                          'xpack.apm.serviceOverview.throughtputChartTitle',
                          { defaultMessage: 'Throughput' }
                        )}
                      </h2>
                    </EuiTitle>
                  </EuiFlexItem>

                  <EuiFlexItem grow={false}>
                    <EuiIconTip
                      content={i18n.translate(
                        'xpack.apm.serviceOverview.tpmHelp',
                        {
                          defaultMessage:
                            'Throughput is measured in transactions per minute (tpm).',
                        }
                      )}
                      position="right"
                    />
                  </EuiFlexItem>
                </EuiFlexGroup>

                <TimeseriesChart
                  id="throughput"
                  height={200}
                  comparisonEnabled={comparisonEnabled}
                  offset={offset}
                  fetchStatus={statusThroughput}
                  customTheme={comparisonChartTheme}
                  timeseries={timeseriesThroughput}
                  yLabelFormat={getResponseTimeTickFormatter(latencyFormatter)}
                  anomalyTimeseries={
                    preferredAnomalyTimeseriesLatency
                      ? {
                          ...preferredAnomalyTimeseriesLatency,
                          color: anomalyTimeseriesColor,
                        }
                      : undefined
                  }
                  timeZone={timeZone}
                />
              </EuiPanel>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiPanel hasBorder={true}>
                <EuiFlexGroup
                  alignItems="center"
                  gutterSize="s"
                  responsive={false}
                >
                  <EuiFlexItem grow={false}>
                    <EuiTitle size="xs">
                      <h2>
                        {i18n.translate('xpack.apm.errorRate', {
                          defaultMessage: 'Failed transaction rate',
                        })}
                      </h2>
                    </EuiTitle>
                  </EuiFlexItem>

                  <EuiFlexItem grow={false}>
                    <EuiIconTip
                      content={i18n.translate('xpack.apm.errorRate.tip', {
                        defaultMessage:
                          "The percentage of failed transactions for the selected service. HTTP server transactions with a 4xx status code (client error) aren't considered failures because the caller, not the server, caused the failure.",
                      })}
                      position="right"
                    />
                  </EuiFlexItem>
                </EuiFlexGroup>

                <TimeseriesChart
                  id="errorRate"
                  height={200}
                  showAnnotations={false}
                  fetchStatus={statusErrorRate}
                  timeseries={timeseriesErrorRate}
                  yLabelFormat={yLabelFormat}
                  yDomain={{ min: 0, max: 1 }}
                  comparisonEnabled={false}
                  customTheme={comparisonChartTheme}
                  anomalyTimeseries={
                    preferredAnomalyTimeseriesErrorRate
                      ? {
                          ...preferredAnomalyTimeseriesErrorRate,
                          color: previousPeriodColorErrorRate,
                        }
                      : undefined
                  }
                  timeZone={timeZone}
                />
              </EuiPanel>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </ChartPointerEventContextProvider>
    </EuiFlexGroup>
  );
}

// eslint-disable-next-line import/no-default-export
export default AlertDetailsAppSectionTransactionDuration;
