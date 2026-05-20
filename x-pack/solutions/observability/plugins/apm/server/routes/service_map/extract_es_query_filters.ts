/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BoolQuery } from '@kbn/es-query';
import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';

/**
 * Normalizes the bool clauses from a pre-built ES query into flat arrays.
 *
 * The ES query spec allows `bool.filter`, `bool.must`, and `bool.must_not` to
 * be either a single object or an array. This helper flattens them so
 * consumers can safely spread the results into their own query.
 *
 * `filter` includes both `bool.filter` and `bool.must` clauses (both are
 * ANDed), since the distinction is irrelevant for our use case.
 */
export function extractEsQueryFilters(esQuery?: { bool: BoolQuery }): {
  filter: QueryDslQueryContainer[];
  mustNot: QueryDslQueryContainer[];
} {
  if (!esQuery) {
    return { filter: [], mustNot: [] };
  }

  const filter: QueryDslQueryContainer[] = [
    ...(esQuery.bool.filter
      ? Array.isArray(esQuery.bool.filter)
        ? esQuery.bool.filter
        : [esQuery.bool.filter]
      : []),
    ...(esQuery.bool.must
      ? Array.isArray(esQuery.bool.must)
        ? esQuery.bool.must
        : [esQuery.bool.must]
      : []),
  ];

  const mustNot: QueryDslQueryContainer[] = esQuery.bool.must_not
    ? Array.isArray(esQuery.bool.must_not)
      ? esQuery.bool.must_not
      : [esQuery.bool.must_not]
    : [];

  return { filter, mustNot };
}
