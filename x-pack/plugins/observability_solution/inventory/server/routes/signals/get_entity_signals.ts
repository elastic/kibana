/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger } from '@kbn/logging';
import { rangeQuery } from '@kbn/observability-utils-common/es/queries/range_query';
import {
  ALERT_RULE_UUID,
  ALERT_TIME_RANGE,
} from '@kbn/rule-registry-plugin/common/technical_rule_data_field_names';
import { AlertsClient } from '@kbn/rule-registry-plugin/server';
import { SloClient } from '@kbn/slo-plugin/server';
import { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import { Entity, EntityDefinition } from '../../../common/entities';
import { entitySourceQuery } from '../../../common/utils/queries/entity_source_query';
import { withInventorySpan } from '../../lib/with_inventory_span';
import { searchPaginateThroughSignals } from './search_paginate_through_signals';

export async function getEntitySignals({
  entity,
  definition,
  alertsClient,
  sloClient,
  logger,
  start,
  end,
}: {
  entity: Entity;
  definition: EntityDefinition;
  alertsClient: AlertsClient;
  sloClient: SloClient;
  logger: Logger;
  start: number;
  end: number;
}) {
  return withInventorySpan(
    'get_entity_signals',
    async () => {
      const ruleIds = entity.links
        .filter((link) => link.asset.type === 'rule')
        .map((link) => link.asset.id);

      const sloIds = entity.links
        .filter((link) => link.asset.type === 'sloDefinition')
        .map((link) => link.asset.id);

      const alertsQuery = {
        bool: {
          filter: [...rangeQuery(start, end, ALERT_TIME_RANGE)],
          should: [
            {
              bool: {
                filter: ruleIds.length ? [{ terms: { [ALERT_RULE_UUID]: ruleIds } }] : [],
              },
            },
            {
              bool: {
                filter: entitySourceQuery({ entity, identityFields: definition.identityFields }),
              },
            },
          ],
          minimum_should_match: 1,
        },
      };

      const slosWithIdsQuery = await sloClient.getDataScopeForSummarySlos({
        ids: sloIds,
        start,
        end,
      });
      const slosWithoutIdsQuery = await sloClient.getDataScopeForSummarySlos({ start, end });

      const sloQuery: QueryDslQueryContainer = {
        bool: {
          should: [
            slosWithIdsQuery.query,
            {
              bool: {
                filter: [
                  slosWithoutIdsQuery.query,
                  ...entitySourceQuery({ entity, identityFields: definition.identityFields }),
                ],
              },
            },
          ],
          minimum_should_match: 1,
        },
      };

      const [allAlerts, allSlos] = await Promise.all([
        withInventorySpan(
          'get_alerts_for_entity',
          () =>
            searchPaginateThroughSignals({}, (searchAfter) => {
              return alertsClient.find({
                search_after: searchAfter,
                size: 10_000,
                track_total_hits: false,
                query: alertsQuery,
              });
            }),
          logger
        ),
        withInventorySpan(
          'get_slos_for_entity',
          () =>
            searchPaginateThroughSignals({}, (searchAfter) => {
              return sloClient.searchSloSummaryIndex({
                search_after: searchAfter,
                size: 10_000,
                track_total_hits: false,
                query: sloQuery,
              });
            }),
          logger
        ),
      ]);

      return {
        alerts: allAlerts.hits.map((hit) => hit._source!),
        slos: allSlos.hits.map((hit) => hit._source!),
      };
    },
    logger
  );
}
