/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import type { KbnClient } from '@kbn/kbn-client';
import type { ToolingLog } from '@kbn/tooling-log';

const DEFAULT_TIMEOUT_MS = 90_000;
const DEFAULT_POLL_INTERVAL_MS = 3_000;
const INDEX_REFRESH_WAIT_MS = 2_500;

interface WaitForActiveAlertParams {
  esClient: Client;
  kbnClient: KbnClient;
  alertsIndex: string;
  ruleId: string;
  log: ToolingLog;
  timeoutMs?: number;
  pollIntervalMs?: number;
}

export async function waitForActiveAlert({
  esClient,
  kbnClient,
  alertsIndex,
  ruleId,
  log,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  pollIntervalMs = DEFAULT_POLL_INTERVAL_MS,
}: WaitForActiveAlertParams): Promise<string> {
  const deadline = Date.now() + timeoutMs;
  let attempt = 0;

  while (Date.now() < deadline) {
    attempt += 1;

    if (attempt > 1 && attempt % 2 === 0) {
      log.info(`Re-triggering rule run (attempt ${attempt})`);
      await kbnClient.request<void>({
        method: 'POST',
        path: `/internal/alerting/rule/${ruleId}/_run_soon`,
      });
    }

    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
    await esClient.indices.refresh({ index: alertsIndex });
    await new Promise((resolve) => setTimeout(resolve, INDEX_REFRESH_WAIT_MS));

    const alertsResponse = await esClient.search({
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

    const alertDoc = alertsResponse.hits.hits[0];
    if (alertDoc?._id) {
      log.info(`Found active alert with ID: ${alertDoc._id} (attempt ${attempt})`);
      return alertDoc._id;
    }

    log.debug(`No active alert yet for rule ${ruleId} (attempt ${attempt})`);
  }

  throw new Error(
    `No active alert found for rule ${ruleId} in index ${alertsIndex} after ${timeoutMs}ms`
  );
}
