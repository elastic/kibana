/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { INTERNAL_IMMUTABLE_KEY } from '../../../../../common/constants';
import { escapeKuery } from '../../../../common/lib/keury';
import { FilterOptions } from './types';

const SEARCHABLE_RULE_PARAMS = [
  'alert.attributes.name',
  'alert.attributes.params.index',
  'alert.attributes.params.threat.tactic.id',
  'alert.attributes.params.threat.tactic.name',
  'alert.attributes.params.threat.technique.id',
  'alert.attributes.params.threat.technique.name',
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
}: FilterOptions): string => {
  const filters: string[] = [];

  if (showCustomRules) {
    filters.push(`alert.attributes.tags: "${INTERNAL_IMMUTABLE_KEY}:false"`);
  }

  if (showElasticRules) {
    filters.push(`alert.attributes.tags: "${INTERNAL_IMMUTABLE_KEY}:true"`);
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

  return filters.join(' AND ');
};
