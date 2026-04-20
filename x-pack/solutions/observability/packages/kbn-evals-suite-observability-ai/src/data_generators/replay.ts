/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import { createGcsRepository, replaySnapshot, type LoadResult } from '@kbn/es-snapshot-loader';
import type { ToolingLog } from '@kbn/tooling-log';
import type { GcsConfig } from '../scenarios/types';

export async function replayObservabilityDataStreams(
  esClient: Client,
  log: ToolingLog,
  snapshotName: string,
  gcsConfig: GcsConfig
): Promise<LoadResult> {
  log.debug(
    `Replaying data from snapshot: ${snapshotName} (${gcsConfig.bucket}/${gcsConfig.basePath})`
  );

  return await replaySnapshot({
    esClient,
    log,
    repository: createGcsRepository({
      bucket: gcsConfig.bucket,
      basePath: gcsConfig.basePath,
    }),
    snapshotName,
    patterns: ['logs-*', 'metrics-*', 'traces-*'],
  });
}

/** deleteByQuery on each distinct destination from snapshot replay (`reindexedIndices` only). */
export async function cleanObservabilityDataStreams(
  esClient: Client,
  replayResult: LoadResult,
  log?: ToolingLog
): Promise<void> {
  const indices = [...new Set(replayResult?.reindexedIndices ?? [])];
  if (indices.length === 0) {
    return;
  }

  await Promise.all(
    indices.map(async (index) => {
      try {
        await esClient.deleteByQuery({
          index,
          query: { match_all: {} },
          refresh: true,
        });
      } catch (error) {
        // do not fail evals on ES delete_by_query issues (e.g. known serverless flakes).
        log?.warning(`deleteByQuery cleanup failed for [${index}]; documents may remain.`, error);
      }
    })
  );
}
