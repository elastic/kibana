/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { ProcessorEvent } from '@kbn/observability-plugin/common';
import { kqlQuery, rangeQuery } from '@kbn/observability-plugin/server';
import { HOST_HOSTNAME, SERVICE_NAME } from '../../../common/es_fields/apm';
import { environmentQuery } from '../../../common/utils/environment_query';
import { APMEventClient } from '../../lib/helpers/create_es_client/create_apm_event_client';

export async function getServiceHostNames({
  apmEventClient,
  serviceName,
  start,
  end,
  environment,
  kuery,
}: {
  environment: string;
  kuery: string;
  serviceName: string;
  start: number;
  end: number;
  apmEventClient: APMEventClient;
}) {
  const response = await apmEventClient.search('get_service_host_names', {
    apm: {
      events: [ProcessorEvent.metric],
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
          ],
        },
      },
      aggs: {
        hostNames: {
          terms: {
            field: HOST_HOSTNAME,
            size: 500,
          },
        },
      },
    },
  });

  return (
    response.aggregations?.hostNames.buckets.map(
      (bucket) => bucket.key as string
    ) || []
  );
}
