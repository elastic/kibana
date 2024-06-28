/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { estypes } from '@elastic/elasticsearch';
import Boom from '@hapi/boom';

type FilterClauses = keyof estypes.QueryDslBoolQuery;
const validClauses: FilterClauses[] = ['must', 'filter', 'must_not', 'should'];

interface BoolQuery {
  bool: estypes.QueryDslBoolQuery;
}

const isValidFilter = (query: any): query is BoolQuery => {
  const boolClause = (query as estypes.QueryDslQueryContainer).bool;

  if (!boolClause || Object.keys(boolClause).length === 0) {
    return false;
  }

  return [boolClause.filter, boolClause.must, boolClause.must_not, boolClause.should]
    .filter(Boolean)
    .every((clause) => Array.isArray(clause) || clause === undefined);
};

export const assertQueryStructure: (query: any) => asserts query is BoolQuery = (query) => {
  if (!isValidFilter(query)) {
    throw Boom.badRequest('Invalid query');
  }
};

export const hasFilters = (query?: any) => {
  if (!query) {
    return false;
  }

  assertQueryStructure(query);

  // ignores minimum_should_match
  return Object.entries(query.bool)
    .filter(([key, _]) => validClauses.includes(key as FilterClauses))
    .some(([_, filter]) => {
      return Array.isArray(filter) ? filter.length > 0 : !!filter;
    });
};
