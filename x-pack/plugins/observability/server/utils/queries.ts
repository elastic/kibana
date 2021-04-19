/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { QueryContainer } from '@elastic/elasticsearch/api/types';
import { esKuery } from '../../../../../src/plugins/data/server';

export function rangeQuery(start: number, end: number, field = '@timestamp'): QueryContainer[] {
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

export function kqlQuery(kql?: string): QueryContainer[] {
  if (!kql) {
    return [];
  }

  const ast = esKuery.fromKueryExpression(kql);
  return [esKuery.toElasticsearchQuery(ast)];
}
