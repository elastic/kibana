/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger } from '@kbn/logging';
import { SloClient } from '@kbn/slo-plugin/server';
import { groupBy } from 'lodash';
import { Entity } from '../../../../common/entities';
import { getEntityId } from '../../../../common/utils/get_entity_id';
import { withInventorySpan } from '../../../lib/with_inventory_span';
import { compositePaginate } from '../composite_paginate';
import { getSloFilterAggregations } from './get_slo_filter_aggregations';
import { EntityWithSloCounts } from './types';
import { createEntityFactory } from '../../../../common/utils/create_entity_factory';

export async function getCountsFromSloLinks({
  sloClient,
  entities,
  start,
  end,
  logger,
}: {
  sloClient: SloClient;
  entities: Array<Pick<Entity, 'type' | 'displayName' | 'links'>>;
  start: number;
  end: number;
  logger: Logger;
}): Promise<Array<{ id: string } & EntityWithSloCounts>> {
  const linksWithEntities = entities.flatMap(({ type, displayName, links }) => {
    return links
      .filter((link) => link.asset.type === 'sloDefinition')
      .map((link) => {
        return {
          entity: {
            type,
            displayName,
            id: getEntityId({ type, displayName }),
          },
          link,
        };
      });
  });

  const entitiesBySloId = groupBy(linksWithEntities, ({ link }) => {
    return link.asset.id;
  });

  const allSloIds = Object.keys(entitiesBySloId);

  if (!allSloIds.length) {
    return [];
  }

  const sloDataScope = await sloClient.getDataScopeForSummarySlos({ start, end, ids: allSloIds });

  const { groups: countsBySloId } = await withInventorySpan(
    'get_counts_from_slo_links',
    () =>
      compositePaginate(
        {
          logger,
          fields: {
            'slo.id': {
              missing_bucket: false,
            },
          },
          aggs: getSloFilterAggregations(),
        },
        (request) =>
          withInventorySpan(
            'get_alerts_page',
            () =>
              sloClient.searchSloSummaryIndex({
                aggs: request.aggs,
                size: 0,
                track_total_hits: false,
                query: sloDataScope,
              }),

            logger
          )
      ),
    logger
  );

  const entityWithSloCountsFactory = createEntityFactory(() => ({
    slos: { healthy: 0, violated: 0, degraded: 0, no_data: 0 },
  }));

  countsBySloId.forEach(({ no_data: noData, degraded, healthy, violated, key }) => {
    const entitiesForSloId = entitiesBySloId[key['slo.id']];
    entitiesForSloId?.forEach(({ entity: { type, displayName } }) => {
      const entity = entityWithSloCountsFactory.get({ type, displayName });

      entity.slos.degraded += degraded.doc_count;
      entity.slos.healthy += healthy.doc_count;
      entity.slos.no_data += noData.doc_count;
      entity.slos.violated += violated.doc_count;
    });
  });

  return entityWithSloCountsFactory.values();
}
