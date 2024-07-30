/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type BoolQuery, buildEsQuery, type Filter } from '@kbn/es-query';

export function getEsFilterFromOverrides({
  filters,
  timeRange,
}: {
  filters?: Filter[];
  timeRange?: {
    from: string;
    to: string;
  };
}): { bool: BoolQuery } {
  const esFilter = buildEsQuery(undefined, [], filters ?? []);

  if (timeRange) {
    esFilter.bool.filter.push({
      range: {
        '@timestamp': {
          gte: timeRange.from,
          lte: timeRange.to,
        },
      },
    });
  }

  return esFilter;
}
