/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
/**
 * 🔍 DISCOVERY
 *
 * Environment discovery - retrieves all unique environments in the time window.
 * Used for environment-scoped workflow execution.
 */
import type { Logger } from '@kbn/logging';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { SERVICES_INDEX } from '../core/utils';

export interface GetEnvironmentsParams {
  esClient: ElasticsearchClient;
  logger: Logger;
}

export interface GetEnvironmentsResponse {
  environments: string[];
}

/**
 * Gets unique environments from discovered services.
 *
 * This allows the workflow to conditionally process environments
 * or coordinate environment-scoped aggregation steps.
 */
export async function getEnvironments({
  esClient,
  logger,
}: GetEnvironmentsParams): Promise<GetEnvironmentsResponse> {
  logger.debug('Querying unique environments from services index');

  const response = await esClient.search<
    unknown,
    { unique_environments: { buckets: Array<{ key: string; doc_count: number }> } }
  >({
    index: SERVICES_INDEX,
    size: 0,
    query: {
      bool: {
        must: [{ exists: { field: 'service_name' } }], // Query only service documents (not edges)
      },
    },
    aggs: {
      unique_environments: {
        terms: {
          field: 'service_environment',
          size: 100, // Should cover all environments
          missing: '', // Include services without environment
        },
      },
    },
  });

  const buckets = response.aggregations?.unique_environments?.buckets ?? [];
  const environments = buckets.map((bucket) => bucket.key).sort();

  logger.info(`Found ${environments.length} unique environments: ${environments.join(', ')}`);

  return { environments };
}
