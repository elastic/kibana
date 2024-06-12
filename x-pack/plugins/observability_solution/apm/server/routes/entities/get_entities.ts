/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { kqlQuery } from '@kbn/observability-plugin/server';
import { ENTITY_ENVIRONMENT, FIRST_SEEN, LAST_SEEN } from '../../../common/es_fields/entities';
import { environmentQuery } from '../../../common/utils/environment_query';
import { EntitiesESClient } from '../../lib/helpers/create_es_client/create_assets_es_client/create_assets_es_clients';

export interface ServiceEntities {
  serviceName: string;
  agentName?: string;
  dataStreams: string[];
  entity: Entity;
}

export interface MergedServiceEntities {
  serviceName: string;
  agentName?: string;
  dataStreams: string[];
  environments: string[];
  metrics: EntityMetrics[];
}

export interface EntityMetrics {
  latency?: number | null;
  failedTransactionRate?: number | null;
  throughput?: number | null;
  logErrorRate?: number | null;
  logRatePerMinute?: number | null;
}
interface Entity {
  id: string;
  latestTimestamp: string;
  identityFields: {
    service: {
      name: string;
      environment?: string;
    };
  };
  metrics: EntityMetrics;
}

interface EntitiesRaw {
  agent: {
    name: string[];
  };
  data_stream: {
    type: string[];
  };
  entity: Entity;
}
export interface SourceDoc {
  [key: string]: string | string[] | SourceDoc;
}

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
  assetsESClient,
  start,
  end,
  environment,
  kuery,
  size,
}: {
  assetsESClient: EntitiesESClient;
  start: number;
  end: number;
  environment: string;
  kuery: string;
  size: number;
}) {
  const entities = (
    await assetsESClient.search(`get_entities`, {
      body: {
        size,
        track_total_hits: false,
        _source: ['agent.name', 'entity', 'data_stream'],
        query: {
          bool: {
            filter: [
              ...kqlQuery(kuery),
              ...environmentQuery(environment, ENTITY_ENVIRONMENT),
              // Not supported for now
              //...entitiesRangeQuery(start, end),
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
      dataStreams: entity.data_stream.type,
      entity: entity.entity,
    };
  });
}
