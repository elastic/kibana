/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import moment from 'moment';
import { getDurationFormatter } from '../../../../../common/utils/formatters';
import { getLatencyChartSelector } from '../../../../selectors/latency_chart_selectors';
import { LatencyAggregationType } from '../../../../../common/latency_aggregation_types';
import { useFetcher } from '../../../../hooks/use_fetcher';
import { TimeseriesChart } from '../../../shared/charts/timeseries_chart';
import { filterNil } from '../../../shared/charts/latency_chart';
import {
  getMaxY,
  getResponseTimeTickFormatter,
} from '../../../shared/charts/transaction_charts/helper';

interface LatencyAlertsHistoryChartProps {
  serviceName: string;
  start: string;
  end: string;
  transactionType?: string;
  latencyAggregationType: LatencyAggregationType;
  environment: string;
  timeZone: string;
}
export function LatencyAlertsHistoryChart({
  serviceName,
  start,
  end,
  transactionType,
  latencyAggregationType,
  environment,
  timeZone,
}: LatencyAlertsHistoryChartProps) {
  console.log(moment().toISOString());
  console.log(moment().subtract(30, 'days').toISOString());
  const { data, status } = useFetcher(
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
                start: moment().toISOString(),
                end: moment().subtract(30, 'days').toISOString(),
                transactionType,
                transactionName: undefined,
                latencyAggregationType,
              },
            },
          }
        );
      }
    },
    [
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
  const timeseriesLatency = [currentPeriod, previousPeriod].filter(filterNil);
  const latencyMaxY = getMaxY(timeseriesLatency);
  const latencyFormatter = getDurationFormatter(latencyMaxY);

  return (
    <TimeseriesChart
      id="latencyChart"
      height={200}
      comparisonEnabled={false}
      offset={''}
      fetchStatus={status}
      timeseries={timeseriesLatency}
      yLabelFormat={getResponseTimeTickFormatter(latencyFormatter)}
      timeZone={timeZone}
    />
  );
}
