/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { escapeKuery } from '../../../common/lib/kuery';
import type { FilterOptions } from './types';

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
}: FilterOptions): string => {
  const filters: string[] = [];

  if (showCustomRules && showElasticRules) {
    // if both showCustomRules && showElasticRules selected we omit filter, as it includes all existing rules
  } else if (showElasticRules) {
    filters.push('alert.attributes.params.immutable: true');
  } else if (showCustomRules) {
    filters.push('alert.attributes.params.immutable: false');
  }

  if (tags.length > 0) {
    filters.push(
      `alert.attributes.tags:(${tags.map((tag) => `"${escapeKuery(tag)}"`).join(' AND ')})`
    );
  }

  if (filter.length) {
    const searchQuery = SEARCHABLE_RULE_PARAMS.map(
      (param) => `${param}: "${escapeKuery(filter)}"`
    ).join(' OR ');

    filters.push(`(${searchQuery})`);
  }

  if (excludeRuleTypes.length) {
    filters.push(
      `NOT alert.attributes.params.type: (${excludeRuleTypes
        .map((ruleType) => `"${escapeKuery(ruleType)}"`)
        .join(' OR ')})`
    );
  }

  return filters.join(' AND ');
};
