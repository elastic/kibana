/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SearchRequest } from '@elastic/elasticsearch/lib/api/types';

export const getRequestBody = ({
  indexPattern,
  startDate = 'now-7d/d',
  endDate = 'now/d',
}: {
  indexPattern: string;
  startDate: string;
  endDate: string;
}): SearchRequest => ({
  index: indexPattern,
  aggs: {
    index: {
      terms: {
        field: '_index',
      },
    },
  },
  size: 0,
  query: {
    bool: {
      must: [],
      filter: [
        {
          range: {
            '@timestamp': {
              format: 'strict_date_optional_time',
              gte: startDate,
              lte: endDate,
            },
          },
        },
      ],
      should: [],
      must_not: [],
    },
  },
});
