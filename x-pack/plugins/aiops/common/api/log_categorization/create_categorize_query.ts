/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { cloneDeep } from 'lodash';

import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';

export function createCategorizeQuery(
  queryIn: QueryDslQueryContainer,
  timeField: string,
  from: number | undefined,
  to: number | undefined
) {
  const query = cloneDeep(queryIn);

  if (query.bool === undefined) {
    query.bool = {};
  }
  if (query.bool.must === undefined) {
    query.bool.must = [];
    if (query.match_all !== undefined) {
      query.bool.must.push({ match_all: query.match_all });
      delete query.match_all;
    }
  }
  if (query.multi_match !== undefined) {
    query.bool.should = {
      multi_match: query.multi_match,
    };
    delete query.multi_match;
  }

  (query.bool.must as QueryDslQueryContainer[]).push({
    range: {
      [timeField]: {
        gte: from,
        lte: to,
        format: 'epoch_millis',
      },
    },
  });

  return query;
}
