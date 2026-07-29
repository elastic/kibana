/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { rangeQuery } from '@kbn/observability-plugin/server';
import type { ElasticsearchClient } from '@kbn/core/server';
import type { APMIndices } from '@kbn/apm-sources-access-plugin/server';
import { KIND } from '@kbn/apm-types/es_fields';
import { PROCESSOR_EVENT, SERVICE_NAME } from '../../../common/es_fields/apm';
import { environmentQuery } from '../../../common/utils/environment_query';

export type ServiceSchemaType = 'ecs' | 'otel' | 'unknown';

export async function getServiceSchemaType({
  esClient,
  indices,
  serviceName,
  environment,
  start,
  end,
}: {
  esClient: ElasticsearchClient;
  indices: APMIndices;
  serviceName: string;
  environment: string;
  start: number;
  end: number;
}): Promise<{ schema: ServiceSchemaType }> {
  // Combine transaction and span indices — users may configure them differently,
  // and OTel services may only have data in the span index.
  const index = [...new Set([indices.transaction, indices.span])].filter(Boolean).join(',');

  const response = await esClient.search({
    index,
    size: 0,
    query: {
      bool: {
        filter: [
          { term: { [SERVICE_NAME]: serviceName } },
          ...rangeQuery(start, end),
          ...environmentQuery(environment),
        ],
      },
    },
    aggs: {
      ecs: { filter: { exists: { field: PROCESSOR_EVENT } } },
      otel: { filter: { exists: { field: KIND } } },
    },
  });

  const aggs = response.aggregations as
    | { ecs?: { doc_count: number }; otel?: { doc_count: number } }
    | undefined;
  const ecsCount = aggs?.ecs?.doc_count ?? 0;
  const otelCount = aggs?.otel?.doc_count ?? 0;

  if (ecsCount > 0) return { schema: 'ecs' };
  if (otelCount > 0) return { schema: 'otel' };
  return { schema: 'unknown' };
}
