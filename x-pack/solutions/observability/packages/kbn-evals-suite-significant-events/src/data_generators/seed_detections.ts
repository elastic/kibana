/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolingLog } from '@kbn/tooling-log';
import type { Client } from '@elastic/elasticsearch';
import type { Detection } from '@kbn/significant-events-schema';
import { DETECTIONS_DATA_STREAM } from './snapshot_indices';

/**
 * Stores the detections a run hands the agent, as the detection workflow does, so `events_write`
 * can fill each signal's metadata from the stored detection. A failure is logged, not thrown: the
 * agent then has to copy the metadata itself, as it did before the writer filled it.
 */
export const seedDetections = async ({
  esClient,
  detections,
  spaceId,
  log,
}: {
  esClient: Client;
  detections: Array<Partial<Detection>>;
  spaceId: string;
  log: ToolingLog;
}): Promise<void> => {
  if (detections.length === 0) return;

  const operations = detections.flatMap(({ processed: _processed, skip: _skip, ...stored }) => [
    { create: { _index: DETECTIONS_DATA_STREAM } },
    { ...stored, kibana: { space_ids: [spaceId] } },
  ]);

  try {
    const response = await esClient.bulk({ operations, refresh: 'wait_for' });
    if (response.errors) {
      log.warning(`seedDetections: some detections were not stored (${response.items.length})`);
    }
  } catch (error) {
    log.warning(
      `seedDetections: could not store detections: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
};
