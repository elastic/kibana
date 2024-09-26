/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import { Logger } from '@kbn/logging';

import { AlertsClient } from '@kbn/rule-registry-plugin/server';
import pLimit from 'p-limit';
import { rangeQuery } from '@kbn/observability-utils-common/es/queries/range_query';
import {
  ALERT_STATUS,
  ALERT_STATUS_ACTIVE,
  ALERT_TIME_RANGE,
} from '@kbn/rule-registry-plugin/common/technical_rule_data_field_names';
import { EntityDefinition } from '../../../../common/entities';
import { entityTypeExistsQuery } from '../../../../common/utils/queries/entity_type_exists_query';
import { withInventorySpan } from '../../../lib/with_inventory_span';
import { compositePaginateThroughEntities } from '../composite_paginate_through_entities';
import { EntityWithAlertsCounts } from './types';
import { createEntityFactory } from '../../../../common/utils/create_entity_factory';

export async function getSignalCountsFromAlerts({
  alertsClient,
  start,
  end,
  typeDefinitions,
  logger,
}: {
  alertsClient: AlertsClient;
  start: number;
  end: number;
  typeDefinitions: EntityDefinition[];
  logger: Logger;
}): Promise<Array<{ id: string } & EntityWithAlertsCounts>> {
  return withInventorySpan(
    'get_signal_counts_from_alerts',
    async () => {
      const limiter = pLimit(10);

      const alertsFromTypes = await Promise.all(
        typeDefinitions.map((definition) => {
          const alertsQuery: QueryDslQueryContainer = {
            bool: {
              filter: [
                ...entityTypeExistsQuery(definition),
                ...rangeQuery(start, end, ALERT_TIME_RANGE),
              ],
            },
          };

          return limiter(() =>
            withInventorySpan(
              'get_entities_for_type_from_alerts',
              () =>
                compositePaginateThroughEntities(
                  {
                    definition,
                    logger,
                    aggs: {
                      active: {
                        filter: {
                          term: {
                            [ALERT_STATUS]: ALERT_STATUS_ACTIVE,
                          },
                        },
                      },
                    },
                    fields: {},
                  },
                  (request) =>
                    alertsClient.find({
                      aggs: request.aggs,
                      query: alertsQuery,
                      size: 0,
                      track_total_hits: false,
                    }) as Promise<any>
                ),
              logger
            )
          );
        })
      );

      const alerts = alertsFromTypes.flat();

      const entityWithAlertsCountsFactory = createEntityFactory(() => ({
        alerts: { active: 0, total: 0 },
      }));

      alerts.forEach(({ aggregations: { active }, doc_count: docCount, displayName, type }) => {
        const entity = entityWithAlertsCountsFactory.get({ type, displayName });

        entity.alerts.active += active.doc_count;
        entity.alerts.total += docCount;
      });

      return entityWithAlertsCountsFactory.values();
    },
    logger
  );
}
