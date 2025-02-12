/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  FilterCondition,
  Condition,
  isFilterCondition,
  isAndCondition,
  isOrCondition,
} from '../models';

function conditionToClause(condition: FilterCondition) {
  switch (condition.operator) {
    case 'neq':
      return { bool: { must_not: { match: { [condition.field]: condition.value } } } };
    case 'eq':
      return { match: { [condition.field]: condition.value } };
    case 'exists':
      return { exists: { field: condition.field } };
    case 'gt':
      return { range: { [condition.field]: { gt: condition.value } } };
    case 'gte':
      return { range: { [condition.field]: { gte: condition.value } } };
    case 'lt':
      return { range: { [condition.field]: { lt: condition.value } } };
    case 'lte':
      return { range: { [condition.field]: { lte: condition.value } } };
    case 'contains':
      return { wildcard: { [condition.field]: `*${condition.value}*` } };
    case 'startsWith':
      return { prefix: { [condition.field]: condition.value } };
    case 'endsWith':
      return { wildcard: { [condition.field]: `*${condition.value}` } };
    case 'notExists':
      return { bool: { must_not: { exists: { field: condition.field } } } };
    default:
      return { match_none: {} };
  }
}

export function conditionToQueryDsl(condition: Condition): any {
  if (isFilterCondition(condition)) {
    return conditionToClause(condition);
  }
  if (isAndCondition(condition)) {
    const and = condition.and.map((filter) => conditionToQueryDsl(filter));
    return {
      bool: {
        must: and,
      },
    };
  }
  if (isOrCondition(condition)) {
    const or = condition.or.map((filter) => conditionToQueryDsl(filter));
    return {
      bool: {
        should: or,
      },
    };
  }
  return {
    match_none: {},
  };
}
