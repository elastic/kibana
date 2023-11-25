/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IEsSearchRequest } from '@kbn/data-plugin/common';
import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';

/**
 * Builds a search request for an aggregation.
 * We're setting the query size to 0 as we only care about the aggregation result here.
 *
 * @param field aggregation field
 * @param key aggregation key
 * @param query optional query
 */
export const buildAggregationSearchRequest = (
  field: string,
  key: string,
  query?: QueryDslQueryContainer
): IEsSearchRequest => ({
  params: {
    body: {
      query,
      aggs: {
        [key]: {
          terms: {
            field,
            size: 1000, // setting a high size to get as close as possible to all unique values
          },
        },
      },
      size: 0,
    },
  },
});
