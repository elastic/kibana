/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  QueryDslQueryContainer,
  AggregationsCustomCategorizeTextAnalyzer,
} from '@elastic/elasticsearch/lib/api/types';

import { createRandomSamplerWrapper } from '@kbn/ml-random-sampler-utils';

import { createCategorizeQuery } from './create_categorize_query';

const CATEGORY_LIMIT = 1000;
const EXAMPLE_LIMIT = 1;

export function createCategoryRequest(
  index: string,
  field: string,
  timeField: string,
  from: number | undefined,
  to: number | undefined,
  queryIn: QueryDslQueryContainer,
  wrap: ReturnType<typeof createRandomSamplerWrapper>['wrap'],
  intervalMs?: number
) {
  const query = createCategorizeQuery(queryIn, timeField, from, to);
  const aggs = {
    categories: {
      categorize_text: {
        field,
        size: CATEGORY_LIMIT,
        categorization_analyzer: categorizationAnalyzer,
      },
      aggs: {
        hit: {
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

const categorizationAnalyzer: AggregationsCustomCategorizeTextAnalyzer = {
  char_filter: ['first_line_with_letters'],
  tokenizer: 'standard',
  filter: [
    // @ts-expect-error filter type in AggregationsCustomCategorizeTextAnalyzer is incorrect
    {
      type: 'stop',
      stopwords: [
        'Monday',
        'Tuesday',
        'Wednesday',
        'Thursday',
        'Friday',
        'Saturday',
        'Sunday',
        'Mon',
        'Tue',
        'Wed',
        'Thu',
        'Fri',
        'Sat',
        'Sun',
        'January',
        'February',
        'March',
        'April',
        'May',
        'June',
        'July',
        'August',
        'September',
        'October',
        'November',
        'December',
        'Jan',
        'Feb',
        'Mar',
        'Apr',
        'May',
        'Jun',
        'Jul',
        'Aug',
        'Sep',
        'Oct',
        'Nov',
        'Dec',
        'GMT',
        'UTC',
      ],
    },
    // @ts-expect-error filter type in AggregationsCustomCategorizeTextAnalyzer is incorrect
    {
      type: 'limit',
      max_token_count: '100',
    },
  ],
};
