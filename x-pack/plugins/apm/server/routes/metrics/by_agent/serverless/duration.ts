/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import {
  kqlQuery,
  rangeQuery,
  termQuery,
} from '@kbn/observability-plugin/server';
import { euiLightVars as theme } from '@kbn/ui-theme';
import {
  FAAS_BILLED_DURATION,
  FAAS_ID,
  SERVICE_NAME,
} from '../../../../../common/elasticsearch_fieldnames';
import { environmentQuery } from '../../../../../common/utils/environment_query';
import { getVizColorForIndex } from '../../../../../common/viz_colors';
import { getBucketSizeForAggregatedTransactions } from '../../../../lib/helpers/get_bucket_size_for_aggregated_transactions';
import { Setup } from '../../../../lib/helpers/setup_request';
import {
  getDocumentTypeFilterForTransactions,
  getDurationFieldForTransactions,
  getProcessorEventForTransactions,
} from '../../../../lib/helpers/transactions';
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

async function getTransactionDurationSeries({
  environment,
  kuery,
  setup,
  serviceName,
  faasId,
  start,
  end,
  searchAggregatedTransactions,
}: {
  environment: string;
  kuery: string;
  setup: Setup;
  serviceName: string;
  faasId?: string;
  start: number;
  end: number;
  searchAggregatedTransactions: boolean;
}): Promise<GenericMetricsChart['series']> {
  const { apmEventClient } = setup;

  const { intervalString } = getBucketSizeForAggregatedTransactions({
    start,
    end,
    searchAggregatedTransactions,
  });

  const transactionDurationField = getDurationFieldForTransactions(
    searchAggregatedTransactions
  );

  const params = {
    apm: {
      events: [getProcessorEventForTransactions(searchAggregatedTransactions)],
    },
    body: {
      size: 0,
      query: {
        bool: {
          filter: [
            { term: { [SERVICE_NAME]: serviceName } },
            ...getDocumentTypeFilterForTransactions(
              searchAggregatedTransactions
            ),
            ...rangeQuery(start, end),
            ...environmentQuery(environment),
            ...kqlQuery(kuery),
            ...termQuery(FAAS_ID, faasId),
          ],
        },
      },
      aggs: {
        latencyTimeseries: {
          date_histogram: {
            field: '@timestamp',
            fixed_interval: intervalString,
            min_doc_count: 0,
            extended_bounds: { min: start, max: end },
          },
          aggs: { latency: { avg: { field: transactionDurationField } } },
        },
        overall_avg_latency: { avg: { field: transactionDurationField } },
      },
    },
  };

  const response = await apmEventClient.search(
    'get_transaction_duration',
    params
  );

  return [
    {
      title: i18n.translate(
        'xpack.apm.agentMetrics.serverless.transactionDuration',
        { defaultMessage: 'Transaction Duration' }
      ),
      key: 'transaction_duration',
      type: 'linemark',
      color: getVizColorForIndex(1, theme),
      overallValue: response?.aggregations?.overall_avg_latency.value ?? 0,
      data:
        response?.aggregations?.latencyTimeseries.buckets.map((bucket) => {
          return { x: bucket.key, y: bucket.latency.value };
        }) || [],
    },
  ];
}

export async function getDuration({
  environment,
  kuery,
  setup,
  serviceName,
  faasId,
  start,
  end,
  searchAggregatedTransactions,
}: {
  environment: string;
  kuery: string;
  setup: Setup;
  serviceName: string;
  faasId?: string;
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

  const [billedDurationMetrics, transactionDurationSeries] = await Promise.all([
    fetchAndTransformMetrics({
      ...options,
      chartBase: { ...chartBase, series: { billedDurationAvg } },
      aggs: {
        billedDurationAvg: { avg: { field: FAAS_BILLED_DURATION } },
      },
      additionalFilters: [
        { exists: { field: FAAS_BILLED_DURATION } },
        ...termQuery(FAAS_ID, faasId),
      ],
      operationName: 'get_billed_duration',
    }),
    getTransactionDurationSeries({ ...options, searchAggregatedTransactions }),
  ]);

  return {
    ...billedDurationMetrics,
    series: [...billedDurationMetrics.series, ...transactionDurationSeries],
  };
}
