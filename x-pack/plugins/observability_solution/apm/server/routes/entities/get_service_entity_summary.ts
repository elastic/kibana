/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { rangeQuery, termQuery, termsQuery } from '@kbn/observability-plugin/server';
import {
  AGENT_NAME,
  DATA_STEAM_TYPE,
  SERVICE_ENVIRONMENT,
  SERVICE_NAME,
} from '../../../common/es_fields/apm';
import {
  ENTITY,
  ENTITY_ID,
  ENTITY_METRICS_LOG_RATE,
  ENTITY_TYPE,
  LAST_SEEN,
} from '../../../common/es_fields/entities';
import { environmentQuery } from '../../../common/utils/environment_query';
import { EntitiesESClient } from '../../lib/helpers/create_es_client/create_assets_es_client/create_assets_es_clients';
import { entitiesRangeQuery } from './get_entities';
import { EntitiesRaw, EntityType } from './types';
import { isFiniteNumber } from '../../../common/utils/is_finite_number';

interface Params {
  entitiesESClient: EntitiesESClient;
  serviceName: string;
  environment: string;
  start: number;
  end: number;
}

export async function getServiceEntitySummary({
  end,
  entitiesESClient,
  environment,
  serviceName,
  start,
}: Params) {
  const serviceEntityDefinition = (
    await entitiesESClient.searchLatest('get_service_entity_definition', {
      body: {
        size: 1,
        track_total_hits: false,
        _source: [AGENT_NAME, ENTITY, DATA_STEAM_TYPE, SERVICE_NAME, SERVICE_ENVIRONMENT],
        query: {
          bool: {
            filter: [
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

  const serviceEntity = serviceEntityDefinition?.[0];

  if (serviceEntity === undefined) {
    return {};
  }

  const serviceEntityHistory = await entitiesESClient.searchHistory('get_service_entity_history', {
    body: {
      size: 0,
      track_total_hits: false,
      query: {
        bool: {
          filter: [
            ...rangeQuery(start, end, LAST_SEEN),
            ...termsQuery(ENTITY_ID, serviceEntity.entity.id),
          ],
        },
      },
      aggs: {
        logRate: { avg: { field: ENTITY_METRICS_LOG_RATE } },
      },
    },
  });

  const historyLogRate = serviceEntityHistory.aggregations?.logRate.value;

  return {
    ...serviceEntity,
    entity: {
      ...serviceEntity.entity,
      hasLogMetrics: isFiniteNumber(historyLogRate) ? historyLogRate > 0 : false,
    },
  };
}
