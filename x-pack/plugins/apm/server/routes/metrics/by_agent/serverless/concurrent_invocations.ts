/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { ProcessorEvent } from '@kbn/observability-plugin/common';
import { kqlQuery, rangeQuery } from '@kbn/observability-plugin/server';
import { euiLightVars as theme } from '@kbn/ui-theme';
import {
  METRICSET_NAME,
  SERVICE_NAME,
  SERVICE_NODE_NAME,
} from '../../../../../common/elasticsearch_fieldnames';
import { environmentQuery } from '../../../../../common/utils/environment_query';
import { getVizColorForIndex } from '../../../../../common/viz_colors';
import { getMetricsDateHistogramParams } from '../../../../lib/helpers/metrics';
import { Setup } from '../../../../lib/helpers/setup_request';
import { GenericMetricsChart } from '../../fetch_and_transform_metrics';

export async function getConcurrentInvocations({
  environment,
  kuery,
  setup,
  serviceName,
  start,
  end,
}: {
  environment: string;
  kuery: string;
  setup: Setup;
  serviceName: string;
  start: number;
  end: number;
}): Promise<GenericMetricsChart> {
  const { apmEventClient, config } = setup;

  const params = {
    apm: {
      events: [ProcessorEvent.metric],
    },
    body: {
      size: 0,
      query: {
        bool: {
          filter: [
            { term: { [SERVICE_NAME]: serviceName } },
            ...rangeQuery(start, end),
            ...environmentQuery(environment),
            ...kqlQuery(kuery),
            { term: { [METRICSET_NAME]: 'transaction' } },
          ],
        },
      },
      aggs: {
        concurrentInvocations: {
          terms: {
            field: SERVICE_NODE_NAME,
            // TODO: check if size 10 is enough
          },
          aggs: {
            timeseriesData: {
              date_histogram: getMetricsDateHistogramParams({
                start,
                end,
                metricsInterval: config.metricsInterval,
              }),
            },
          },
        },
      },
    },
  };

  const { aggregations } = await apmEventClient.search(
    'get_concurrent_invocattions',
    params
  );

  return {
    title: i18n.translate(
      'xpack.apm.agentMetrics.serverless.concurrentInvocations',
      { defaultMessage: 'Concurrent invocations' }
    ),
    key: 'concurrent_invocations',
    yUnit: 'number',
    series:
      aggregations?.concurrentInvocations.buckets.map((bucket, i) => {
        const { key, timeseriesData, doc_count: docCount } = bucket;
        return {
          title: key as string,
          key: key as string,
          type: 'linemark',
          color: getVizColorForIndex(i, theme),
          overallValue: docCount,
          data: timeseriesData.buckets.map((timeseriesBucket) => ({
            x: timeseriesBucket.key,
            y: timeseriesBucket.doc_count,
          })),
        };
      }) || [],
  };
}
