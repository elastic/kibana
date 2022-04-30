/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MatrixHistogramType } from '../../../../../../../common/search_strategy';

export const mockOptions = {
  defaultIndex: ['.siem-preview-signals-default'],
  filterQuery:
    '{"bool":{"must":[],"filter":[{"match_all":{}},{"bool":{"filter":[{"bool":{"should":[{"match":{"signal.rule.id":"test-preview-id"}}],"minimum_should_match":1}}]}}],"should":[],"must_not":[]}}',
  histogramType: MatrixHistogramType.preview,
  timerange: { interval: '12h', from: '2020-09-08T14:23:04.482Z', to: '2020-09-09T14:23:04.482Z' },
  stackByField: 'event.category',
};

export const expectedDsl = {
  index: ['.siem-preview-signals-default'],
  allow_no_indices: true,
  ignore_unavailable: true,
  track_total_hits: true,
  body: {
    aggregations: {
      preview: {
        terms: {
          field: 'event.category',
          missing: 'All others',
          order: { _count: 'desc' },
          size: 10,
        },
        aggs: {
          preview: {
            date_histogram: {
              field: 'signal.original_time',
              fixed_interval: '2700000ms',
              min_doc_count: 0,
              extended_bounds: { min: 1599574984482, max: 1599661384482 },
            },
          },
        },
      },
    },
    query: {
      bool: {
        filter: [
          {
            bool: {
              must: [],
              filter: [
                { match_all: {} },
                {
                  bool: {
                    filter: [
                      {
                        bool: {
                          should: [{ match: { 'signal.rule.id': 'test-preview-id' } }],
                          minimum_should_match: 1,
                        },
                      },
                    ],
                  },
                },
              ],
              should: [],
              must_not: [],
            },
          },
          {
            range: {
              'signal.original_time': {
                gte: '2020-09-08T14:23:04.482Z',
                lte: '2020-09-09T14:23:04.482Z',
                format: 'strict_date_optional_time',
              },
            },
          },
        ],
      },
    },
    size: 0,
  },
};
