/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { ElasticsearchClient } from '@kbn/core/server';
import type {
  StotageExplorerIndicesDataBreakdownSize,
  StorageExplorerIndexDataBreakdownStatsStats,
} from '../../../common/storage_explorer';
import { getMainIndicesStats } from './get_indices_stats';

const INITIAL_STATE: StotageExplorerIndicesDataBreakdownSize = {
  events: { docCount: 0, sizeInBytes: 0 },
  stackframes: { docCount: 0, sizeInBytes: 0 },
  stacktraces: { docCount: 0, sizeInBytes: 0 },
  executables: { docCount: 0, sizeInBytes: 0 },
  metrics: { docCount: 0, sizeInBytes: 0 },
};

export async function getDataBreakdownSize({ client }: { client: ElasticsearchClient }) {
  const mainIndicesStats = await getMainIndicesStats({ client });

  const indicesStats = mainIndicesStats.indices || {};
  return Object.keys(indicesStats).reduce<StotageExplorerIndicesDataBreakdownSize>(
    (acc, indexName) => {
      const indexStats = indicesStats[indexName];
      const indexDocCount = indexStats.total?.docs?.count || 0;
      const indexSizeInBytes = indexStats.total?.store?.size_in_bytes || 0;

      function sumDocCountAndSize(stats: StorageExplorerIndexDataBreakdownStatsStats) {
        const sizeInBytes = stats.sizeInBytes + indexSizeInBytes;
        return {
          docCount: stats.docCount + indexDocCount,
          sizeInBytes,
        };
      }

      if (indexName.indexOf('events') > 0) {
        return {
          ...acc,
          ['events']: sumDocCountAndSize(acc.events),
        };
      }

      if (indexName.indexOf('stackframes') > 0) {
        return {
          ...acc,
          ['stackframes']: sumDocCountAndSize(acc.stackframes),
        };
      }

      if (indexName.indexOf('stacktraces') > 0) {
        return {
          ...acc,
          ['stacktraces']: sumDocCountAndSize(acc.stacktraces),
        };
      }

      if (indexName.indexOf('executables') > 0) {
        return {
          ...acc,
          ['executables']: sumDocCountAndSize(acc.executables),
        };
      }

      if (indexName.indexOf('metrics') > 0) {
        return {
          ...acc,
          ['metrics']: sumDocCountAndSize(acc.metrics),
        };
      }

      return acc;
    },
    INITIAL_STATE
  );
}
