/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import type { RegisterFunctionDefinition } from '@kbn/observability-ai-assistant-plugin/common/types';
import { groupBy } from 'lodash';
import React from 'react';
import { i18n } from '@kbn/i18n';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { FETCH_STATUS } from '../hooks/use_fetcher';
import { callApmApi } from '../services/rest/create_call_apm_api';
import { getTimeZone } from '../components/shared/charts/helper/timezone';
import { TimeseriesChart } from '../components/shared/charts/timeseries_chart';
import { ChartPointerEventContextProvider } from '../context/chart_pointer_event/chart_pointer_event_context';
import { ApmThemeProvider } from '../components/routing/app_root';
import { Coordinate, TimeSeries } from '../../typings/timeseries';
import {
  ChartType,
  getTimeSeriesColor,
} from '../components/shared/charts/helper/get_timeseries_color';
import { LatencyAggregationType } from '../../common/latency_aggregation_types';
import {
  asPercent,
  asTransactionRate,
  getDurationFormatter,
} from '../../common/utils/formatters';
import {
  getMaxY,
  getResponseTimeTickFormatter,
} from '../components/shared/charts/transaction_charts/helper';
import { NON_EMPTY_STRING } from '../utils/non_empty_string_ref';

export function registerGetApmTimeseriesFunction({
  registerFunction,
}: {
  registerFunction: RegisterFunctionDefinition;
}) {
  registerFunction(
    {
      contexts: ['apm'],
      name: 'get_apm_timeseries',
      descriptionForUser: i18n.translate(
        'xpack.apm.observabilityAiAssistant.functions.registerGetApmTimeseries.descriptionForUser',
        {
          defaultMessage: `Display different APM metrics, like throughput, failure rate, or latency, for any service or all services, or any or all of its dependencies, both as a timeseries and as a single statistic. Additionally, the function will return any changes, such as spikes, step and trend changes, or dips. You can also use it to compare data by requesting two different time ranges, or for instance two different service versions`,
        }
      ),
      description: `Visualise and analyse different APM metrics, like throughput, failure rate, or latency, for any service or all services, or any or all of its dependencies, both as a timeseries and as a single statistic. A visualisation will be displayed above your reply - DO NOT attempt to display or generate an image yourself, or any other placeholder. Additionally, the function will return any changes, such as spikes, step and trend changes, or dips. You can also use it to compare data by requesting two different time ranges, or for instance two different service versions.`,
      parameters: {
        type: 'object',
        properties: {
          start: {
            type: 'string',
            description:
              'The start of the time range, in Elasticsearch date math, like `now`.',
          },
          end: {
            type: 'string',
            description:
              'The end of the time range, in Elasticsearch date math, like `now-24h`.',
          },
          stats: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                timeseries: {
                  description: 'The metric to be displayed',
                  oneOf: [
                    {
                      type: 'object',
                      properties: {
                        name: {
                          type: 'string',
                          enum: [
                            'transaction_throughput',
                            'transaction_failure_rate',
                          ],
                        },
                        'transaction.type': {
                          type: 'string',
                          description: 'The transaction type',
                        },
                      },
                      required: ['name'],
                    },
                    {
                      type: 'object',
                      properties: {
                        name: {
                          type: 'string',
                          enum: [
                            'exit_span_throughput',
                            'exit_span_failure_rate',
                            'exit_span_latency',
                          ],
                        },
                        'span.destination.service.resource': {
                          type: 'string',
                          description:
                            'The name of the downstream dependency for the service',
                        },
                      },
                      required: ['name'],
                    },
                    {
                      type: 'object',
                      properties: {
                        name: {
                          type: 'string',
                          const: 'error_event_rate',
                        },
                      },
                      required: ['name'],
                    },
                    {
                      type: 'object',
                      properties: {
                        name: {
                          type: 'string',
                          const: 'transaction_latency',
                        },
                        'transaction.type': {
                          type: 'string',
                        },
                        function: {
                          type: 'string',
                          enum: ['avg', 'p95', 'p99'],
                        },
                      },
                      required: ['name', 'function'],
                    },
                  ],
                },
                'service.name': {
                  ...NON_EMPTY_STRING,
                  description: 'The name of the service',
                },
                'service.environment': {
                  description:
                    'The environment that the service is running in. If undefined, all environments will be included. Only use this if you have confirmed the environment that the service is running in.',
                },
                filter: {
                  type: 'string',
                  description:
                    'a KQL query to filter the data by. If no filter should be applied, leave it empty.',
                },
                title: {
                  type: 'string',
                  description:
                    'A unique, human readable, concise title for this specific group series.',
                },
                offset: {
                  type: 'string',
                  description:
                    'The offset. Right: 15m. 8h. 1d. Wrong: -15m. -8h. -1d.',
                },
              },
              required: ['service.name', 'timeseries', 'title'],
            },
          },
        },
        required: ['stats', 'start', 'end'],
      } as const,
    },
    async ({ arguments: { stats, start, end } }, signal) => {
      const response = await callApmApi(
        'POST /internal/apm/assistant/get_apm_timeseries',
        {
          signal,
          params: {
            body: { stats: stats as any, start, end },
          },
        }
      );

      return response;
    },
    ({ arguments: args, response }) => {
      const groupedSeries = groupBy(response.data, (series) => series.group);

      const {
        services: { uiSettings },
      } = useKibana();

      const timeZone = getTimeZone(uiSettings);

      return (
        <ChartPointerEventContextProvider>
          <ApmThemeProvider>
            <EuiFlexGroup direction="column">
              {Object.values(groupedSeries).map((groupSeries) => {
                const groupId = groupSeries[0].group;

                const maxY = getMaxY(groupSeries);
                const latencyFormatter = getDurationFormatter(maxY, 10, 1000);

                let yLabelFormat: (value: number) => string;

                const firstStat = groupSeries[0].stat;

                switch (firstStat.timeseries.name) {
                  case 'transaction_throughput':
                  case 'exit_span_throughput':
                  case 'error_event_rate':
                    yLabelFormat = asTransactionRate;
                    break;

                  case 'transaction_latency':
                  case 'exit_span_latency':
                    yLabelFormat =
                      getResponseTimeTickFormatter(latencyFormatter);
                    break;

                  case 'transaction_failure_rate':
                  case 'exit_span_failure_rate':
                    yLabelFormat = (y) => asPercent(y || 0, 100);
                    break;
                }

                const timeseries: Array<TimeSeries<Coordinate>> =
                  groupSeries.map((series): TimeSeries<Coordinate> => {
                    let chartType: ChartType;

                    const data = series.data;

                    switch (series.stat.timeseries.name) {
                      case 'transaction_throughput':
                      case 'exit_span_throughput':
                        chartType = ChartType.THROUGHPUT;
                        break;

                      case 'transaction_failure_rate':
                      case 'exit_span_failure_rate':
                        chartType = ChartType.FAILED_TRANSACTION_RATE;
                        break;

                      case 'transaction_latency':
                        if (
                          series.stat.timeseries.function ===
                          LatencyAggregationType.p99
                        ) {
                          chartType = ChartType.LATENCY_P99;
                        } else if (
                          series.stat.timeseries.function ===
                          LatencyAggregationType.p95
                        ) {
                          chartType = ChartType.LATENCY_P95;
                        } else {
                          chartType = ChartType.LATENCY_AVG;
                        }
                        break;

                      case 'exit_span_latency':
                        chartType = ChartType.LATENCY_AVG;
                        break;

                      case 'error_event_rate':
                        chartType = ChartType.ERROR_OCCURRENCES;
                        break;
                    }

                    return {
                      title: series.id,
                      type: 'line',
                      color: getTimeSeriesColor(chartType!).currentPeriodColor,
                      data,
                    };
                  });

                return (
                  <EuiFlexItem grow={false} key={groupId}>
                    <EuiFlexGroup direction="column" gutterSize="s">
                      <EuiFlexItem>
                        <EuiText size="m">{groupId}</EuiText>
                        <TimeseriesChart
                          comparisonEnabled={false}
                          fetchStatus={FETCH_STATUS.SUCCESS}
                          id={groupId}
                          timeZone={timeZone}
                          timeseries={timeseries}
                          yLabelFormat={yLabelFormat!}
                        />
                      </EuiFlexItem>
                    </EuiFlexGroup>
                  </EuiFlexItem>
                );
              })}
            </EuiFlexGroup>
          </ApmThemeProvider>
        </ChartPointerEventContextProvider>
      );
    }
  );
}
