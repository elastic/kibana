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
  defaultRequestParameters,
  createTimeRangeFilters,
} from './common';

export const createLatestLogEntryCategoriesStatsQuery = (
  logEntryCategoriesJobId: string,
  startTime: number,
  endTime: number,
  size: number,
  afterKey?: CompositeDatasetKey
) => ({
  ...defaultRequestParameters,
  body: {
    query: {
      bool: {
        filter: [
          ...createJobIdFilters(logEntryCategoriesJobId),
          ...createResultTypeFilters(['categorizer_stats']),
          ...createTimeRangeFilters(startTime, endTime),
        ],
      },
    },
    _source: [
      'categorization_status',
      'categorized_doc_count',
      'dead_category_count',
      'failed_category_count',
      'frequent_category_count',
      'rare_category_count',
      'timestamp',
      'total_category_count',
    ],
  },
  size: 0,
  aggregations: {
    dataset_composite_terms: {
      composite: {
        after: afterKey,
        size,
        sources: [
          {
            dataset_terms: {
              terms: {
                field: 'partition_field_value',
                missing_bucket: true,
              },
            },
          },
        ],
      },
      aggs: {
        categorizer_stats_top_hits: {
          top_hits: {
            size: 1,
            sort: [
              {
                timestamp: 'desc',
              },
            ],
          },
        },
      },
    },
  },
});

export const logEntryCategoryStatusRT = rt.keyof({
  ok: null,
  warn: null,
});

export const logEntryCategorizerStatsHitRT = rt.type({
  _source: rt.type({
    categorization_status: logEntryCategoryStatusRT,
    categorized_doc_count: rt.number,
    dead_category_count: rt.number,
    failed_category_count: rt.number,
    frequent_category_count: rt.number,
    rare_category_count: rt.number,
    timestamp: rt.number,
    total_category_count: rt.number,
  }),
});

export type LogEntryCategorizerStatsHit = rt.TypeOf<typeof logEntryCategorizerStatsHitRT>;

const compositeDatasetKeyRT = rt.type({
  dataset: rt.union([rt.string, rt.null]),
});

export type CompositeDatasetKey = rt.TypeOf<typeof compositeDatasetKeyRT>;

const logEntryCategoryStatsBucketRT = rt.type({
  key: compositeDatasetKeyRT,
  categorizer_stats_top_hits: rt.type({
    hits: rt.type({
      hits: rt.array(logEntryCategorizerStatsHitRT),
    }),
  }),
});

export type LogEntryCategoryStatsBucket = rt.TypeOf<typeof logEntryCategoryStatsBucketRT>;

export const latestLogEntryCategoriesStatsResponseRT = rt.intersection([
  commonSearchSuccessResponseFieldsRT,
  rt.partial({
    aggregations: rt.type({
      dataset_composite_terms: rt.type({
        after_key: compositeDatasetKeyRT,
        buckets: rt.array(logEntryCategoryStatsBucketRT),
      }),
    }),
  }),
]);

export type LatestLogEntryCategoriesStatsResponse = rt.TypeOf<
  typeof latestLogEntryCategoriesStatsResponseRT
>;
