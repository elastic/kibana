/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import { replaySnapshot } from '@kbn/es-snapshot-loader';
import type { ToolingLog } from '@kbn/tooling-log';

export const OTEL_DEMO_SNAPSHOT_NAME = 'payment-service-failures';
export async function replayObservabilitySignals(
  esClient: Client,
  log: ToolingLog,
  snapshotName: string
) {
  log.debug(`Replaying data from snapshot: ${snapshotName}`);

  await replaySnapshot({
    esClient,
    log,
    // Scout server uses /tmp/repo as the default snapshot repository path
    snapshotUrl: 'file:///tmp/repo',
    snapshotName,
    patterns: ['logs-*', 'metrics-*', 'traces-*'],
  });
}
