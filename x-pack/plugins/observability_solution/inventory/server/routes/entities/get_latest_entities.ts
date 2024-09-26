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
import pLimit from 'p-limit';
import type {
  EntitySortField,
  EntityWithSignalCounts,
  InventoryEntityDefinition,
} from '../../../common/entities';
import { withInventorySpan } from '../../lib/with_inventory_span';
import { getEntitiesFromSource } from './get_entities_from_source';
import { lookupEntitiesById } from './lookup_entities_by_id';
import { searchLatestEntitiesIndex } from './search_latest_entities_index';
import { getEntitySignalCounts } from '../signals/get_entity_signal_counts';

export async function getLatestEntities({
  esClient,
  kuery,
  start,
  end,
  fromSourceIfEmpty,
  typeDefinitions,
  logger,
  dslFilter,
  alertsClient,
  sloClient,
  sortField,
  sortOrder,
  postFilter,
}: {
  esClient: ObservabilityElasticsearchClient;
  kuery: string;
  start: number;
  end: number;
  fromSourceIfEmpty?: boolean;
  typeDefinitions: InventoryEntityDefinition[];
  logger: Logger;
  dslFilter?: QueryDslQueryContainer[];
  alertsClient: AlertsClient;
  sloClient: SloClient;
  sortField: EntitySortField;
  sortOrder: 'asc' | 'desc';
  postFilter?: string;
}): Promise<EntityWithSignalCounts[]> {
  return withInventorySpan(
    'get_latest_entities',
    async () => {
      const signals = await getEntitySignalCounts({
        alertsClient,
        end,
        esClient,
        logger,
        sloClient,
        start,
        typeDefinitions,
      });

      const response = await searchLatestEntitiesIndex({
        esClient,
        start,
        end,
        kuery,
        dslFilter: [
          ...(dslFilter ?? []),
          ...(typeDefinitions?.length
            ? [
                {
                  terms: {
                    'entity.type': typeDefinitions.map((definition) => definition.type),
                  },
                },
              ]
            : []),
        ],
        signals,
        sortOrder,
        sortField,
        postFilter,
      });

      if (response.length || !fromSourceIfEmpty) {
        return response;
      }

      const limiter = pLimit(10);

      const entitiesFromSourceResults = await Promise.all(
        typeDefinitions.map((definition) => {
          return limiter(() => {
            return getEntitiesFromSource({
              esClient,
              start,
              end,
              kuery,
              indexPatterns: definition.sources.flatMap((source) => source.indexPatterns),
              definition,
              logger,
              dslFilter,
            });
          });
        })
      );

      return await lookupEntitiesById({
        esClient,
        start,
        end,
        entities: entitiesFromSourceResults.flat(),
        signals,
        sortOrder,
        sortField,
      });
    },
    logger
  );
}
