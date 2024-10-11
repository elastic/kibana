/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ObservabilityElasticsearchClient } from '@kbn/observability-utils-server/es/client/create_observability_es_client';
import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import {
  ALERT_STATUS,
  ALERT_STATUS_ACTIVE,
  ALERT_TIME_RANGE,
  ALERT_UUID,
  AlertConsumers,
} from '@kbn/rule-registry-plugin/common/technical_rule_data_field_names';
import { SloClient } from '@kbn/slo-plugin/server';
import { AlertsClient } from '@kbn/rule-registry-plugin/server';
import { pick } from 'lodash';
import { ValuesType } from 'utility-types';
import { Logger } from '@kbn/logging';
import { querySourcesAsEntities } from './query_sources_as_entities';
import {
  ENTITY_HEALTH_STATUS_INT,
  EntityGrouping,
  EntityTypeDefinition,
  IEntity,
} from '../../../common/entities';

export async function querySignalsAsEntities({
  logger,
  start,
  end,
  esClient,
  groupings,
  typeDefinitions,
  filters,
  sloClient,
  alertsClient,
}: {
  logger: Logger;
  esClient: ObservabilityElasticsearchClient;
  start: number;
  end: number;
  groupings: EntityGrouping[];
  typeDefinitions: EntityTypeDefinition[];
  filters?: QueryDslQueryContainer[];
  spaceId: string;
  sloClient: SloClient;
  alertsClient: AlertsClient;
}) {
  const consumersOfInterest: string[] = Object.values(AlertConsumers).filter(
    (consumer) => consumer !== AlertConsumers.SIEM && consumer !== AlertConsumers.EXAMPLE
  );

  const [sloSummaryDataScope, authorizedAlertsIndices] = await Promise.all([
    sloClient.getDataScopeForSummarySlos({
      start,
      end,
    }),
    alertsClient.getAuthorizedAlertsIndices(consumersOfInterest),
  ]);

  const [entitiesFromAlerts = [], entitiesFromSlos] = await Promise.all([
    authorizedAlertsIndices
      ? querySourcesAsEntities({
          logger,
          groupings,
          typeDefinitions,
          esClient,
          sources: [{ index: authorizedAlertsIndices }],
          filters: [
            ...(filters ?? [
              {
                term: {
                  [ALERT_STATUS]: ALERT_STATUS_ACTIVE,
                },
              },
            ]),
          ],
          rangeQuery: {
            range: {
              [ALERT_TIME_RANGE]: {
                gte: start,
                lte: end,
              },
            },
          },
          columns: {
            alertsCount: {
              expression: `COUNT_DISTINCT(${ALERT_UUID})`,
            },
          },
          sortField: 'alertsCount',
          sortOrder: 'desc',
          size: 10_000,
          postFilter: `WHERE alertsCount > 0`,
        })
      : undefined,
    querySourcesAsEntities({
      logger,
      groupings,
      typeDefinitions,
      esClient,
      sources: [{ index: sloSummaryDataScope.index }],
      filters: [...(filters ?? []), sloSummaryDataScope.query],
      rangeQuery: sloSummaryDataScope.query,
      columns: {
        healthStatus: {
          expression: `CASE(
            COUNT(status == "VIOLATED" OR NULL) > 0,
            ${ENTITY_HEALTH_STATUS_INT.Violated},
            COUNT(status == "DEGRADED" OR NULL) > 0,
            ${ENTITY_HEALTH_STATUS_INT.Degraded},
            COUNT(status == "NO_DATA" OR NULL) > 0,
            ${ENTITY_HEALTH_STATUS_INT.NoData},
            COUNT(status == "HEALTHY" OR NULL) > 0,
            ${ENTITY_HEALTH_STATUS_INT.Healthy},
            NULL
          )`,
        },
      },
    }),
  ]);

  const entitiesById = new Map<
    string,
    IEntity & {
      healthStatus: ValuesType<typeof ENTITY_HEALTH_STATUS_INT> | null;
      alertsCount: number;
    }
  >();

  entitiesFromAlerts.forEach((entity) => {
    const existing = entitiesById.get(entity.id);
    const alertsCount = entity.columns.alertsCount as number;
    if (existing) {
      existing.alertsCount = alertsCount;
    } else {
      entitiesById.set(entity.id, {
        ...pick(entity, 'id', 'key', 'type', 'displayName'),
        alertsCount,
        healthStatus: null,
      });
    }
  });

  entitiesFromSlos.forEach((entity) => {
    const existing = entitiesById.get(entity.id);
    const healthStatus = entity.columns.healthStatus as ValuesType<
      typeof ENTITY_HEALTH_STATUS_INT
    > | null;
    if (existing) {
      existing.healthStatus = healthStatus;
    } else {
      entitiesById.set(entity.id, {
        ...pick(entity, 'id', 'key', 'type', 'displayName'),
        alertsCount: 0,
        healthStatus,
      });
    }
  });

  return Array.from(entitiesById.values());
}
