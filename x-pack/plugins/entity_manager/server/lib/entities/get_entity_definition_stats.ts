/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '@kbn/core/server';
import { EntityDefinition } from '@kbn/entities-schema';
import { SearchRequest, SearchTotalHits } from '@elastic/elasticsearch/lib/api/types';
import { generateLatestIndexName } from './helpers/generate_component_id';

interface EntityCountAggregationResponse {
  entityCount: {
    value: number;
  };
}

export async function getEntityDefinitionStats(
  esClient: ElasticsearchClient,
  definition: EntityDefinition
) {
  const entityCount = await getEntityCount(esClient, definition);
  const lastSeenTimestamp = await getLastSeenTimestamp(esClient, definition);
  return { entityCount, lastSeenTimestamp };
}

export async function getLastSeenTimestamp(
  esClient: ElasticsearchClient,
  definition: EntityDefinition
) {
  const params: SearchRequest = {
    ignore_unavailable: true,
    allow_no_indices: true,
    track_total_hits: true,
    index: generateLatestIndexName(definition),
    size: 1,
    _source: ['entity.lastSeenTimestamp'],
    sort: [
      {
        'entity.lastSeenTimestamp': { order: 'desc' },
      },
    ],
  };

  const response = await esClient.search<{ entity: { lastSeenTimestamp: string } }>(params);
  const total = response.hits.total as SearchTotalHits;
  return total.value && response.hits.hits[0]._source
    ? response.hits.hits[0]._source.entity.lastSeenTimestamp
    : null;
}

export async function getEntityCount(esClient: ElasticsearchClient, definition: EntityDefinition) {
  const params: SearchRequest = {
    ignore_unavailable: true,
    allow_no_indices: true,
    index: generateLatestIndexName(definition),
    size: 0,
    aggs: {
      entityCount: {
        cardinality: {
          field: 'entity.id',
        },
      },
    },
  };
  const response = await esClient.search<unknown, EntityCountAggregationResponse>(params);
  return response.aggregations?.entityCount.value ?? 0;
}
