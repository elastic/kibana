/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kqlQuery, termQuery } from '@kbn/observability-plugin/server';
import {
  ENTITY,
  ENTITY_TYPE,
  SOURCE_DATA_STREAM_TYPE,
} from '@kbn/observability-shared-plugin/common/field_names/elasticsearch';
import { AGENT_NAME, SERVICE_ENVIRONMENT, SERVICE_NAME } from '../../../common/es_fields/apm';
import { environmentQuery } from '../../../common/utils/environment_query';
import { EntitiesESClient } from '../../lib/helpers/create_es_client/create_entities_es_client/create_entities_es_client';
import { entitiesRangeQuery } from './get_entities';
import { EntityLatestServiceRaw, EntityType } from './types';

export async function getEntityLatestServices({
  entitiesESClient,
  start,
  end,
  environment,
  kuery,
  size,
  serviceName,
}: {
  entitiesESClient: EntitiesESClient;
  start?: number;
  end?: number;
  environment: string;
  kuery?: string;
  size: number;
  serviceName?: string;
}): Promise<EntityLatestServiceRaw[]> {
  const latestEntityServices = (
    await entitiesESClient.searchLatest<EntityLatestServiceRaw>(`get_entity_latest_services`, {
      body: {
        size,
        track_total_hits: false,
        _source: [AGENT_NAME, ENTITY, SOURCE_DATA_STREAM_TYPE, SERVICE_NAME, SERVICE_ENVIRONMENT],
        query: {
          bool: {
            filter: [
              ...kqlQuery(kuery),
              ...environmentQuery(environment, SERVICE_ENVIRONMENT),
              ...entitiesRangeQuery(start, end),
              ...termQuery(ENTITY_TYPE, EntityType.SERVICE),
              ...termQuery(SERVICE_NAME, serviceName),
            ],
          },
        },
      },
    })
  ).hits.hits.map((hit) => hit._source);

  return latestEntityServices;
}
