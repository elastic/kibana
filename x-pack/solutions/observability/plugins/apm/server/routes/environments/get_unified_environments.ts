/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { APMIndices } from '@kbn/apm-sources-access-plugin/server';
import { rangeQuery } from '@kbn/observability-plugin/server';
import { KIND } from '@kbn/apm-types/es_fields';
import { PROCESSOR_EVENT, SERVICE_ENVIRONMENT, SERVICE_NAME } from '../../../common/es_fields/apm';
import { ENVIRONMENT_NOT_DEFINED } from '../../../common/environment_filter_values';
import type { Environment } from '../../../common/environment_rt';

/**
 * Returns environments for a service across both APM-processed and unprocessed
 * OTel data without mixing them. For a given service name a service is either
 * one or the other, so the two should-branches naturally return data from only
 * one source.
 */
export async function getUnifiedEnvironments({
  esClient,
  indices,
  serviceName,
  start,
  end,
  size,
}: {
  esClient: ElasticsearchClient;
  indices: APMIndices;
  serviceName: string;
  start: number;
  end: number;
  size: number;
}): Promise<Environment[]> {
  const index = [indices.transaction, indices.span].filter(Boolean).join(',');
  if (!index) return [];

  const response = await esClient.search({
    index,
    size: 0,
    track_total_hits: false,
    query: {
      bool: {
        filter: [{ term: { [SERVICE_NAME]: serviceName } }, ...rangeQuery(start, end)],
        should: [
          // APM-processed: transactions are the authoritative environment source
          {
            bool: {
              filter: [{ term: { [PROCESSOR_EVENT]: 'transaction' } }],
            },
          },
          // Unprocessed OTel: server/consumer spans without processor.event
          {
            bool: {
              filter: [{ terms: { [KIND]: ['Server', 'Consumer'] } }],
              must_not: [{ exists: { field: PROCESSOR_EVENT } }],
            },
          },
        ],
        minimum_should_match: 1,
      },
    },
    aggs: {
      environments: {
        terms: {
          field: SERVICE_ENVIRONMENT,
          size,
          order: { _key: 'asc' as const },
        },
      },
      missing_environments: {
        missing: { field: SERVICE_ENVIRONMENT },
      },
    },
  });

  const buckets =
    (response.aggregations?.environments as { buckets: Array<{ key: string }> } | undefined)
      ?.buckets ?? [];

  const environments = buckets.map((b) => b.key as Environment);

  const missingCount =
    (response.aggregations?.missing_environments as { doc_count: number } | undefined)?.doc_count ??
    0;

  if (missingCount > 0) {
    environments.push(ENVIRONMENT_NOT_DEFINED.value as Environment);
  }

  return environments;
}
