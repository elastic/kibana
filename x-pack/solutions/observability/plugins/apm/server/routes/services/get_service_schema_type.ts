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
import type { ServiceSchemaType } from '../../../common/service_schema_type';

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
  const index = [...new Set([indices.transaction, indices.span].flatMap((i) => i.split(',')))]
    .filter(Boolean)
    .join(',');
  if (!index) return { schema: 'unknown' };

  const baseFilter = [
    { term: { [SERVICE_NAME]: serviceName } },
    ...rangeQuery(start, end),
    ...environmentQuery(environment),
  ];

  const [ecsResponse, otelResponse] = await Promise.all([
    esClient.search({
      index,
      size: 0,
      terminate_after: 1,
      query: { bool: { filter: [...baseFilter, { exists: { field: PROCESSOR_EVENT } }] } },
    }),
    esClient.search({
      index,
      size: 0,
      terminate_after: 1,
      query: { bool: { filter: [...baseFilter, { exists: { field: KIND } }] } },
    }),
  ]);

  const hasEcs = (ecsResponse.hits.total as { value: number }).value > 0;
  const hasOtel = (otelResponse.hits.total as { value: number }).value > 0;

  if (hasEcs) return { schema: 'ecs' };
  if (hasOtel) return { schema: 'otel' };
  return { schema: 'unknown' };
}
