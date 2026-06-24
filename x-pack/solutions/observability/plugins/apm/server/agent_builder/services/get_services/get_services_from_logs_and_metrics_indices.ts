/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IScopedClusterClient } from '@kbn/core-elasticsearch-server';
import type { Logger } from '@kbn/core/server';
import { kqlQuery } from '@kbn/observability-utils-server/es/queries/kql_query';
import { getTypedSearch } from '../../../utils/create_typed_es_client';

export interface ServiceFromIndex {
  serviceName: string;
  environment?: string;
}

const MAX_SERVICES_FROM_INDICES = 500;

/**
 * Aggregates `service.name` values found in logs and metrics indices to
 * surface services that exist but are not instrumented with APM. Returns
 * an empty array on error or when no indices are configured.
 */
export async function getServicesFromLogsAndMetricsIndices({
  esClient,
  logsIndices,
  metricsIndices,
  start,
  end,
  kqlFilter,
  logger,
}: {
  esClient: IScopedClusterClient;
  logsIndices: string[];
  metricsIndices: string[];
  start: number;
  end: number;
  kqlFilter?: string;
  logger: Logger;
}): Promise<ServiceFromIndex[]> {
  const allIndices = [...logsIndices, ...metricsIndices];

  if (allIndices.length === 0) {
    return [];
  }

  try {
    const search = getTypedSearch(esClient.asCurrentUser);
    const response = await search({
      index: allIndices,
      size: 0,
      track_total_hits: false,
      query: {
        bool: {
          filter: [
            { range: { '@timestamp': { gte: start, lte: end } } },
            { exists: { field: 'service.name' } },
            ...kqlQuery(kqlFilter),
          ],
        },
      },
      aggs: {
        services: {
          terms: {
            field: 'service.name',
            size: MAX_SERVICES_FROM_INDICES,
          },
          aggs: {
            environments: {
              terms: {
                field: 'service.environment',
                size: 10,
              },
            },
          },
        },
      },
    });

    const buckets = response.aggregations?.services?.buckets ?? [];

    return buckets.map((bucket) => ({
      serviceName: bucket.key as string,
      environment: bucket.environments?.buckets?.[0]?.key as string | undefined,
    }));
  } catch (error) {
    logger.debug(`Failed to get services from logs/metrics indices: ${error.message}`);
    return [];
  }
}
