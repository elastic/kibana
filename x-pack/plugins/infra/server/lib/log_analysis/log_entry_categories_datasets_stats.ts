/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { startTracingSpan } from '../../../common/performance_tracing';
import { decodeOrThrow } from '../../../common/runtime_types';
import type { MlAnomalyDetectors, MlSystem } from '../../types';
import { COMPOSITE_AGGREGATION_BATCH_SIZE } from './common';
import {
  CompositeDatasetKey,
  createLatestLogEntryCategoriesDatasetsStatsQuery,
  latestLogEntryCategoriesDatasetsStatsResponseRT,
  LogEntryCategoryDatasetStatsBucket,
} from './queries/latest_log_entry_categories_datasets_stats';

export async function getLatestLogEntriesCategoriesDatasetsStats(
  context: {
    infra: {
      mlAnomalyDetectors: MlAnomalyDetectors;
      mlSystem: MlSystem;
    };
  },
  jobIds: string[],
  startTime: number,
  endTime: number,
  includeCategorizerStatuses: Array<'ok' | 'warn'> = []
) {
  const finalizeLogEntryCategoriesDatasetsStats = startTracingSpan('get categories datasets stats');

  let latestLogEntryCategoriesDatasetsStatsBuckets: LogEntryCategoryDatasetStatsBucket[] = [];
  let afterLatestBatchKey: CompositeDatasetKey | undefined;

  while (true) {
    const latestLogEntryCategoriesDatasetsStatsResponse = await context.infra.mlSystem.mlAnomalySearch(
      createLatestLogEntryCategoriesDatasetsStatsQuery(
        jobIds,
        startTime,
        endTime,
        COMPOSITE_AGGREGATION_BATCH_SIZE,
        afterLatestBatchKey
      ),
      jobIds
    );

    const { after_key: afterKey, buckets: latestBatchBuckets = [] } =
      decodeOrThrow(latestLogEntryCategoriesDatasetsStatsResponseRT)(
        latestLogEntryCategoriesDatasetsStatsResponse
      ).aggregations?.dataset_composite_terms ?? {};

    const latestIncludedBatchBuckets =
      includeCategorizerStatuses.length > 0
        ? latestBatchBuckets.filter((bucket) =>
            bucket.categorizer_stats_top_hits.hits.hits.some((hit) =>
              includeCategorizerStatuses.includes(hit._source.categorization_status)
            )
          )
        : latestBatchBuckets;

    latestLogEntryCategoriesDatasetsStatsBuckets = [
      ...latestLogEntryCategoriesDatasetsStatsBuckets,
      ...latestIncludedBatchBuckets,
    ];

    afterLatestBatchKey = afterKey;
    if (afterKey == null || latestBatchBuckets.length < COMPOSITE_AGGREGATION_BATCH_SIZE) {
      break;
    }
  }

  const logEntryCategoriesDatasetsStatsSpan = finalizeLogEntryCategoriesDatasetsStats();

  return {
    data: latestLogEntryCategoriesDatasetsStatsBuckets.map((bucket) => {
      const latestHitSource = bucket.categorizer_stats_top_hits.hits.hits[0]._source;

      return {
        categorization_status: latestHitSource.categorization_status,
        categorized_doc_count: latestHitSource.categorized_doc_count,
        dataset: bucket.key.dataset ?? '',
        dead_category_count: latestHitSource.dead_category_count,
        failed_category_count: latestHitSource.failed_category_count,
        frequent_category_count: latestHitSource.frequent_category_count,
        job_id: latestHitSource.job_id,
        log_time: latestHitSource.log_time,
        rare_category_count: latestHitSource.rare_category_count,
        total_category_count: latestHitSource.total_category_count,
      };
    }),
    timing: {
      spans: [logEntryCategoriesDatasetsStatsSpan],
    },
  };
}
