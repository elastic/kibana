/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';

import type { AiopsExplainLogRateSpikesSchema } from '../../../common/api/explain_log_rate_spikes';

import { getQueryWithParams } from './get_query_with_params';

export function getHistogramQuery(
  params: AiopsExplainLogRateSpikesSchema,
  filter: estypes.QueryDslQueryContainer[] = []
) {
  const histogramQuery = getQueryWithParams({
    params,
  });

  if (Array.isArray(histogramQuery.bool.filter)) {
    const existingFilter = histogramQuery.bool.filter.filter((d) => Object.keys(d)[0] !== 'range');

    histogramQuery.bool.filter = [
      ...existingFilter,
      ...filter,
      {
        range: {
          [params.timeFieldName]: {
            gte: params.start,
            lte: params.end,
            format: 'epoch_millis',
          },
        },
      },
    ];
  }

  return histogramQuery;
}
