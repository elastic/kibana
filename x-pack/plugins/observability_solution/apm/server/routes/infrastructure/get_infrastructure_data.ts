/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { rangeQuery, kqlQuery } from '@kbn/observability-plugin/server';
import { ProcessorEvent } from '@kbn/observability-plugin/common';
import { environmentQuery } from '../../../common/utils/environment_query';
import {
  SERVICE_NAME,
  CONTAINER_ID,
  HOST_HOSTNAME,
  KUBERNETES_POD_NAME,
} from '../../../common/es_fields/apm';
import { APMEventClient } from '../../lib/helpers/create_es_client/create_apm_event_client';

export const getInfrastructureData = async ({
  kuery,
  serviceName,
  environment,
  apmEventClient,
  start,
  end,
}: {
  kuery: string;
  serviceName: string;
  environment: string;
  apmEventClient: APMEventClient;
  start: number;
  end: number;
}) => {
  const response = await apmEventClient.search('get_service_infrastructure', {
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
        containerIds: {
          terms: {
            field: CONTAINER_ID,
            size: 500,
          },
        },
        hostNames: {
          terms: {
            field: HOST_HOSTNAME,
            size: 500,
          },
        },
        podNames: {
          terms: {
            field: KUBERNETES_POD_NAME,
            size: 500,
          },
        },
      },
    },
  });

  return {
    containerIds:
      response.aggregations?.containerIds?.buckets.map((bucket) => bucket.key as string) ?? [],
    hostNames:
      response.aggregations?.hostNames?.buckets.map((bucket) => bucket.key as string) ?? [],
    podNames: response.aggregations?.podNames?.buckets.map((bucket) => bucket.key as string) ?? [],
  };
};
