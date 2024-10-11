/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import {
  ENTITY_FIRST_SEEN,
  ENTITY_LAST_SEEN,
} from '@kbn/observability-shared-plugin/common/field_names/elasticsearch';
import type { EntitiesESClient } from '../../lib/helpers/create_es_client/create_entities_es_client/create_entities_es_client';
import { getEntityLatestServices } from './get_entity_latest_services';
import type { EntityLatestServiceRaw } from './types';

export function entitiesRangeQuery(start?: number, end?: number): QueryDslQueryContainer[] {
  if (!start || !end) {
    return [];
  }

  return [
    {
      range: {
        [ENTITY_LAST_SEEN]: {
          gte: start,
        },
      },
    },
    {
      range: {
        [ENTITY_FIRST_SEEN]: {
          lte: end,
        },
      },
    },
  ];
}

export async function getEntities({
  entitiesESClient,
  start,
  end,
  environment,
  kuery,
  size,
  serviceName,
}: {
  entitiesESClient: EntitiesESClient;
  start: number;
  end: number;
  environment: string;
  kuery?: string;
  size: number;
  serviceName?: string;
}): Promise<EntityLatestServiceRaw[]> {
  const entityLatestServices = await getEntityLatestServices({
    entitiesESClient,
    start,
    end,
    environment,
    kuery,
    size,
    serviceName,
  });

  return entityLatestServices;
}
