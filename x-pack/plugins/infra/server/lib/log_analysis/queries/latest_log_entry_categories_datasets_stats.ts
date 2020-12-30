/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as rt from 'io-ts';
import { commonSearchSuccessResponseFieldsRT } from '../../../utils/elasticsearch_runtime_types';
import {
  createJobIdsFilters,
  createResultTypeFilters,
  defaultRequestParameters,
  createLogTimeRangeFilters,
} from './common';

export const createLatestLogEntryCategoriesDatasetsStatsQuery = (
  logEntryCategoriesJobIds: string[],
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
          ...createJobIdsFilters(logEntryCategoriesJobIds),
          ...createResultTypeFilters(['categorizer_stats']),
          ...createLogTimeRangeFilters(startTime, endTime),
        ],
      },
    },
    aggregations: {
      dataset_composite_terms: {
        composite: {
          after: afterKey,
          size,
          sources: [
            {
              dataset: {
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
                  log_time: 'desc',
                },
              ],
              _source: [
                'categorization_status',
                'categorized_doc_count',
                'dead_category_count',
                'failed_category_count',
                'frequent_category_count',
                'job_id',
                'log_time',
                'rare_category_count',
                'total_category_count',
              ],
            },
          },
        },
      },
    },
  },
  size: 0,
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
    job_id: rt.string,
    log_time: rt.number,
    rare_category_count: rt.number,
    total_category_count: rt.number,
  }),
});

export type LogEntryCategorizerStatsHit = rt.TypeOf<typeof logEntryCategorizerStatsHitRT>;

const compositeDatasetKeyRT = rt.type({
  dataset: rt.union([rt.string, rt.null]),
});

export type CompositeDatasetKey = rt.TypeOf<typeof compositeDatasetKeyRT>;

const logEntryCategoryDatasetStatsBucketRT = rt.type({
  key: compositeDatasetKeyRT,
  categorizer_stats_top_hits: rt.type({
    hits: rt.type({
      hits: rt.array(logEntryCategorizerStatsHitRT),
    }),
  }),
});

export type LogEntryCategoryDatasetStatsBucket = rt.TypeOf<
  typeof logEntryCategoryDatasetStatsBucketRT
>;

export const latestLogEntryCategoriesDatasetsStatsResponseRT = rt.intersection([
  commonSearchSuccessResponseFieldsRT,
  rt.partial({
    aggregations: rt.type({
      dataset_composite_terms: rt.type({
        after_key: compositeDatasetKeyRT,
        buckets: rt.array(logEntryCategoryDatasetStatsBucketRT),
      }),
    }),
  }),
]);

export type LatestLogEntryCategoriesDatasetsStatsResponse = rt.TypeOf<
  typeof latestLogEntryCategoriesDatasetsStatsResponseRT
>;
