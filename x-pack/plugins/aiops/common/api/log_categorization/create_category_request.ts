/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';

import { createRandomSamplerWrapper } from '@kbn/ml-random-sampler-utils';

import { createCategorizeQuery } from './create_categorize_query';

const CATEGORY_LIMIT = 1000;
const EXAMPLE_LIMIT = 1;

interface CategorizationAdditionalFilter {
  from: number;
  to: number;
  field?: { name: string; value: string };
}

export function createCategoryRequest(
  index: string,
  field: string,
  timeField: string,
  timeRange: { from: number; to: number } | undefined,
  queryIn: QueryDslQueryContainer,
  wrap: ReturnType<typeof createRandomSamplerWrapper>['wrap'],
  intervalMs?: number,
  additionalFilter?: CategorizationAdditionalFilter
) {
  const query = createCategorizeQuery(queryIn, timeField, timeRange);
  const aggs = {
    categories: {
      categorize_text: {
        field,
        size: CATEGORY_LIMIT,
      },
      aggs: {
        examples: {
          top_hits: {
            size: EXAMPLE_LIMIT,
            sort: [timeField],
            _source: field,
          },
        },
        ...(intervalMs
          ? {
              sparkline: {
                date_histogram: {
                  field: timeField,
                  fixed_interval: `${intervalMs}ms`,
                },
              },
            }
          : {}),
        ...(additionalFilter
          ? {
              sub_time_range: {
                date_range: {
                  field: timeField,
                  format: 'epoch_millis',
                  ranges: [{ from: additionalFilter.from, to: additionalFilter.to }],
                },
                aggs: {
                  examples: {
                    top_hits: {
                      size: EXAMPLE_LIMIT,
                      sort: [timeField],
                      _source: field,
                    },
                  },
                  ...(additionalFilter.field
                    ? {
                        sub_field: {
                          filter: {
                            term: {
                              [additionalFilter.field.name]: additionalFilter.field.value,
                            },
                          },
                        },
                      }
                    : {}),
                },
              },
            }
          : {}),
      },
    },
  };

  return {
    params: {
      index,
      size: 0,
      body: {
        query,
        aggs: wrap(aggs),
      },
    },
  };
}
