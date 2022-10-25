/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { euiLightVars as theme } from '@kbn/ui-theme';
import { APMConfig } from '../../../..';
import { FAAS_BILLED_DURATION } from '../../../../../common/elasticsearch_fieldnames';
import { LatencyAggregationType } from '../../../../../common/latency_aggregation_types';
import { isFiniteNumber } from '../../../../../common/utils/is_finite_number';
import { getVizColorForIndex } from '../../../../../common/viz_colors';
import { APMEventClient } from '../../../../lib/helpers/create_es_client/create_apm_event_client';
import { getLatencyTimeseries } from '../../../transactions/get_latency_charts';
import {
  fetchAndTransformMetrics,
  GenericMetricsChart,
} from '../../fetch_and_transform_metrics';
import { ChartBase } from '../../types';

const billedDurationAvg = {
  title: i18n.translate('xpack.apm.agentMetrics.serverless.billedDurationAvg', {
    defaultMessage: 'Billed Duration',
  }),
};

const chartBase: ChartBase = {
  title: i18n.translate('xpack.apm.agentMetrics.serverless.avgDuration', {
    defaultMessage: 'Avg. Duration',
  }),
  key: 'avg_duration',
  type: 'linemark',
  yUnit: 'time',
  series: {},
  description: i18n.translate(
    'xpack.apm.agentMetrics.serverless.avgDuration.description',
    {
      defaultMessage:
        'Transaction duration is the time spent processing and responding to a request. If the request is queued it will not be contribute to the transaction duration but will contribute the overall billed duration',
    }
  ),
};

async function getServerlessLantecySeries({
  environment,
  kuery,
  apmEventClient,
  serviceName,
  start,
  end,
  searchAggregatedTransactions,
}: {
  environment: string;
  kuery: string;
  apmEventClient: APMEventClient;
  serviceName: string;
  start: number;
  end: number;
  searchAggregatedTransactions: boolean;
}): Promise<GenericMetricsChart['series']> {
  const transactionLatency = await getLatencyTimeseries({
    environment,
    kuery,
    serviceName,
    apmEventClient,
    searchAggregatedTransactions,
    latencyAggregationType: LatencyAggregationType.avg,
    start,
    end,
  });

  return [
    {
      title: i18n.translate(
        'xpack.apm.agentMetrics.serverless.transactionDuration',
        { defaultMessage: 'Transaction Duration' }
      ),
      key: 'transaction_duration',
      type: 'linemark',
      color: getVizColorForIndex(1, theme),
      overallValue: transactionLatency.overallAvgDuration ?? 0,
      data: transactionLatency.latencyTimeseries,
    },
  ];
}

export async function getServerlessFunctionLatency({
  environment,
  kuery,
  config,
  apmEventClient,
  serviceName,
  start,
  end,
  searchAggregatedTransactions,
}: {
  environment: string;
  kuery: string;
  config: APMConfig;
  apmEventClient: APMEventClient;
  serviceName: string;
  start: number;
  end: number;
  searchAggregatedTransactions: boolean;
}): Promise<GenericMetricsChart> {
  const options = {
    environment,
    kuery,
    config,
    apmEventClient,
    serviceName,
    start,
    end,
  };

  const [billedDurationMetrics, serverlessDurationSeries] = await Promise.all([
    fetchAndTransformMetrics({
      ...options,
      chartBase: { ...chartBase, series: { billedDurationAvg } },
      aggs: {
        billedDurationAvg: { avg: { field: FAAS_BILLED_DURATION } },
      },
      additionalFilters: [{ exists: { field: FAAS_BILLED_DURATION } }],
      operationName: 'get_billed_duration',
    }),
    getServerlessLantecySeries({ ...options, searchAggregatedTransactions }),
  ]);

  const [series] = billedDurationMetrics.series;
  const data = series.data.map(({ x, y }) => ({
    x,
    // Billed duration is stored in ms, convert it to microseconds so it uses the same unit as the other chart
    y: isFiniteNumber(y) ? y * 1000 : y,
  }));

  return {
    ...billedDurationMetrics,
    series: [
      {
        ...series,
        // Billed duration is stored in ms, convert it to microseconds
        overallValue: series.overallValue * 1000,
        data,
      },
      ...serverlessDurationSeries,
    ],
  };
}
