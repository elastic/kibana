/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger } from '@kbn/logging';
import {
  ALERT_RULE_UUID,
  ALERT_STATUS,
  ALERT_STATUS_ACTIVE,
  ALERT_TIME_RANGE,
} from '@kbn/rule-registry-plugin/common/technical_rule_data_field_names';
import { AlertsClient } from '@kbn/rule-registry-plugin/server';
import { groupBy } from 'lodash';
import { Entity } from '../../../../common/entities';
import { getEntityId } from '../../../../common/utils/get_entity_id';
import { withInventorySpan } from '../../../lib/with_inventory_span';
import { compositePaginate } from '../composite_paginate';
import { EntityWithAlertsCounts } from './types';

export async function getCountsFromRuleLinks({
  alertsClient,
  entities,
  start,
  end,
  logger,
}: {
  alertsClient: AlertsClient;
  entities: Array<Pick<Entity, 'type' | 'displayName' | 'links'>>;
  start: number;
  end: number;
  logger: Logger;
}): Promise<Array<{ id: string } & EntityWithAlertsCounts>> {
  const linksWithEntities = entities.flatMap(({ type, displayName, links }) => {
    return links
      .filter((link) => link.asset.type === 'rule')
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

  const entitiesByRuleId = groupBy(linksWithEntities, ({ link }) => {
    return link.asset.id;
  });

  const allRuleIds = Object.keys(entitiesByRuleId);

  if (!allRuleIds.length) {
    return [];
  }

  const { groups: countsByRuleId } = await withInventorySpan(
    'get_counts_from_rule_links',
    () =>
      compositePaginate(
        {
          logger,
          fields: {
            [ALERT_RULE_UUID]: {
              missing_bucket: false,
            },
          },
          aggs: {
            active: {
              filter: {
                term: {
                  [ALERT_STATUS]: ALERT_STATUS_ACTIVE,
                },
              },
            },
          },
        },
        (request) =>
          withInventorySpan(
            'get_alerts_page',
            () =>
              alertsClient.find({
                aggs: request.aggs,
                query: {
                  bool: {
                    filter: [
                      {
                        terms: {
                          [ALERT_RULE_UUID]: allRuleIds,
                        },
                      },
                      {
                        range: {
                          [ALERT_TIME_RANGE]: {
                            gte: start,
                            lte: end,
                          },
                        },
                      },
                    ],
                  },
                },
              }),

            logger
          )
      ),
    logger
  );

  const entityWithAlertCountsById = new Map<string, EntityWithAlertsCounts & { id: string }>(
    entities.map(({ type, displayName, links }) => {
      const entity = {
        id: getEntityId({ type, displayName }),
        type,
        displayName,
        alerts: { active: 0, total: 0 },
      };
      return [entity.id, entity];
    })
  );

  countsByRuleId.forEach(({ active, doc_count: docCount, key }) => {
    const entitiesForRuleId = entitiesByRuleId[key['kibana.alert.rule.uuid']];
    entitiesForRuleId?.forEach(({ entity: { id } }) => {
      const entity = entityWithAlertCountsById.get(id);
      if (!entity) {
        throw new Error(`Could not find entity by id ${id} in lookup map`);
      }
      entity.alerts.active += active.doc_count;
      entity.alerts.total += docCount;
    });
  });

  return Array.from(entityWithAlertCountsById.values());
}
