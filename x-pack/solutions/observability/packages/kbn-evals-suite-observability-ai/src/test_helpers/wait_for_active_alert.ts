/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import type { ToolingLog } from '@kbn/tooling-log';

const DEFAULT_MAX_WAIT_MS = 60_000;
const DEFAULT_POLL_INTERVAL_MS = 2_000;

export interface WaitForActiveAlertOptions {
  esClient: Client;
  alertsIndex: string;
  ruleId: string;
  log: ToolingLog;
  maxWaitMs?: number;
  pollIntervalMs?: number;
}

export async function waitForActiveAlert({
  esClient,
  alertsIndex,
  ruleId,
  log,
  maxWaitMs = DEFAULT_MAX_WAIT_MS,
  pollIntervalMs = DEFAULT_POLL_INTERVAL_MS,
}: WaitForActiveAlertOptions): Promise<string> {
  const deadline = Date.now() + maxWaitMs;
  let attempt = 0;

  while (Date.now() < deadline) {
    attempt += 1;
    await esClient.indices.refresh({ index: alertsIndex });

    const response = await esClient.search({
      index: alertsIndex,
      query: {
        bool: {
          filter: [
            { term: { 'kibana.alert.rule.uuid': ruleId } },
            { term: { 'kibana.alert.status': 'active' } },
          ],
        },
      },
      size: 1,
    });

    const hit = response.hits.hits[0];
    if (hit?._id) {
      log.info(`Found active alert (attempt ${attempt}): ${hit._id}`);
      return hit._id as string;
    }

    const total =
      typeof response.hits.total === 'number'
        ? response.hits.total
        : response.hits.total?.value ?? 0;

    log.info(
      `No active alert for rule ${ruleId} (attempt ${attempt}, hits: ${total}). Retrying in ${pollIntervalMs}ms...`
    );

    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
  }

  throw new Error(
    `No active alert found for rule ${ruleId} in index ${alertsIndex} after ${maxWaitMs}ms (${attempt} attempts)`
  );
}
