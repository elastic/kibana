/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { escapeKuery } from '../../../common/lib/kuery';
import type { FilterOptions } from './types';
import { RuleExecutionStatus } from '../../../../common/api/detection_engine/rule_monitoring/model/execution_status';

const SEARCHABLE_RULE_PARAMS = [
  'alert.attributes.name',
  'alert.attributes.params.index',
  'alert.attributes.params.threat.tactic.id',
  'alert.attributes.params.threat.tactic.name',
  'alert.attributes.params.threat.technique.id',
  'alert.attributes.params.threat.technique.name',
  'alert.attributes.params.threat.technique.subtechnique.id',
  'alert.attributes.params.threat.technique.subtechnique.name',
];

const ENABLED_FIELD = 'alert.attributes.enabled';
const TAGS_FIELD = 'alert.attributes.tags';
const PARAMS_TYPE_FIELD = 'alert.attributes.params.type';
const PARAMS_IMMUTABLE_FIELD = 'alert.attributes.params.immutable';
const LAST_RUN_OUTCOME_FIELD = 'alert.attributes.lastRun.outcome';

/**
 * Convert rules filter options object to KQL query
 *
 * @param filterOptions desired filters (e.g. filter/sortField/sortOrder)
 *
 * @returns KQL string
 */
export const convertRulesFilterToKQL = ({
  showCustomRules,
  showElasticRules,
  filter,
  tags,
  excludeRuleTypes = [],
  enabled,
  ruleExecutionStatus,
}: FilterOptions): string => {
  const filters: string[] = [];

  if (showCustomRules && showElasticRules) {
    // if both showCustomRules && showElasticRules selected we omit filter, as it includes all existing rules
  } else if (showElasticRules) {
    filters.push(`${PARAMS_IMMUTABLE_FIELD}: true`);
  } else if (showCustomRules) {
    filters.push(`${PARAMS_IMMUTABLE_FIELD}: false`);
  }

  if (enabled !== undefined) {
    filters.push(`${ENABLED_FIELD}: ${enabled ? 'true' : 'false'}`);
  }

  if (tags.length > 0) {
    filters.push(`${TAGS_FIELD}:(${tags.map((tag) => `"${escapeKuery(tag)}"`).join(' AND ')})`);
  }

  if (filter.length) {
    const searchQuery = SEARCHABLE_RULE_PARAMS.map(
      (param) => `${param}: "${escapeKuery(filter)}"`
    ).join(' OR ');

    filters.push(`(${searchQuery})`);
  }

  if (excludeRuleTypes.length) {
    filters.push(
      `NOT ${PARAMS_TYPE_FIELD}: (${excludeRuleTypes
        .map((ruleType) => `"${escapeKuery(ruleType)}"`)
        .join(' OR ')})`
    );
  }

  if (ruleExecutionStatus === RuleExecutionStatus.succeeded) {
    filters.push(`${LAST_RUN_OUTCOME_FIELD}: "succeeded"`);
  } else if (ruleExecutionStatus === RuleExecutionStatus['partial failure']) {
    filters.push(`${LAST_RUN_OUTCOME_FIELD}: "warning"`);
  } else if (ruleExecutionStatus === RuleExecutionStatus.failed) {
    filters.push(`${LAST_RUN_OUTCOME_FIELD}: "failed"`);
  }

  return filters.join(' AND ');
};
