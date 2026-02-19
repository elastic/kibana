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
  KUBERNETES_POD_NAME,
  KUBERNETES_POD_NAME_OTEL,
  HOST_NAME,
} from '../../../common/es_fields/apm';
import type { APMEventClient } from '../../lib/helpers/create_es_client/create_apm_event_client';

export const getInfrastructureData = async ({
  kuery,
  serviceName,
  isSemconv,
  environment,
  apmEventClient,
  start,
  end,
}: {
  kuery: string;
  serviceName: string;
  isSemconv: boolean;
  environment: string;
  apmEventClient: APMEventClient;
  start: number;
  end: number;
}) => {
  const podNameField = isSemconv ? KUBERNETES_POD_NAME_OTEL : KUBERNETES_POD_NAME;

  const response = await apmEventClient.search('get_service_infrastructure', {
    apm: {
      events: [ProcessorEvent.metric],
    },
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
          field: HOST_NAME,
          size: 500,
        },
      },
      podNames: {
        terms: {
          field: podNameField,
          size: 500,
        },
      },
    },
  });

  const extractKeys = (buckets?: Array<{ key: string | number }>) =>
    buckets?.map((bucket) => bucket.key as string) ?? [];

  const containerIds = extractKeys(response.aggregations?.containerIds?.buckets);
  const hostNames = extractKeys(response.aggregations?.hostNames?.buckets);
  const podNames = extractKeys(response.aggregations?.podNames?.buckets);

  return {
    containerIds,
    hostNames,
    podNames,
  };
};
