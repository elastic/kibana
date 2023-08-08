/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { ElasticsearchClient } from '@kbn/core/server';
import type {
  StorageDetailsGroupedByIndex,
  StorageGroupedIndexNames,
} from '../../../common/storage_explorer';
import { getIndicesStats, stacktracesIndices } from './get_indices_stats';

type StotageExplorerIndicesDataBreakdownChart = Record<
  StorageGroupedIndexNames,
  StorageDetailsGroupedByIndex
>;

const INITIAL_STATE: StotageExplorerIndicesDataBreakdownChart = {
  events: { indexName: 'events', docCount: 0, sizeInBytes: 0 },
  stackframes: { indexName: 'stackframes', docCount: 0, sizeInBytes: 0 },
  stacktraces: { indexName: 'stacktraces', docCount: 0, sizeInBytes: 0 },
  executables: { indexName: 'executables', docCount: 0, sizeInBytes: 0 },
  metrics: { indexName: 'metrics', docCount: 0, sizeInBytes: 0 },
};

export async function getStorageDetailsGroupedByIndex({
  client,
}: {
  client: ElasticsearchClient;
}): Promise<StorageDetailsGroupedByIndex[]> {
  const indicesStats = await getIndicesStats({ client, indices: stacktracesIndices });
  const indices = indicesStats.indices || {};

  const perIndexStatsMap = Object.keys(indices).reduce<StotageExplorerIndicesDataBreakdownChart>(
    (acc, indexName) => {
      const indexStats = indices[indexName];
      const indexDocCount = indexStats.total?.docs?.count || 0;
      const indexSizeInBytes = indexStats.total?.store?.size_in_bytes || 0;

      function sumDocCountAndSize(stats: StorageDetailsGroupedByIndex) {
        const sizeInBytes = stats.sizeInBytes + indexSizeInBytes;
        return {
          docCount: stats.docCount + indexDocCount,
          sizeInBytes,
        };
      }

      if (indexName.indexOf('events') > 0) {
        return {
          ...acc,
          ['events']: { indexName: 'events', ...sumDocCountAndSize(acc.events) },
        };
      }

      if (indexName.indexOf('stackframes') > 0) {
        return {
          ...acc,
          ['stackframes']: { indexName: 'stackframes', ...sumDocCountAndSize(acc.stackframes) },
        };
      }

      if (indexName.indexOf('stacktraces') > 0) {
        return {
          ...acc,
          ['stacktraces']: { indexName: 'stacktraces', ...sumDocCountAndSize(acc.stacktraces) },
        };
      }

      if (indexName.indexOf('executables') > 0) {
        return {
          ...acc,
          ['executables']: { indexName: 'executables', ...sumDocCountAndSize(acc.executables) },
        };
      }

      if (indexName.indexOf('metrics') > 0) {
        return {
          ...acc,
          ['metrics']: { indexName: 'metrics', ...sumDocCountAndSize(acc.metrics) },
        };
      }

      return acc;
    },
    INITIAL_STATE
  );

  return Object.values(perIndexStatsMap);
}
