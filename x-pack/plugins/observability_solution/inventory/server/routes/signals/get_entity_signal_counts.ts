/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AlertsClient } from '@kbn/rule-registry-plugin/server';
import { SloClient } from '@kbn/slo-plugin/server';
import { ObservabilityElasticsearchClient } from '@kbn/observability-utils-server/es/client/create_observability_es_client';
import { Logger } from '@kbn/logging';
import { EntityDefinition, LATEST_ENTITIES_INDEX } from '../../../common/entities';
import { withInventorySpan } from '../../lib/with_inventory_span';
import { searchPaginateThroughSignals } from './search_paginate_through_signals';
import { entityTimeRangeQuery } from '../../../common/utils/queries/entity_time_range_query';
import { deserializeLink } from '../../../common/links';
import { getSignalCountsFromSlos } from './slos/get_counts_from_slos';
import { getCountsFromSloLinks } from './slos/get_counts_from_slo_links';
import { getSignalCountsFromAlerts } from './alerts/get_counts_from_alerts';
import { getCountsFromRuleLinks } from './alerts/get_counts_from_rule_links';
import { createEntityFactory } from '../../../common/utils/create_entity_factory';

export function getEntitySignalCounts({
  alertsClient,
  end,
  logger,
  sloClient,
  start,
  typeDefinitions,
  esClient,
}: {
  start: number;
  end: number;
  alertsClient: AlertsClient;
  logger: Logger;
  sloClient: SloClient;
  typeDefinitions: EntityDefinition[];
  esClient: ObservabilityElasticsearchClient;
}) {
  return withInventorySpan(
    'get_entity_signal_counts',
    async () => {
      const linksResponse = await searchPaginateThroughSignals({}, (searchAfter) => {
        return esClient.search<{
          entity: {
            type: string;
            displayName: string;
            links: string[];
          };
        }>('get_entity_links_page', {
          index: LATEST_ENTITIES_INDEX,
          size: 10_000,
          track_total_hits: 0,
          body: {
            _source: ['entity.type', 'entity.displayName', 'entity.links'],
            search_after: searchAfter,
            query: {
              bool: {
                filter: [
                  {
                    exists: {
                      field: 'entity.links',
                    },
                  },
                  ...entityTimeRangeQuery(start, end),
                ],
              },
            },
          },
        });
      });

      const entitiesWithLinks = linksResponse.hits.map((link) => {
        const { entity } = link._source!;
        return {
          type: entity.type,
          displayName: entity.displayName,
          links: entity.links.map(deserializeLink),
        };
      });

      const [slosFromSignals, slosFromLinks, alertsFromSignals, alertsFromLinks] =
        await Promise.all([
          getSignalCountsFromSlos({
            start,
            end,
            logger,
            typeDefinitions,
            sloClient,
          }),
          getCountsFromSloLinks({
            start,
            end,
            entities: entitiesWithLinks,
            logger,
            sloClient,
          }),
          getSignalCountsFromAlerts({
            start,
            end,
            logger,
            typeDefinitions,
            alertsClient,
          }),
          getCountsFromRuleLinks({
            start,
            end,
            logger,
            alertsClient,
            entities: entitiesWithLinks,
          }),
        ]);

      const entitiesFactory = createEntityFactory(() => ({
        slos: {
          healthy: 0,
          degraded: 0,
          violated: 0,
          no_data: 0,
        },
        alerts: {
          active: 0,
          total: 0,
        },
      }));

      [...slosFromSignals, ...slosFromLinks, ...alertsFromSignals, ...alertsFromLinks].forEach(
        (entity) => {
          const existing = entitiesFactory.get({
            type: entity.type,
            displayName: entity.displayName,
          });

          if ('alerts' in entity) {
            existing.alerts.active += entity.alerts.active;
            existing.alerts.total += entity.alerts.total;
          }

          if ('slos' in entity) {
            existing.slos.healthy += entity.slos.healthy;
            existing.slos.violated += entity.slos.violated;
            existing.slos.degraded += entity.slos.degraded;
            existing.slos.no_data += entity.slos.no_data;
          }
        }
      );

      return entitiesFactory.values();
    },
    logger
  );
}
