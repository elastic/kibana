/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '@kbn/core/server';
import {
  entitiesIndexPattern,
  ENTITY_SCHEMA_VERSION_V1,
  EntityLatestDoc,
} from '@kbn/entities-schema';

export async function* scrollEntities(
  esClient: ElasticsearchClient,
  lastRunAt: string,
  definitionId: string,
  size = 100,
  scroll = '30s'
) {
  let response = await esClient.search<EntityLatestDoc>({
    index: entitiesIndexPattern({
      schemaVersion: ENTITY_SCHEMA_VERSION_V1,
      dataset: 'latest',
      definitionId,
    }),
    ignore_unavailable: true,
    allow_no_indices: true,
    scroll,
    size,
    query: {
      bool: {
        filter: [
          {
            range: {
              'event.ingested': {
                gte: lastRunAt,
              },
            },
          },
        ],
      },
    },
  });

  while (true) {
    const hits = response.hits.hits;
    if (hits.length === 0) {
      break;
    }

    yield hits;

    if (!response._scroll_id) {
      break;
    }

    response = await esClient.scroll({
      scroll_id: response._scroll_id,
      scroll,
    });
  }
}
