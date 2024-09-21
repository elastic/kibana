/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  AggregationsCompositeAggregateKey,
  AggregationsCompositeBucket,
  QueryDslBoolQuery,
  QueryDslQueryContainer,
} from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type { RulesClient } from '@kbn/alerting-plugin/server';
import type { Logger } from '@kbn/logging';
import { rangeQuery } from '@kbn/observability-utils-common/es/queries/range_query';
import type { ParsedTechnicalFields } from '@kbn/rule-registry-plugin/common';
import {
  ALERT_RULE_RULE_ID,
  ALERT_TIME_RANGE,
  ALERT_UUID,
} from '@kbn/rule-registry-plugin/common/technical_rule_data_field_names';
import type { AlertsClient } from '@kbn/rule-registry-plugin/server';
import { castArray, groupBy, last, memoize, uniq, uniqBy } from 'lodash';
import pLimit from 'p-limit';
import type { RuleAsset } from '../../../common/assets';
import type {
  EntityDefinition,
  EntityWithLinks,
  EntityWithSignals,
  IdentityField,
} from '../../../common/entities';
import { getEntitySourceDslFilter } from '../../../common/utils/get_entity_source_dsl_filter';
import { withInventorySpan } from '../../lib/with_inventory_span';

async function getActiveAlertsCountsByEntity({
  alertsClient,
  start,
  end,
  query,
  identityFields,
}: {
  alertsClient: AlertsClient;
  start: number;
  end: number;
  query: QueryDslBoolQuery;
  identityFields: IdentityField[];
}): Promise<Array<{ properties: Record<string, string | number | null>; count: number }>> {
  async function getAlerts(afterKey?: unknown): Promise<AggregationsCompositeBucket[]> {
    const alerts = await alertsClient.find({
      size: 0,
      query: {
        bool: {
          filter: [...rangeQuery(start, end), query],
        },
      },
      aggs: {
        groups: {
          composite: {
            after: afterKey,
            sources: identityFields.map(({ field, optional }) => {
              return {
                [field]: {
                  terms: {
                    field,
                    missing_bucket: optional,
                  },
                },
              };
            }),
            size: 10_000,
          },
        },
      },
    });

    const groups = alerts.aggregations?.groups as {
      buckets: AggregationsCompositeBucket[];
      after_key?: AggregationsCompositeAggregateKey;
    };
    if (groups.after_key) {
      return [...groups.buckets, ...(await getAlerts(groups.after_key))];
    }
    return groups.buckets;
  }

  const alertGroups = await getAlerts();

  const alertsByEntity = alertGroups.map((group) => {
    return {
      properties: Object.fromEntries(identityFields.map(({ field }) => [field, group.key[field]])),
      count: group.count as number,
    };
  });

  return alertsByEntity;
}

export async function getEntitySignals({
  entities,
  typeDefinitions,
  rulesClient,
  alertsClient,
  logger,
  start,
  end,
}: {
  entities: EntityWithLinks[];
  typeDefinitions?: EntityDefinition[];
  rulesClient: RulesClient;
  alertsClient: AlertsClient;
  logger: Logger;
  start: number;
  end: number;
}): Promise<Array<EntityWithSignals & EntityWithLinks>> {
  const usedTypes = uniq(entities.map((entity) => entity.type));

  const typeDefinitionsMap = new Map(typeDefinitions?.map((def) => [def.type, def]) ?? []);

  const ruleIdsToFetch = uniqBy(
    entities.flatMap((entity) =>
      entity.links
        .filter((link) => link.asset.type === 'rule')
        .map((link) => link.asset as RuleAsset)
    ),
    (ruleAsset) => ruleAsset.id
  );

  const limiter = pLimit(10);

  const rules = await withInventorySpan(
    'get_rules',
    () =>
      Promise.all(
        ruleIdsToFetch.map((rule) => {
          return limiter(() => {
            return rulesClient.get<Record<string, unknown>>({ id: rule.id });
          });
        })
      ),
    logger
  );

  const entityQueries = entities.map((entity) => {
    const type = typeDefinitionsMap.get(entity.type);
    if (!type) {
      return { entity };
    }
    return {
      entity,
      query: getEntitySourceDslFilter({
        entity,
        identityFields: type.identityFields,
      }),
    };
  });

  const allQueries = rules
    .map((rule): QueryDslQueryContainer => {
      return {
        term: {
          [ALERT_RULE_RULE_ID]: rule.id,
        },
      };
    })
    .concat(
      entityQueries.flatMap((entity) => (entity.query ? [{ bool: { filter: entity.query } }] : []))
    );

  async function getAlerts(searchAfter?: Array<string | number>): Promise<ParsedTechnicalFields[]> {
    const perPage = 10_000;

    const query = {
      bool: {
        filter: [...rangeQuery(start, end, ALERT_TIME_RANGE)],
        should: allQueries,
        minimum_should_match: 1,
      },
    };

    const alertsResponse = await withInventorySpan(
      'get_alerts_page',
      () =>
        alertsClient.find({
          query,
          size: perPage,
          track_total_hits: false,
          search_after: searchAfter,
          sort: [{ '@timestamp': 'desc' }, { [ALERT_UUID]: 'desc' }],
        }),
      logger
    );

    const alerts = alertsResponse.hits.hits.map((hit) => hit._source!);

    if (alertsResponse.hits.hits.length < perPage) {
      return alerts;
    }

    const lastAlert = last(alertsResponse.hits.hits);

    const nextSearchAfter = lastAlert?.sort!;

    return [...alerts, ...(await getAlerts(nextSearchAfter))];
  }

  const allAlerts = await withInventorySpan('get_all_alerts', () => getAlerts(), logger);

  const alertsByRuleId: Record<string, ParsedTechnicalFields[]> = groupBy(
    allAlerts,
    (alert) => alert[ALERT_RULE_RULE_ID]
  );

  const alertsWithEntityLookupIds: Record<string, ParsedTechnicalFields[]> = {};

  const logWarningForType = memoize((type: string) =>
    logger.warn(() => `Did not find entity definition for type ${type}`)
  );

  function getEntityLookupIds(
    source: Record<string, unknown>,
    type: string,
    identityFields: string[]
  ) {
    const lookupIds = identityFields.flatMap((field) => {
      const values = castArray(source[field]);
      return values.map((value) => {
        return `${type}:${field}:${value}`;
      });
    });
    return lookupIds;
  }

  allAlerts.forEach((alert) => {
    usedTypes.forEach((type) => {
      const def = typeDefinitionsMap.get(type);
      if (!def) {
        logWarningForType(type);
        return;
      }
      const lookupIds = getEntityLookupIds(
        alert,
        type,
        def.identityFields.map((field) => field.field)
      );

      lookupIds.forEach((lookupId) => {
        const alertsForId = alertsWithEntityLookupIds[lookupId] ?? [];
        alertsForId.push(alert);
        alertsWithEntityLookupIds[lookupId] = alertsForId;
      });
    });
  });

  const entityWithSignals = entities.map((entity) => {
    const def = typeDefinitionsMap.get(entity.type);
    if (!def) {
      logWarningForType(entity.type);
      return { ...entity, signals: [] };
    }
    const entityLookupId = getEntityLookupIds(
      entity.properties,
      entity.type,
      def.identityFields.map(({ field }) => field)
    )[0];

    const alertsForEntity = alertsWithEntityLookupIds[entityLookupId] ?? [];
    const alertsForEntityViaRules = entity.links.flatMap((link) => {
      if (link.asset.type === 'rule') {
        return alertsByRuleId[link.asset.id];
      }
      return [];
    });

    return {
      ...entity,
      signals: [...alertsForEntity, ...alertsForEntityViaRules].map((alert) => ({
        type: 'alert' as const,
        id: alert[ALERT_UUID],
      })),
    };
  });

  return entityWithSignals;
}
