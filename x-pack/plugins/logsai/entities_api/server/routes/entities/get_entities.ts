/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryDslQueryContainer } from '@kbn/data-views-plugin/common/types';
import type { Logger } from '@kbn/logging';
import type { ObservabilityElasticsearchClient } from '@kbn/observability-utils-server/es/client/create_observability_es_client';
import type { AlertsClient } from '@kbn/rule-registry-plugin/server';
import { SloClient } from '@kbn/slo-plugin/server';
import type {
  DefinitionEntity,
  EntityDataSource,
  EntityTypeDefinition,
  EntityWithSignalStatus,
} from '../../../common/entities';
import { EntityGrouping, healthStatusIntToKeyword } from '../../../common/entities';
import { querySignalsAsEntities } from '../../lib/entities/query_signals_as_entities';
import { querySourcesAsEntities } from '../../lib/entities/query_sources_as_entities';
import { withEntitiesAPISpan } from '../../lib/with_entities_api_span';

export async function getEntities({
  currentUserEsClient,
  internalUserEsClient,
  start,
  end,
  sourceRangeQuery,
  groupings,
  typeDefinitions,
  sources,
  logger,
  filters,
  alertsClient,
  sloClient,
  sortField,
  sortOrder,
  postFilter,
  spaceId,
}: {
  currentUserEsClient: ObservabilityElasticsearchClient;
  internalUserEsClient: ObservabilityElasticsearchClient;
  start: number;
  end: number;
  sourceRangeQuery?: QueryDslQueryContainer;
  sources: EntityDataSource[];
  groupings: Array<EntityGrouping | DefinitionEntity>;
  typeDefinitions: EntityTypeDefinition[];
  logger: Logger;
  filters?: QueryDslQueryContainer[];
  alertsClient: AlertsClient;
  sloClient: SloClient;
  sortField: 'entity.type' | 'entity.displayName' | 'healthStatus' | 'alertsCount';
  sortOrder: 'asc' | 'desc';
  postFilter?: string;
  spaceId: string;
}): Promise<EntityWithSignalStatus[]> {
  if (!groupings.length) {
    throw new Error('No groupings were defined');
  }

  return withEntitiesAPISpan(
    'get_latest_entities',
    async () => {
      const entitiesWithSignals = await querySignalsAsEntities({
        logger,
        start,
        end,
        spaceId,
        alertsClient,
        esClient: internalUserEsClient,
        groupings,
        typeDefinitions,
        sloClient,
        filters,
      });

      const entitiesFromSources = await querySourcesAsEntities({
        logger,
        esClient: currentUserEsClient,
        groupings,
        typeDefinitions,
        sources,
        filters,
        sortField,
        sortOrder,
        postFilter,
        tables: [
          {
            name: 'signals',
            joins: ['entity.id'],
            columns: entitiesWithSignals.reduce(
              (prev, current) => {
                prev['entity.id'].keyword.push(current.id);
                prev.alertsCount.long.push(current.alertsCount);
                prev.healthStatus.long.push(current.healthStatus);
                return prev;
              },
              {
                'entity.id': { keyword: [] as string[] },
                alertsCount: {
                  long: [] as Array<number | null>,
                },
                healthStatus: { long: [] as Array<number | null> },
              }
            ),
          },
        ],
        rangeQuery: sourceRangeQuery ?? {
          range: {
            '@timestamp': {
              gte: start,
              lte: end,
            },
          },
        },
      });

      return entitiesFromSources.map((entity) => {
        const { columns, ...base } = entity;

        return {
          ...base,
          healthStatus:
            entity.columns.healthStatus !== null
              ? healthStatusIntToKeyword(entity.columns.healthStatus as 1 | 2 | 3 | 4)
              : null,
          alertsCount: entity.columns.alertsCount as number,
        };
      });
    },
    logger
  );
}
