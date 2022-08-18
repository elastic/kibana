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

export async function getActiveInstances({
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

  const aggs = {
    activeInstances: {
      cardinality: {
        field: SERVICE_NODE_NAME,
      },
    },
  };

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
        ...aggs,
        timeseriesData: {
          date_histogram: getMetricsDateHistogramParams({
            start,
            end,
            metricsInterval: config.metricsInterval,
          }),
          aggs,
        },
      },
    },
  };

  const { aggregations } = await apmEventClient.search(
    'get_active_instances',
    params
  );

  return {
    title: i18n.translate('xpack.apm.agentMetrics.serverless.activeInstances', {
      defaultMessage: 'Active instances',
    }),
    key: 'active_instances',
    yUnit: 'number',
    series: [
      {
        title: 'Active instances',
        key: 'active_instances',
        type: 'linemark',
        color: getVizColorForIndex(0, theme),
        overallValue: aggregations?.activeInstances.value ?? 0,
        data:
          aggregations?.timeseriesData.buckets.map((timeseriesBucket) => ({
            x: timeseriesBucket.key,
            y: timeseriesBucket.doc_count,
          })) || [],
      },
    ],
  };
}
