/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { FIRST_SEEN, LAST_SEEN } from '../../../common/es_fields/entities';
import type { EntitiesESClient } from '../../lib/helpers/create_es_client/create_entities_es_client/create_entities_es_client';
import { getEntityLatestServices } from './get_entity_latest_services';
import type { EntityLatestServiceRaw } from './types';
import { getEntityHistoryServicesMetrics } from './get_entity_history_services_metrics';

export function entitiesRangeQuery(start?: number, end?: number): QueryDslQueryContainer[] {
  if (!start || !end) {
    return [];
  }

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

  const serviceEntitiesHistoryMetricsMap = entityLatestServices.length
    ? await getEntityHistoryServicesMetrics({
        start,
        end,
        entitiesESClient,
        entityIds: entityLatestServices.map((latestEntity) => latestEntity.entity.id),
        size,
      })
    : undefined;

  return entityLatestServices.map((latestEntity) => {
    const historyEntityMetrics = serviceEntitiesHistoryMetricsMap?.[latestEntity.entity.id];
    return {
      ...latestEntity,
      entity: {
        ...latestEntity.entity,
        metrics: historyEntityMetrics || {
          latency: undefined,
          logErrorRate: undefined,
          failedTransactionRate: undefined,
          logRate: undefined,
          throughput: undefined,
        },
      },
    };
  });
}
