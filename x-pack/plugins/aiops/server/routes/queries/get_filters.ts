/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';

import type { ESFilter } from '@kbn/es-types';

import type { AiopsExplainLogRateSpikesSchema } from '../../../common/api/explain_log_rate_spikes';

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

export function getFilters({
  start,
  end,
  timeFieldName,
}: AiopsExplainLogRateSpikesSchema): ESFilter[] {
  const filters: ESFilter[] = [];

  if (timeFieldName !== '') {
    filters.push(...rangeQuery(start, end, timeFieldName));
  }

  return filters;
}
