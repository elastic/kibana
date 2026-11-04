/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import datemath from '@kbn/datemath';
import { fromKueryExpression, toElasticsearchQuery } from '@kbn/es-query';

export const parseDatemath = (value: string): number => datemath.parse(value)?.valueOf() ?? 0;

export const timeRangeFilter = (
  timeField: string,
  { start, end }: { start: number; end: number }
): QueryDslQueryContainer[] => {
  if (!start || !end) {
    return [];
  }
  return [
    {
      range: {
        [timeField]: {
          gte: start,
          lt: end,
          format: 'epoch_millis',
        },
      },
    },
  ];
};

export const kqlFilter = (kuery?: string): QueryDslQueryContainer[] => {
  const trimmed = kuery?.trim();
  if (!trimmed) {
    return [];
  }
  return [toElasticsearchQuery(fromKueryExpression(trimmed))];
};
