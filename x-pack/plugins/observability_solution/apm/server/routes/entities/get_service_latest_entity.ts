/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { kqlQuery, termQuery } from '@kbn/observability-plugin/server';
import {
  AGENT_NAME,
  DATA_STEAM_TYPE,
  SERVICE_ENVIRONMENT,
  SERVICE_NAME,
} from '../../../common/es_fields/apm';
import { ENTITY, ENTITY_TYPE } from '../../../common/es_fields/entities';
import { environmentQuery } from '../../../common/utils/environment_query';
import { isFiniteNumber } from '../../../common/utils/is_finite_number';
import { EntitiesESClient } from '../../lib/helpers/create_es_client/create_assets_es_client/create_assets_es_clients';
import { entitiesRangeQuery } from './get_entities';
import { EntitiesRaw, EntityType, ServiceEntities } from './types';

export async function getServiceLatestEntity({
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
  serviceName: string;
}): Promise<ServiceEntities | undefined> {
  const entities = (
    await entitiesESClient.searchLatest(`get_latest_entity`, {
      body: {
        size,
        track_total_hits: false,
        _source: [AGENT_NAME, ENTITY, DATA_STEAM_TYPE, SERVICE_NAME, SERVICE_ENVIRONMENT],
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
  ).hits.hits.map((hit) => hit._source as EntitiesRaw);

  return entities.map((entity) => {
    const logRate = entity.entity.metrics.logRate;
    return {
      serviceName: entity.service.name,
      environment: Array.isArray(entity.service?.environment)
        ? entity.service.environment[0]
        : entity.service.environment,
      agentName: entity.agent.name[0],
      signalTypes: entity.data_stream.type,
      entity: {
        ...entity.entity,
        hasLogMetrics: isFiniteNumber(logRate) ? logRate > 0 : false,
      },
    };
  })?.[0];
}
