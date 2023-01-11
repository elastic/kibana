/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { rangeQuery } from '@kbn/observability-plugin/server';
import { CONTAINER_ID, HOST_NAME } from '../../../common/es_fields/apm';
import { InfraMetricsClient } from '../../lib/helpers/create_es_client/create_infra_metrics_client/create_infra_metrics_client';

export async function getContainerHostNames({
  containerIds,
  infraMetricsClient,
  start,
  end,
}: {
  containerIds: string[];
  infraMetricsClient: InfraMetricsClient;
  start: number;
  end: number;
}): Promise<string[]> {
  if (!containerIds.length) {
    return [];
  }

  const response = await infraMetricsClient.search({
    size: 0,
    track_total_hits: false,
    query: {
      bool: {
        filter: [
          {
            terms: {
              [CONTAINER_ID]: containerIds,
            },
          },
          ...rangeQuery(start, end),
        ],
      },
    },
    aggs: {
      hostNames: {
        terms: {
          field: HOST_NAME,
          size: 500,
        },
      },
    },
  });

  const hostNames = response.aggregations?.hostNames?.buckets.map(
    (bucket) => bucket.key as string
  );

  return hostNames ?? [];
}
