/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { euiLightVars as theme } from '@kbn/ui-theme';
import { FAAS_BILLED_DURATION } from '../../../../../common/elasticsearch_fieldnames';
import { LatencyAggregationType } from '../../../../../common/latency_aggregation_types';
import { getVizColorForIndex } from '../../../../../common/viz_colors';
import { Setup } from '../../../../lib/helpers/setup_request';
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
};

async function getServerlessLantecySeries({
  environment,
  kuery,
  setup,
  serviceName,
  start,
  end,
  searchAggregatedTransactions,
}: {
  environment: string;
  kuery: string;
  setup: Setup;
  serviceName: string;
  start: number;
  end: number;
  searchAggregatedTransactions: boolean;
}): Promise<GenericMetricsChart['series']> {
  const transactionLatency = await getLatencyTimeseries({
    environment,
    kuery,
    serviceName,
    setup,
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
  setup,
  serviceName,
  start,
  end,
  searchAggregatedTransactions,
}: {
  environment: string;
  kuery: string;
  setup: Setup;
  serviceName: string;
  start: number;
  end: number;
  searchAggregatedTransactions: boolean;
}): Promise<GenericMetricsChart> {
  const options = {
    environment,
    kuery,
    setup,
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

  return {
    ...billedDurationMetrics,
    series: [...billedDurationMetrics.series, ...serverlessDurationSeries],
  };
}
