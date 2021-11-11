/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { fromKueryExpression, toElasticsearchQuery } from '@kbn/es-query';

export function termQuery<T extends string>(field: T, value: string | undefined) {
  if (!value) {
    return [];
  }

  return [{ term: { [field]: value } as Record<T, string> }];
}

export function rangeQuery(
  start?: number,
  end?: number,
  field = '@timestamp'
): estypes.QueryDslQueryContainer[] {
  return [
    {
      range: {
        [field]: {
          gte: start,
          lte: end,
          format: 'epoch_millis',
        },
      },
    },
  ];
}

export function kqlQuery(kql: string): estypes.QueryDslQueryContainer[] {
  if (!kql) {
    return [];
  }

  const ast = fromKueryExpression(kql);
  return [toElasticsearchQuery(ast)];
}
