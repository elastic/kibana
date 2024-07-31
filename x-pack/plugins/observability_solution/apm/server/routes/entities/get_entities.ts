/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { kqlQuery, termQuery } from '@kbn/observability-plugin/server';
import {
  AGENT_NAME,
  DATA_STEAM_TYPE,
  SERVICE_ENVIRONMENT,
  SERVICE_NAME,
} from '../../../common/es_fields/apm';
import { FIRST_SEEN, LAST_SEEN, ENTITY, ENTITY_TYPE } from '../../../common/es_fields/entities';
import { environmentQuery } from '../../../common/utils/environment_query';
import { EntitiesESClient } from '../../lib/helpers/create_es_client/create_assets_es_client/create_assets_es_clients';
import { getServiceEntitiesHistoryMetrics } from './get_service_entities_history_metrics';
import { EntitiesRaw, EntityType, ServiceEntities } from './types';

export function entitiesRangeQuery(start: number, end: number): QueryDslQueryContainer[] {
  return [
    {
      range: {
        [LAST_SEEN]: {
          gte: start,
        },
      },
    },
    {
      range: {
        [FIRST_SEEN]: {
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
    await entitiesESClient.searchLatest(`get_entities`, {
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
            ],
          },
        },
      },
    })
  ).hits.hits.map((hit) => hit._source as EntitiesRaw);

  const serviceEntitiesHistoryMetricsMap = entities.length
    ? await getServiceEntitiesHistoryMetrics({
        start,
        end,
        entitiesESClient,
        entityIds: entities.map((entity) => entity.entity.id),
      })
    : undefined;

  return entities.map((entity): ServiceEntities => {
    return {
      serviceName: entity.service.name,
      environment: Array.isArray(entity.service?.environment) // TODO fix this in the EEM
        ? entity.service.environment[0]
        : entity.service.environment,
      agentName: entity.agent.name[0],
      signalTypes: entity.data_stream.type,
      entity: {
        ...entity.entity,
        // History metrics undefined means that for the selected time range there was no ingestion happening.
        metrics: serviceEntitiesHistoryMetricsMap?.[entity.entity.id] || {
          latency: null,
          logErrorRate: null,
          failedTransactionRate: null,
          logRate: null,
          throughput: null,
        },
      },
    };
  });
}
