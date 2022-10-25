/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { kqlQuery, rangeQuery } from '@kbn/observability-plugin/server';
import { euiLightVars as theme } from '@kbn/ui-theme';
import { APMConfig } from '../../../..';
import {
  SERVICE_NAME,
  SERVICE_NODE_NAME,
} from '../../../../../common/elasticsearch_fieldnames';
import { environmentQuery } from '../../../../../common/utils/environment_query';
import { APMEventClient } from '../../../../lib/helpers/create_es_client/create_apm_event_client';
import { getMetricsDateHistogramParams } from '../../../../lib/helpers/metrics';
import {
  getDocumentTypeFilterForTransactions,
  getProcessorEventForTransactions,
} from '../../../../lib/helpers/transactions';
import { GenericMetricsChart } from '../../fetch_and_transform_metrics';

export async function getActiveInstances({
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
  const aggs = {
    activeInstances: {
      cardinality: {
        field: SERVICE_NODE_NAME,
      },
    },
  };

  const params = {
    apm: {
      events: [getProcessorEventForTransactions(searchAggregatedTransactions)],
    },
    body: {
      track_total_hits: false,
      size: 0,
      query: {
        bool: {
          filter: [
            { term: { [SERVICE_NAME]: serviceName } },
            ...rangeQuery(start, end),
            ...environmentQuery(environment),
            ...kqlQuery(kuery),
            ...getDocumentTypeFilterForTransactions(
              searchAggregatedTransactions
            ),
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
    yUnit: 'integer',
    description: i18n.translate(
      'xpack.apm.agentMetrics.serverless.activeInstances.description',
      {
        defaultMessage:
          'This chart shows the number of active instances of your serverless function over time. Multiple active instances may be a result of provisioned concurrency for your function or an increase in concurrent load that scales your function on-demand. An increase in active instance can be an indicator for an increase in concurrent invocations.',
      }
    ),
    series: [
      {
        title: i18n.translate(
          'xpack.apm.agentMetrics.serverless.series.activeInstances',
          { defaultMessage: 'Active instances' }
        ),
        key: 'active_instances',
        type: 'bar',
        color: theme.euiColorVis1,
        overallValue: aggregations?.activeInstances.value ?? 0,
        data:
          aggregations?.timeseriesData.buckets.map((timeseriesBucket) => ({
            x: timeseriesBucket.key,
            y: timeseriesBucket.activeInstances.value,
          })) || [],
      },
    ],
  };
}
