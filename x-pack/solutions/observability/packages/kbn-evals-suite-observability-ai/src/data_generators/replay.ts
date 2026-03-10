/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import { createGcsRepository, replaySnapshot } from '@kbn/es-snapshot-loader';
import type { ToolingLog } from '@kbn/tooling-log';

export const OTEL_DEMO_SNAPSHOT_NAME = 'payment-service-failures';
export async function replayObservabilityDataStreams(
  esClient: Client,
  log: ToolingLog,
  snapshotName: string
) {
  log.debug(`Replaying data from snapshot: ${snapshotName}`);

  await replaySnapshot({
    esClient,
    log,
    repository: createGcsRepository({
      bucket: 'obs-ai-datasets',
      basePath: 'otel-demo/payment-service-failures',
    }),
    snapshotName,
    patterns: ['logs-*', 'metrics-*', 'traces-*'],
  });
}

export async function cleanObservabilityDataStreams(esClient: Client): Promise<void> {
  await Promise.all([
    esClient.deleteByQuery({
      index: 'logs-*',
      query: { match_all: {} },
      refresh: true,
    }),
    esClient.deleteByQuery({
      index: 'metrics-*',
      query: { match_all: {} },
      refresh: true,
    }),
    esClient.deleteByQuery({
      index: 'traces-*',
      query: { match_all: {} },
      refresh: true,
    }),
  ]);
}
