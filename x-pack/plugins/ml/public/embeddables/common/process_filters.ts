/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Filter } from '../../../../../../src/plugins/data/common/es_query/filters';
import { Query } from '../../../../../../src/plugins/data/common/query';
import { esKuery, esQuery } from '../../../../../../src/plugins/data/public';

export function processFilters(filters: Filter[], query: Query, controlledBy?: string) {
  const inputQuery =
    query.language === 'kuery'
      ? esKuery.toElasticsearchQuery(esKuery.fromKueryExpression(query.query as string))
      : esQuery.luceneStringToDsl(query.query);

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

    if (negate) {
      mustNot.push(filterQuery);
    } else {
      must.push(filterQuery);
    }
  }
  return {
    bool: {
      must,
      must_not: mustNot,
    },
  };
}
