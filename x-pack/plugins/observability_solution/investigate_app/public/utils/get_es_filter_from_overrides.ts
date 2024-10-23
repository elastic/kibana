/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildEsQuery, type BoolQuery } from '@kbn/es-query';

export function getEsFilterFromOverrides({
  timeRange,
}: {
  timeRange?: {
    from: string;
    to: string;
  };
}): { bool: BoolQuery } {
  const esFilter = buildEsQuery(undefined, [], []);

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
