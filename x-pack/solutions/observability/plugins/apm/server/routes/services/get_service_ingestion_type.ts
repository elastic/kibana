/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { rangeQuery } from '@kbn/observability-plugin/server';
import type { ElasticsearchClient } from '@kbn/core/server';
import type { APMIndices } from '@kbn/apm-sources-access-plugin/server';
import { PROCESSOR_EVENT, SERVICE_NAME } from '../../../common/es_fields/apm';
import { environmentQuery } from '../../../common/utils/environment_query';

export type ServiceIngestionType = 'classicApm' | 'unprocessedOtel';

export async function getServiceIngestionType({
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
}): Promise<{ ingestionType: ServiceIngestionType }> {
  const response = await esClient.search({
    index: indices.transaction,
    track_total_hits: 1,
    size: 0,
    query: {
      bool: {
        filter: [
          { term: { [SERVICE_NAME]: serviceName } },
          { term: { [PROCESSOR_EVENT]: 'transaction' } },
          ...rangeQuery(start, end),
          ...environmentQuery(environment),
        ],
      },
    },
  });

  const total = response.hits.total;
  const count = typeof total === 'number' ? total : total?.value ?? 0;

  return { ingestionType: count > 0 ? 'classicApm' : 'unprocessedOtel' };
}
