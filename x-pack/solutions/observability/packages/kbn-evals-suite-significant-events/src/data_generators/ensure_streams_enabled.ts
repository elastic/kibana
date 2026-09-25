/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import type { ToolingLog } from '@kbn/tooling-log';
import type { ApiServicesFixture } from '@kbn/scout';
import { ensureLogsIndexTemplate } from './logs_index_template';
import { deleteTemporaryReplayIndices } from './replay_into_managed_stream';

// Deferred wired roots `streams._enable` re-materializes; need an index template before enable.
export const SIGEVENTS_WIRED_ROOTS = ['logs.otel', 'logs.ecs'] as const;

/**
 * Reset and re-enable streams. Clears stale temp replay indices first (they pin the
 * `@stream.processing` pipelines, blocking disable), then ensures the wired-root index
 * template exists so `streams._enable` can recreate `logs.otel`/`logs.ecs` (else a 400).
 */
export async function ensureStreamsEnabled({
  esClient,
  apiServices,
  log,
}: {
  esClient: Client;
  apiServices: ApiServicesFixture;
  log: ToolingLog;
}): Promise<void> {
  await deleteTemporaryReplayIndices(esClient, log);
  await apiServices.streams.disable().catch(() => {});
  await ensureLogsIndexTemplate(esClient, log, [...SIGEVENTS_WIRED_ROOTS]);
  await apiServices.streams.enable();
}
