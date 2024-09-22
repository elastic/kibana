/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ObservabilityElasticsearchClient } from '@kbn/observability-utils-server/es/client/create_observability_es_client';
import { flattenHit } from '@kbn/data-service';
import { Entity, LATEST_ENTITIES_INDEX } from '../../../common/entities';
import { toEntity } from '../../../common/utils/to_entity';

export async function searchEntities({
  esClient,
  displayName,
  size,
}: {
  esClient: ObservabilityElasticsearchClient;
  displayName: string;
  size: number;
}): Promise<Array<{ score: number; entity: Entity }>> {
  const response = await esClient.search('search_entities_by_term', {
    index: LATEST_ENTITIES_INDEX,
    size,
    track_total_hits: false,
    query: {
      bool: {
        should: [
          {
            match: {
              'entity.displayName': displayName,
            },
          },
        ],
        must: [
          {
            term: {
              'entity.type': 'service',
            },
          },
        ],
      },
    },
  });

  return response.hits.hits.map((hit) => ({
    score: hit._score ?? 0,
    entity: toEntity(flattenHit(hit)),
  }));
}
