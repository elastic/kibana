/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type {
  RegisterRenderFunctionDefinition,
  RenderFunction,
} from '@kbn/observability-ai-assistant-plugin/public/types';

import { groupBy } from 'lodash';
import React from 'react';
import { LatencyAggregationType } from '../../common/latency_aggregation_types';
import {
  asPercent,
  asTransactionRate,
  getDurationFormatter,
} from '../../common/utils/formatters';
import type {
  GetApmTimeseriesFunctionArguments,
  GetApmTimeseriesFunctionResponse,
} from '../../server/assistant_functions/get_apm_timeseries';
import { Coordinate, TimeSeries } from '../../typings/timeseries';
import { ApmThemeProvider } from '../components/routing/app_root';
import {
  ChartType,
  getTimeSeriesColor,
} from '../components/shared/charts/helper/get_timeseries_color';
import { getTimeZone } from '../components/shared/charts/helper/timezone';
import { TimeseriesChart } from '../components/shared/charts/timeseries_chart';
import {
  getMaxY,
  getResponseTimeTickFormatter,
} from '../components/shared/charts/transaction_charts/helper';
import { ChartPointerEventContextProvider } from '../context/chart_pointer_event/chart_pointer_event_context';
import { FETCH_STATUS } from '../hooks/use_fetcher';

export function registerGetApmTimeseriesFunction({
  registerRenderFunction,
}: {
  registerRenderFunction: RegisterRenderFunctionDefinition;
}) {
  registerRenderFunction('get_apm_timeseries', (parameters) => {
    const { response } = parameters as Parameters<
      RenderFunction<
        GetApmTimeseriesFunctionArguments,
        GetApmTimeseriesFunctionResponse
      >
    >[0];

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
                  yLabelFormat = getResponseTimeTickFormatter(latencyFormatter);
                  break;

                case 'transaction_failure_rate':
                case 'exit_span_failure_rate':
                  yLabelFormat = (y) => asPercent(y || 0, 100);
                  break;
              }

              const timeseries: Array<TimeSeries<Coordinate>> = groupSeries.map(
                (series): TimeSeries<Coordinate> => {
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
                }
              );

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
  });
}
