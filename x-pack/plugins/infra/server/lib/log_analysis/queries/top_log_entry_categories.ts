/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as rt from 'io-ts';
import { commonSearchSuccessResponseFieldsRT } from '../../../utils/elasticsearch_runtime_types';
import {
  createJobIdFilters,
  createResultTypeFilters,
  createTimeRangeFilters,
  defaultRequestParameters,
  createDatasetsFilters,
} from './common';

export const createTopLogEntryCategoriesQuery = (
  logEntryCategoriesJobId: string,
  startTime: number,
  endTime: number,
  size: number,
  datasets: string[],
  sortDirection: 'asc' | 'desc' = 'desc'
) => ({
  ...defaultRequestParameters,
  body: {
    query: {
      bool: {
        filter: [
          ...createJobIdFilters(logEntryCategoriesJobId),
          ...createTimeRangeFilters(startTime, endTime),
          ...createDatasetsFilters(datasets),
          {
            bool: {
              should: [
                {
                  bool: {
                    filter: [
                      ...createResultTypeFilters(['model_plot']),
                      {
                        range: {
                          actual: {
                            gt: 0,
                          },
                        },
                      },
                    ],
                  },
                },
                {
                  bool: {
                    filter: createResultTypeFilters(['record']),
                  },
                },
              ],
              minimum_should_match: 1,
            },
          },
        ],
      },
    },
    aggs: {
      terms_category_id: {
        terms: {
          field: 'by_field_value',
          size,
          order: {
            'filter_model_plot>sum_actual': sortDirection,
          },
        },
        aggs: {
          filter_model_plot: {
            filter: {
              term: {
                result_type: 'model_plot',
              },
            },
            aggs: {
              sum_actual: {
                sum: {
                  field: 'actual',
                },
              },
              terms_dataset: {
                terms: {
                  field: 'partition_field_value',
                  size: 1000,
                },
              },
            },
          },
          filter_record: {
            filter: {
              term: {
                result_type: 'record',
              },
            },
            aggs: {
              maximum_record_score: {
                max: {
                  field: 'record_score',
                },
              },
              terms_dataset: {
                terms: {
                  field: 'partition_field_value',
                  size: 1000,
                },
                aggs: {
                  maximum_record_score: {
                    max: {
                      field: 'record_score',
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
  size: 0,
});

const metricAggregationRT = rt.type({
  value: rt.union([rt.number, rt.null]),
});

export const logEntryCategoryBucketRT = rt.type({
  key: rt.string,
  doc_count: rt.number,
  filter_record: rt.type({
    maximum_record_score: metricAggregationRT,
    terms_dataset: rt.type({
      buckets: rt.array(
        rt.type({
          key: rt.string,
          doc_count: rt.number,
          maximum_record_score: metricAggregationRT,
        })
      ),
    }),
  }),
  filter_model_plot: rt.type({
    sum_actual: metricAggregationRT,
    terms_dataset: rt.type({
      buckets: rt.array(
        rt.type({
          key: rt.string,
          doc_count: rt.number,
        })
      ),
    }),
  }),
});

export type LogEntryCategoryBucket = rt.TypeOf<typeof logEntryCategoryBucketRT>;

export const topLogEntryCategoriesResponseRT = rt.intersection([
  commonSearchSuccessResponseFieldsRT,
  rt.partial({
    aggregations: rt.type({
      terms_category_id: rt.type({
        buckets: rt.array(logEntryCategoryBucketRT),
      }),
    }),
  }),
]);

export type TopLogEntryCategoriesResponse = rt.TypeOf<typeof topLogEntryCategoriesResponseRT>;
