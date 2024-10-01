/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '@kbn/core/server';
import {
  entitiesIndexPattern,
  ENTITY_INSTANCE,
  ENTITY_SCHEMA_VERSION_V1,
  EntityDefinition,
} from '@kbn/entities-schema';
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
  const historyStats = await getHistoryStats(esClient, definition);
  return { ...historyStats, entityCount };
}

export async function getHistoryStats(esClient: ElasticsearchClient, definition: EntityDefinition) {
  const params: SearchRequest = {
    ignore_unavailable: true,
    allow_no_indices: true,
    track_total_hits: true,
    index: entitiesIndexPattern({
      schemaVersion: ENTITY_SCHEMA_VERSION_V1,
      dataset: ENTITY_INSTANCE,
      definitionId: '*',
    }),
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
  return {
    totalDocs: total.value,
    lastSeenTimestamp:
      total.value && response.hits.hits[0]._source
        ? response.hits.hits[0]._source.entity.lastSeenTimestamp
        : null,
  };
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
