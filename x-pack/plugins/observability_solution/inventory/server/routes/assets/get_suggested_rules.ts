/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RegistryRuleType } from '@kbn/alerting-plugin/server/rule_type_registry';
import type { RulesClientApi } from '@kbn/alerting-plugin/server/types';
import { AlertConsumers } from '@kbn/rule-registry-plugin/common/technical_rule_data_field_names';
import type { FindResult } from '@kbn/alerting-plugin/server';
import type { Logger } from '@kbn/logging';
import type { ObservabilityElasticsearchClient } from '@kbn/observability-utils-server/es/client/create_observability_es_client';
import type { Entity, IdentityField } from '../../../common/entities';
import { checkDataScopes, getDataScopeWithId } from './check_data_scopes';
import { getEntitySourceKql } from '../../../common/utils/get_entity_source_kql';
import { AssetSuggestion } from '../../../common/assets';

export async function getSuggestedRules({
  entity,
  identityFields,
  esClient,
  rulesClient,
  ruleTypes,
  start,
  end,
  logger,
}: {
  entity: Entity;
  identityFields: IdentityField[];
  esClient: ObservabilityElasticsearchClient;
  rulesClient: RulesClientApi;
  ruleTypes: RegistryRuleType[];
  start: number;
  end: number;
  logger: Logger;
}): Promise<AssetSuggestion[]> {
  const consumersOfInterest: string[] = Object.values(AlertConsumers).filter(
    (consumer) => consumer !== AlertConsumers.SIEM && consumer !== AlertConsumers.EXAMPLE
  );

  async function getNextRuleTypes(
    page: number
  ): Promise<FindResult<Record<string, unknown>>['data']> {
    const perPage = 1000;

    const response = await rulesClient.find({
      options: {
        page,
        perPage,
        filterConsumers: consumersOfInterest,
      },
    });

    const fetchedUntil = (page - 1) * perPage + response.data.length;
    if (response.total <= fetchedUntil) {
      return response.data;
    }

    return [...response.data, ...(await getNextRuleTypes(page + 1))];
  }

  const rulesForRuleTypes = await getNextRuleTypes(1);

  logger.debug(() => `Found ${rulesForRuleTypes.length} rules to analyze`);

  const ruleTypesById = new Map(ruleTypes.map((ruleType) => [ruleType.id, ruleType]));

  const identityFieldsSet = new Set(identityFields.map((identityField) => identityField.field));

  const rulesWithDataScopeQueries = rulesForRuleTypes.map((rule) => {
    const ruleType = ruleTypesById.get(rule.alertTypeId);

    const scope = ruleType?.getDataScope?.(rule.params);
    if (!scope) {
      return { rule };
    }
    const isExcludedByGroupingFields =
      scope.groupingFields?.length &&
      !scope.groupingFields?.some((field) => identityFieldsSet.has(field));

    if (isExcludedByGroupingFields) {
      return { rule };
    }

    return {
      rule,
      scope: getDataScopeWithId(scope),
    };
  });

  const allScopes = rulesWithDataScopeQueries.flatMap(({ rule, scope }) => (scope ? [scope] : []));

  const scopeResults = await checkDataScopes({
    start,
    end,
    esClient,
    kuery: getEntitySourceKql({
      entity,
      identityFields,
    }),
    logger,
    scopes: allScopes,
  });

  const rulesWithDataForEntity = rulesWithDataScopeQueries.filter(({ rule, scope }) => {
    const results = scope ? scopeResults.get(scope.id) : undefined;
    const hasData = !!results?.has_data;
    return hasData;
  });

  return rulesWithDataForEntity.map(({ rule }) => {
    return {
      type: 'rule',
      asset: {
        displayName: rule.name,
        id: rule.id,
        type: 'rule',
      },
    };
  });
}
