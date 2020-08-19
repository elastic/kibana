/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import type { MlAnomalyDetectors, MlSystem } from '../../types';
import { startTracingSpan } from '../../../common/performance_tracing';
import { getJobId, logEntryCategoriesJobTypes } from '../../../common/log_analysis';
import {
  LogEntryCategoryStatsBucket,
  CompositeDatasetKey,
  createLatestLogEntryCategoriesStatsQuery,
  latestLogEntryCategoriesStatsResponseRT,
} from './queries/latest_log_entry_categories_stats';
import { decodeOrThrow } from '../../../common/runtime_types';

const COMPOSITE_AGGREGATION_BATCH_SIZE = 1000;

export async function getLogEntryCategoriesQuality(
  context: {
    infra: {
      mlAnomalyDetectors: MlAnomalyDetectors;
      mlSystem: MlSystem;
      spaceId: string;
    };
  },
  sourceId: string,
  startTime: number,
  endTime: number
) {
  const finalizeLogEntryCategoriesQuality = startTracingSpan('get categories quality data');

  const logEntryCategoriesCountJobId = getJobId(
    context.infra.spaceId,
    sourceId,
    logEntryCategoriesJobTypes[0]
  );

  let latestWarnedLogEntryCategoriesStatsBuckets: LogEntryCategoryStatsBucket[] = [];
  let afterLatestBatchKey: CompositeDatasetKey | undefined;

  while (true) {
    const latestLogEntryCategoriesStatsResponse = await context.infra.mlSystem.mlAnomalySearch(
      createLatestLogEntryCategoriesStatsQuery(
        logEntryCategoriesCountJobId,
        startTime,
        endTime,
        COMPOSITE_AGGREGATION_BATCH_SIZE,
        afterLatestBatchKey
      )
    );

    const { after_key: afterKey, buckets: latestBatchBuckets = [] } =
      decodeOrThrow(latestLogEntryCategoriesStatsResponseRT)(latestLogEntryCategoriesStatsResponse)
        .aggregations?.dataset_composite_terms ?? {};

    const latestWarnedBatchBuckets = latestBatchBuckets.filter((bucket) =>
      bucket.categorizer_stats_top_hits.hits.hits.some(
        (hit) => hit._source.categorization_status === 'warn'
      )
    );

    latestWarnedLogEntryCategoriesStatsBuckets = [
      ...latestWarnedLogEntryCategoriesStatsBuckets,
      ...latestWarnedBatchBuckets,
    ];
    afterLatestBatchKey = afterKey;
    if (afterKey == null || latestBatchBuckets.length < COMPOSITE_AGGREGATION_BATCH_SIZE) {
      break;
    }
  }

  const logEntryCategoriesQualitySpan = finalizeLogEntryCategoriesQuality();

  return {
    data: latestWarnedLogEntryCategoriesStatsBuckets.map((bucket) => {
      const latestHitSource = bucket.categorizer_stats_top_hits.hits.hits[0]._source;

      return {
        dataset: bucket.key,
        categorization_status: latestHitSource.categorization_status,
        categorized_doc_count: latestHitSource.categorized_doc_count,
        dead_category_count: latestHitSource.dead_category_count,
        failed_category_count: latestHitSource.failed_category_count,
        frequent_category_count: latestHitSource.frequent_category_count,
        rare_category_count: latestHitSource.rare_category_count,
        timestamp: latestHitSource.timestamp,
        total_category_count: latestHitSource.total_category_count,
      };
    }),
    timing: {
      spans: [logEntryCategoriesQualitySpan],
    },
  };
}
