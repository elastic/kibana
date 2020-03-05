/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { TSVBMetricModelCreator, TSVBMetricModel } from '../../../types';

export const nginxHits: TSVBMetricModelCreator = (
  timeField,
  indexPattern,
  interval
): TSVBMetricModel => ({
  id: 'nginxHits',
  requires: ['nginx.access'],
  index_pattern: indexPattern,
  interval,
  time_field: timeField,
  type: 'timeseries',
  series: [
    {
      id: '200s',
      metrics: [
        {
          id: 'count-200',
          type: 'count',
        },
      ],
      split_mode: 'filter',
      filter: {
        query: 'http.response.status_code:[200 TO 299]',
        language: 'lucene',
      },
    },
    {
      id: '300s',
      metrics: [
        {
          id: 'count-300',
          type: 'count',
        },
      ],
      split_mode: 'filter',
      filter: {
        query: 'http.response.status_code:[300 TO 399]',
        language: 'lucene',
      },
    },
    {
      id: '400s',
      metrics: [
        {
          id: 'count-400',
          type: 'count',
        },
      ],
      split_mode: 'filter',
      filter: {
        query: 'http.response.status_code:[400 TO 499]',
        language: 'lucene',
      },
    },
    {
      id: '500s',
      metrics: [
        {
          id: 'count-500',
          type: 'count',
        },
      ],
      split_mode: 'filter',
      filter: {
        query: 'http.response.status_code:[500 TO 599]',
        language: 'lucene',
      },
    },
  ],
});
