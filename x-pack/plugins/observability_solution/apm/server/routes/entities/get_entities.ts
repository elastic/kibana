/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { kqlQuery } from '@kbn/observability-plugin/server';
import { AGENT_NAME, DATA_STEAM_TYPE } from '../../../common/es_fields/apm';
import {
  ENTITY_ENVIRONMENT,
  FIRST_SEEN,
  LAST_SEEN,
  ENTITY,
} from '../../../common/es_fields/entities';
import { environmentQuery } from '../../../common/utils/environment_query';
import { EntitiesESClient } from '../../lib/helpers/create_es_client/create_assets_es_client/create_assets_es_clients';
import { EntitiesRaw, ServiceEntities } from './types';

export function entitiesRangeQuery(start: number, end: number): QueryDslQueryContainer[] {
  return [
    {
      range: {
        [FIRST_SEEN]: {
          gte: start,
        },
      },
    },
    {
      range: {
        [LAST_SEEN]: {
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
}: {
  entitiesESClient: EntitiesESClient;
  start: number;
  end: number;
  environment: string;
  kuery: string;
  size: number;
}) {
  const entities = (
    await entitiesESClient.search(`get_entities`, {
      body: {
        size,
        track_total_hits: false,
        _source: [AGENT_NAME, ENTITY, DATA_STEAM_TYPE],
        query: {
          bool: {
            filter: [
              ...kqlQuery(kuery),
              ...environmentQuery(environment, ENTITY_ENVIRONMENT),
              ...entitiesRangeQuery(start, end),
            ],
          },
        },
      },
    })
  ).hits.hits.map((hit) => hit._source as EntitiesRaw);

  return entities.map((entity): ServiceEntities => {
    return {
      serviceName: entity.entity.identityFields.service.name,
      agentName: entity.agent.name[0],
      signalTypes: entity.data_stream.type,
      entity: entity.entity,
    };
  });
}
