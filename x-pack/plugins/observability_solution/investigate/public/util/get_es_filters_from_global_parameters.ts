/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type BoolQuery, buildEsQuery } from '@kbn/es-query';
import type { GlobalWidgetParameters } from '../../common/types';

export function getEsFilterFromGlobalParameters({
  filters,
  timeRange,
}: Partial<GlobalWidgetParameters>): { bool: BoolQuery } {
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
