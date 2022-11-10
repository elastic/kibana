/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { SearchRequest } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type { EndpointMetrics } from './types';
import { ENDPOINT_METRICS_INDEX } from '../../../common/constants';
import { tlog } from '../../lib/telemetry/helpers';

export interface GetEndpointMetricsOptions {
  esClient: ElasticsearchClient;
  logger: Logger;
}

export const getEndpointMetrics = async ({
  esClient,
  logger,
}: GetEndpointMetricsOptions): Promise<EndpointMetrics> => {
  return {
    active_endpoint_count: await getActiveEndpointCount(esClient, logger),
  };
};

const getActiveEndpointCount = async (
  esClient: ElasticsearchClient,
  logger: Logger
): Promise<number> => {
  try {
    const query: SearchRequest = {
      expand_wildcards: ['open' as const, 'hidden' as const],
      index: ENDPOINT_METRICS_INDEX,
      ignore_unavailable: false,
      body: {
        size: 0, // no query results required - only aggregation quantity
        query: {
          range: {
            '@timestamp': {
              gte: 'now-24h',
              lt: 'now',
            },
          },
        },
        aggs: {
          endpoint_count: {
            cardinality: {
              field: 'agent.id',
            },
          },
        },
      },
    };

    const response = await esClient.search(query, { meta: true });
    const { body: endpointCountResponse } = response as unknown as {
      body: {
        aggregations: {
          endpoint_count: { value: number };
        };
      };
    };
    return endpointCountResponse.aggregations?.endpoint_count?.value ?? 0;
  } catch (e) {
    tlog(logger, `Failed to get active endpoint count due to: ${e.message}`);
    return 0;
  }
};
