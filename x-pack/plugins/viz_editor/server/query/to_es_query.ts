/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// ------------------------------------------------------------------------------------------
// This file contains logic to convert our internal query representation to an
// Elasticsearch query.
// ------------------------------------------------------------------------------------------

import { Query } from '../../common';
import { sanitizeQuery } from './sanitize_query';
import { buildSelect, hasAggregations } from './select_operations';
import { buildWhere } from './where_operations';

/**
 * Set the root size property in the Elasticsearch query
 */
function buildSize(query: Query, esQuery: any) {
  if (hasAggregations(query)) {
    return {
      ...esQuery,
      size: 0,
    };
  }

  return {
    ...esQuery,
    size: query.size,
  };
}

/**
 * Set the order property, if the query defines one
 */
function buildOrderBy(query: Query, esQuery: any) {
  if (!query.orderBy) {
    return esQuery;
  }

  return {
    ...esQuery,
    sort: query.orderBy.map(({ col, direction }) => ({
      [col]: {
        order: direction,
        missing: '_first',
        unmapped_type: 'keyword',
      },
    })),
  };
}

/**
 * Convert our internal query representation into an Elasticsearch query
 */
export function toEsQuery(query: Query): any {
  const sanitizedQuery = sanitizeQuery(query);
  const builderFunctions = [buildOrderBy, buildSize, buildWhere, buildSelect];

  return builderFunctions.reduce((acc: any, fn) => fn(sanitizedQuery, acc));
}
