/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { estypes } from '@elastic/elasticsearch';
import Boom from '@hapi/boom';
import { GetHostsRequestBodyPayload } from '../../../../common/http_api/hosts';

type FilterClauses = keyof estypes.QueryDslBoolQuery;
const validClauses: FilterClauses[] = ['must', 'filter', 'must_not', 'should'];

const isValidFilter = (query?: any | undefined): query is estypes.QueryDslQueryContainer => {
  const boolClause = (query as estypes.QueryDslQueryContainer).bool;

  if (!boolClause) {
    return false;
  }
  return (
    boolClause.filter !== undefined ||
    boolClause.must !== undefined ||
    boolClause.must_not !== undefined ||
    boolClause.should !== undefined
  );
};

export const parseFilters = (query: any): estypes.QueryDslQueryContainer => {
  const parsed = isValidFilter(query) ? query : undefined;
  if (!parsed) {
    throw Boom.badRequest('Invalid query');
  }

  return parsed;
};

export const hasFilters = (query: any) => {
  const parsedFilters = parseFilters(query);

  // ignores minimum_should_match
  return Object.entries(parsedFilters.bool ?? {})
    .filter(([key, _]) => validClauses.includes(key as FilterClauses))
    .some(([_, filter]) => {
      return Array.isArray(filter) ? filter.length > 0 : !!filter;
    });
};

export const hasSortByMetric = (params: GetHostsRequestBodyPayload) => {
  return params.sortField && params.sortField !== 'name';
};
