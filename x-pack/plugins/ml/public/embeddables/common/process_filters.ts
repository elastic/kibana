/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import {
  Filter,
  fromKueryExpression,
  luceneStringToDsl,
  Query,
  toElasticsearchQuery,
} from '@kbn/es-query';

export function processFilters(
  filters: Filter[],
  query: Query,
  controlledBy?: string
): estypes.QueryDslQueryContainer {
  const inputQuery =
    query.language === 'kuery'
      ? toElasticsearchQuery(fromKueryExpression(query.query as string))
      : luceneStringToDsl(query.query);

  const must = [inputQuery];
  const mustNot = [];

  for (const filter of filters) {
    // ignore disabled filters as well as created by swim lane selection
    if (
      filter.meta.disabled ||
      (controlledBy !== undefined && filter.meta.controlledBy === controlledBy)
    )
      continue;

    const {
      meta: { negate, type, key: fieldName },
    } = filter;

    let filterQuery = filter.query;

    if (filterQuery === undefined && type === 'exists') {
      filterQuery = {
        exists: {
          field: fieldName,
        },
      };
    }

    if (filterQuery) {
      if (negate) {
        mustNot.push(filterQuery);
      } else {
        must.push(filterQuery);
      }
    }
  }
  return {
    bool: {
      must,
      must_not: mustNot,
    },
  };
}
