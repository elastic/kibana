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
} from './common';

export const createLogEntryCategoryHistogramsQuery = (
  logEntryCategoriesJobId: string,
  categoryIds: number[],
  startTime: number,
  endTime: number,
  bucketCount: number
) => ({
  ...defaultRequestParameters,
  body: {
    query: {
      bool: {
        filter: [
          ...createJobIdFilters(logEntryCategoriesJobId),
          ...createTimeRangeFilters(startTime, endTime),
          ...createResultTypeFilters(['model_plot']),
          ...createCategoryFilters(categoryIds),
        ],
      },
    },
    aggs: {
      filters_categories: {
        filters: createCategoryFiltersAggregation(categoryIds),
        aggs: {
          histogram_timestamp: createHistogramAggregation(startTime, endTime, bucketCount),
        },
      },
    },
  },
  size: 0,
});

const createCategoryFilters = (categoryIds: number[]) => [
  {
    terms: {
      by_field_value: categoryIds,
    },
  },
];

const createCategoryFiltersAggregation = (categoryIds: number[]) => ({
  filters: categoryIds.reduce<Record<string, { term: { by_field_value: number } }>>(
    (categoryFilters, categoryId) => ({
      ...categoryFilters,
      [`${categoryId}`]: {
        term: {
          by_field_value: categoryId,
        },
      },
    }),
    {}
  ),
});

const createHistogramAggregation = (startTime: number, endTime: number, bucketCount: number) => {
  const bucketDuration = Math.round((endTime - startTime) / bucketCount);

  return {
    histogram: {
      field: 'timestamp',
      interval: bucketDuration,
      offset: startTime,
    },
    meta: {
      bucketDuration,
    },
    aggs: {
      sum_actual: {
        sum: {
          field: 'actual',
        },
      },
    },
  };
};

export const logEntryCategoryFilterBucketRT = rt.type({
  doc_count: rt.number,
  histogram_timestamp: rt.type({
    meta: rt.type({
      bucketDuration: rt.number,
    }),
    buckets: rt.array(
      rt.type({
        key: rt.number,
        doc_count: rt.number,
        sum_actual: rt.type({
          value: rt.number,
        }),
      })
    ),
  }),
});

export type LogEntryCategoryFilterBucket = rt.TypeOf<typeof logEntryCategoryFilterBucketRT>;

export const logEntryCategoryHistogramsResponseRT = rt.intersection([
  commonSearchSuccessResponseFieldsRT,
  rt.type({
    aggregations: rt.type({
      filters_categories: rt.type({
        buckets: rt.record(rt.string, logEntryCategoryFilterBucketRT),
      }),
    }),
  }),
]);

export type LogEntryCategorHistogramsResponse = rt.TypeOf<
  typeof logEntryCategoryHistogramsResponseRT
>;
