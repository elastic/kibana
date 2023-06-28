/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { escapeKuery } from '@kbn/es-query';
import type { Type } from '@kbn/securitysolution-io-ts-alerting-types';
import { RuleExecutionStatus } from '../detection_engine/rule_monitoring';
import {
  ENABLED_FIELD,
  LAST_RUN_OUTCOME_FIELD,
  PARAMS_IMMUTABLE_FIELD,
  PARAMS_TYPE_FIELD,
  RULE_NAME_FIELD,
  RULE_PARAMS_FIELDS,
  TAGS_FIELD,
} from '../rule_fields';

export const KQL_FILTER_IMMUTABLE_RULES = `${PARAMS_IMMUTABLE_FIELD}: true`;
export const KQL_FILTER_MUTABLE_RULES = `${PARAMS_IMMUTABLE_FIELD}: false`;
export const KQL_FILTER_ENABLED_RULES = `${ENABLED_FIELD}: true`;
export const KQL_FILTER_DISABLED_RULES = `${ENABLED_FIELD}: false`;

interface RulesFilterOptions {
  filter: string;
  showCustomRules: boolean;
  showElasticRules: boolean;
  enabled: boolean;
  tags: string[];
  excludeRuleTypes: Type[];
  ruleExecutionStatus: RuleExecutionStatus;
}

/**
 * Convert rules filter options object to KQL query
 *
 * @param filterOptions desired filters (e.g. filter/sortField/sortOrder)
 *
 * @returns KQL string
 */
export function convertRulesFilterToKQL({
  filter: searchTerm,
  showCustomRules,
  showElasticRules,
  enabled,
  tags,
  excludeRuleTypes = [],
  ruleExecutionStatus,
}: Partial<RulesFilterOptions>): string {
  const kql: string[] = [];

  if (searchTerm?.length) {
    kql.push(`(${convertRuleSearchTermToKQL(searchTerm)})`);
  }

  if (showCustomRules && showElasticRules) {
    // if both showCustomRules && showElasticRules selected we omit filter, as it includes all existing rules
  } else if (showElasticRules) {
    kql.push(KQL_FILTER_IMMUTABLE_RULES);
  } else if (showCustomRules) {
    kql.push(KQL_FILTER_MUTABLE_RULES);
  }

  if (enabled !== undefined) {
    kql.push(enabled ? KQL_FILTER_ENABLED_RULES : KQL_FILTER_DISABLED_RULES);
  }

  if (tags?.length) {
    kql.push(convertRuleTagsToKQL(tags));
  }

  if (excludeRuleTypes.length) {
    kql.push(`NOT ${convertRuleTypesToKQL(excludeRuleTypes)}`);
  }

  if (ruleExecutionStatus === RuleExecutionStatus.succeeded) {
    kql.push(`${LAST_RUN_OUTCOME_FIELD}: "succeeded"`);
  } else if (ruleExecutionStatus === RuleExecutionStatus['partial failure']) {
    kql.push(`${LAST_RUN_OUTCOME_FIELD}: "warning"`);
  } else if (ruleExecutionStatus === RuleExecutionStatus.failed) {
    kql.push(`${LAST_RUN_OUTCOME_FIELD}: "failed"`);
  }

  return kql.join(' AND ');
}

const SEARCHABLE_RULE_ATTRIBUTES = [
  RULE_NAME_FIELD,
  RULE_PARAMS_FIELDS.INDEX,
  RULE_PARAMS_FIELDS.TACTIC_ID,
  RULE_PARAMS_FIELDS.TACTIC_NAME,
  RULE_PARAMS_FIELDS.TECHNIQUE_ID,
  RULE_PARAMS_FIELDS.TECHNIQUE_NAME,
  RULE_PARAMS_FIELDS.SUBTECHNIQUE_ID,
  RULE_PARAMS_FIELDS.SUBTECHNIQUE_NAME,
];

export function convertRuleSearchTermToKQL(
  searchTerm: string,
  attributes = SEARCHABLE_RULE_ATTRIBUTES
): string {
  return attributes.map((param) => `${param}: "${escapeKuery(searchTerm)}"`).join(' OR ');
}

export function convertRuleTagsToKQL(tags: string[]): string {
  return `${TAGS_FIELD}:(${tags.map((tag) => `"${escapeKuery(tag)}"`).join(' AND ')})`;
}

export function convertRuleTypesToKQL(ruleTypes: Type[]): string {
  return `${PARAMS_TYPE_FIELD}: (${ruleTypes
    .map((ruleType) => `"${escapeKuery(ruleType)}"`)
    .join(' OR ')})`;
}
