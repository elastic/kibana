/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kqlQuery, rangeQuery, termQuery } from '@kbn/observability-plugin/server';
import { ProcessorEvent } from '@kbn/observability-plugin/common';
import {
  FAAS_ID,
  METRICSET_NAME,
  SERVICE_NAME,
  SERVICE_NODE_NAME,
} from '../../../../common/es_fields/apm';
import { environmentQuery } from '../../../../common/utils/environment_query';
import { Coordinate } from '../../../../typings/timeseries';
import { getMetricsDateHistogramParams } from '../../../lib/helpers/metrics';
import { APMEventClient } from '../../../lib/helpers/create_es_client/create_apm_event_client';
import { APMConfig } from '../../..';

export async function getActiveInstancesTimeseries({
  environment,
  kuery,
  serviceName,
  start,
  end,
  serverlessId,
  config,
  apmEventClient,
}: {
  environment: string;
  kuery: string;
  serviceName: string;
  start: number;
  end: number;
  serverlessId?: string;
  config: APMConfig;
  apmEventClient: APMEventClient;
}): Promise<Coordinate[]> {
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
      track_total_hits: false,
      size: 0,
      query: {
        bool: {
          filter: [
            ...termQuery(METRICSET_NAME, 'app'),
            { term: { [SERVICE_NAME]: serviceName } },
            ...rangeQuery(start, end),
            ...environmentQuery(environment),
            ...kqlQuery(kuery),
            ...termQuery(FAAS_ID, serverlessId),
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

  const { aggregations } = await apmEventClient.search('get_active_instances', params);

  return (
    aggregations?.timeseriesData?.buckets?.map((timeseriesBucket) => ({
      x: timeseriesBucket.key,
      y: timeseriesBucket.activeInstances.value,
    })) || []
  );
}
