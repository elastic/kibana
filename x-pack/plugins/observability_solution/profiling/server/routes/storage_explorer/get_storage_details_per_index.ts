/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '@kbn/core/server';
import {
  IndexLifecyclePhaseSelectOption,
  StorageDetailsPerIndex,
} from '../../../common/storage_explorer';
import {
  getIndicesLifecycleStatus,
  getIndicesStats,
  getIndicesInfo,
  stacktracesIndices,
} from './get_indices_stats';

export async function getStorageDetailsPerIndex({
  client,
  indexLifecyclePhase,
}: {
  client: ElasticsearchClient;
  indexLifecyclePhase: IndexLifecyclePhaseSelectOption;
}): Promise<StorageDetailsPerIndex[]> {
  const [indicesStats, indicesInfo, indicesLifecycleStatus] = await Promise.all([
    getIndicesStats({ client, indices: stacktracesIndices }),
    getIndicesInfo({ client, indices: stacktracesIndices }),
    getIndicesLifecycleStatus({ client, indices: stacktracesIndices }),
  ]);

  const indices = indicesStats.indices || {};

  return Object.keys(indices)
    .map((indexName) => {
      const stats = indices[indexName];
      const indexInfo = indicesInfo[indexName];
      const indexLifecycle = indicesLifecycleStatus[indexName];

      return {
        indexName,
        docCount: stats.total?.docs?.count ?? 0,
        primaryShardsCount: indexInfo.settings?.index?.number_of_shards as number | undefined,
        replicaShardsCount: indexInfo.settings?.index?.number_of_replicas as number | undefined,
        sizeInBytes: stats.total?.store?.size_in_bytes ?? 0,
        dataStream: indexInfo?.data_stream,
        lifecyclePhase:
          indexLifecycle && 'phase' in indexLifecycle ? indexLifecycle.phase : undefined,
      };
    })
    .filter((item) => {
      if (
        indexLifecyclePhase !== IndexLifecyclePhaseSelectOption.All &&
        item.lifecyclePhase &&
        item.lifecyclePhase !== indexLifecyclePhase
      ) {
        return false;
      }
      return true;
    });
}
