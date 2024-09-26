/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import { Logger } from '@kbn/logging';
import { SloClient } from '@kbn/slo-plugin/server';

import pLimit from 'p-limit';
import { EntityDefinition } from '../../../../common/entities';
import { entityTypeExistsQuery } from '../../../../common/utils/queries/entity_type_exists_query';
import { withInventorySpan } from '../../../lib/with_inventory_span';
import { compositePaginateThroughEntities } from '../composite_paginate_through_entities';
import { getSloFilterAggregations } from './get_slo_filter_aggregations';
import { EntityWithSloCounts } from './types';
import { createEntityFactory } from '../../../../common/utils/create_entity_factory';

export async function getSignalCountsFromSlos({
  sloClient,
  start,
  end,
  typeDefinitions,
  logger,
}: {
  sloClient: SloClient;
  start: number;
  end: number;
  typeDefinitions: EntityDefinition[];
  logger: Logger;
}): Promise<Array<{ id: string } & EntityWithSloCounts>> {
  return withInventorySpan(
    'get_signal_counts_from_slos',
    async () => {
      const limiter = pLimit(10);

      const sloDataScope = await sloClient.getDataScopeForSummarySlos({
        start,
        end,
      });

      const slosFromTypes = await Promise.all(
        typeDefinitions.map((definition) => {
          const sloQuery: QueryDslQueryContainer = {
            bool: {
              filter: [
                sloDataScope.query,
                ...entityTypeExistsQuery({
                  identityFields: definition.identityFields.map(({ field, optional }) => ({
                    field: `slo.groupings.${field}`,
                    optional,
                  })),
                }),
              ],
            },
          };
          return limiter(() =>
            withInventorySpan(
              'get_entities_for_type_from_slos',
              () =>
                compositePaginateThroughEntities(
                  {
                    definition,
                    getFieldAlias: (field) => `slo.groupings.${field}`,
                    logger,
                    aggs: getSloFilterAggregations(),
                    fields: {},
                  },
                  (request) =>
                    sloClient.searchSloSummaryIndex({
                      aggs: request.aggs,
                      query: sloQuery,
                      track_total_hits: false,
                      size: 0,
                    })
                ),
              logger
            )
          );
        })
      );

      const slos = slosFromTypes.flat();

      const entityWithSloCountsFactory = createEntityFactory(() => ({
        slos: { healthy: 0, violated: 0, degraded: 0, no_data: 0 },
      }));

      slos.forEach(
        ({ aggregations: { no_data: noData, degraded, healthy, violated }, displayName, type }) => {
          const entity = entityWithSloCountsFactory.get({ type, displayName });

          entity.slos.degraded += degraded.doc_count;
          entity.slos.healthy += healthy.doc_count;
          entity.slos.no_data += noData.doc_count;
          entity.slos.violated += violated.doc_count;
        }
      );

      return entityWithSloCountsFactory.values();
    },
    logger
  );
}
