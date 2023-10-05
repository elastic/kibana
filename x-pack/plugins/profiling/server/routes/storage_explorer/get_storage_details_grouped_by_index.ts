/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { ElasticsearchClient } from '@kbn/core/server';
import { groupBy, sumBy } from 'lodash';
import {
  IndexLifecyclePhaseSelectOption,
  StorageGroupedIndexNames,
} from '../../../common/storage_explorer';
import {
  getIndicesLifecycleStatus,
  getIndicesStats,
  stacktracesIndices,
} from './get_indices_stats';

function getGroupedIndexName(indexName: string): StorageGroupedIndexNames | undefined {
  if (indexName.indexOf('events') > 0) {
    return 'events';
  }

  if (indexName.indexOf('stackframes') > 0) {
    return 'stackframes';
  }

  if (indexName.indexOf('stacktraces') > 0) {
    return 'stacktraces';
  }

  if (indexName.indexOf('executables') > 0) {
    return 'executables';
  }

  if (indexName.indexOf('metrics') > 0) {
    return 'metrics';
  }
}

export async function getStorageDetailsGroupedByIndex({
  client,
  indexLifecyclePhase,
}: {
  client: ElasticsearchClient;
  indexLifecyclePhase: IndexLifecyclePhaseSelectOption;
}) {
  const [indicesStats, indicesLifecycleStatus] = await Promise.all([
    getIndicesStats({ client, indices: stacktracesIndices }),
    getIndicesLifecycleStatus({ client, indices: stacktracesIndices }),
  ]);
  const indices = indicesStats.indices || {};

  const groupedIndexStatsMap = groupBy(
    Object.keys(indices)
      .filter((indexName) => {
        const indexLifecycleStatus = indicesLifecycleStatus[indexName];
        const currentIndexLifecyclePhase =
          indexLifecycleStatus && 'phase' in indexLifecycleStatus
            ? indexLifecycleStatus.phase
            : undefined;
        if (
          indexLifecyclePhase !== IndexLifecyclePhaseSelectOption.All &&
          currentIndexLifecyclePhase &&
          currentIndexLifecyclePhase !== indexLifecyclePhase
        ) {
          return false;
        }
        return true;
      })
      .map((indexName) => {
        const indexStats = indices[indexName];
        const indexDocCount = indexStats.total?.docs?.count || 0;
        const indexSizeInBytes = indexStats.total?.store?.size_in_bytes || 0;

        return {
          indexName: getGroupedIndexName(indexName),
          docCount: indexDocCount,
          sizeInBytes: indexSizeInBytes,
        };
      }),
    'indexName'
  );

  return Object.keys(groupedIndexStatsMap).map((indexName) => {
    const values = groupedIndexStatsMap[indexName];
    const docCount = sumBy(values, 'docCount');
    const sizeInBytes = sumBy(values, 'sizeInBytes');
    return {
      indexName,
      docCount,
      sizeInBytes,
    };
  });
}
