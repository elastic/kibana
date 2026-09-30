/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import type { ToolingLog } from '@kbn/tooling-log';
import { KNOWLEDGE_INDICATORS_DATA_STREAM } from './snapshot_indices';

const KI_TTL_MILLIS = 30 * 24 * 60 * 60 * 1000;

export interface ChronicSeedConfig {
  /** Failure phrase written to `body.text`; the KI query greps for it. */
  phrase: string;
  /** Service prefix written to `body.text` (mirrors the app-log format in the snapshots). */
  service: string;
  /** Steady emission rate; identical before and after the change point, so rate evidence is flat. */
  rate_per_minute: number;
  /** Total seeded span ending at seed time — must exceed 60m + detection offset so the pre window has coverage. */
  duration_minutes: number;
  /** Detection change point is stamped this many minutes before seed time. */
  detection_offset_minutes: number;
  ki_title: string;
  ki_description: string;
}

export interface ChronicSeedResult {
  /** Detection `@timestamp` to stamp on the scenario's canonical detections. */
  detectionTimestamp: string;
}

/**
 * Seeds a chronic, rate-flat failure pattern: steady matching logs for the whole seeded span
 * (identical rate before and after the change point) plus one rule-backed query KI for it.
 * The grounding skill's pre/post rate evidence over this pattern must come out flat, so the
 * expected verdict is `inconclusive` (mechanism present, not newly elevated) — the positive
 * fixture for the rate gate, which is otherwise only exercised by first-onset scenarios.
 */
export const seedChronicBackground = async ({
  esClient,
  log,
  streamName,
  ruleUuid,
  ruleName,
  config,
}: {
  esClient: Client;
  log: ToolingLog;
  streamName: string;
  ruleUuid: string;
  ruleName: string;
  config: ChronicSeedConfig;
}): Promise<ChronicSeedResult> => {
  const now = Date.now();
  const intervalMs = 60_000 / config.rate_per_minute;
  const spanMs = config.duration_minutes * 60_000;

  // Idempotency across repetitions: drop any previously seeded layer so the rate stays flat.
  await esClient
    .deleteByQuery({
      index: streamName,
      query: { match_phrase: { 'body.text': config.phrase } },
      refresh: true,
      conflicts: 'proceed',
    })
    .catch((err: { statusCode?: number }) => {
      if (err?.statusCode !== 404) throw err;
    });

  const operations: Array<Record<string, unknown>> = [];
  for (let ts = now - spanMs; ts < now; ts += intervalMs) {
    operations.push({ create: {} });
    operations.push({
      '@timestamp': new Date(ts).toISOString(),
      body: { text: `${config.service} | ${config.phrase}` },
      severity_text: 'ERROR',
      resource: { attributes: { 'service.name': config.service } },
    });
  }

  const bulkResponse = await esClient.bulk({ index: streamName, operations, refresh: true });
  if (bulkResponse.errors) {
    const firstError = bulkResponse.items.find((item) => item.create?.error)?.create?.error;
    throw new Error(`Chronic background bulk seed failed: ${JSON.stringify(firstError)}`);
  }

  // Clean up any previously seeded KI doc so op_type: 'create' doesn't conflict on repeat runs.
  await esClient
    .deleteByQuery({
      index: KNOWLEDGE_INDICATORS_DATA_STREAM,
      query: { term: { id: `chronic-${ruleUuid}` } },
      refresh: true,
      conflicts: 'proceed',
    })
    .catch((err: { statusCode?: number }) => {
      if (err?.statusCode !== 404) throw err;
    });

  await esClient.index({
    index: KNOWLEDGE_INDICATORS_DATA_STREAM,
    op_type: 'create',
    refresh: true,
    document: {
      '@timestamp': new Date(now).toISOString(),
      expires_at: new Date(now + KI_TTL_MILLIS).toISOString(),
      id: `chronic-${ruleUuid}`,
      type: 'query',
      title: config.ki_title,
      description: config.ki_description,
      evidence: [`body.text: "${config.service} | ${config.phrase}"`],
      'stream.name': streamName,
      query: {
        esql: `FROM ${streamName}, ${streamName}.* | WHERE body.text : "${config.phrase}"`,
        query_type: 'match',
        severity_score: 60,
        rule_backed: true,
        rule_id: ruleUuid,
        features: [],
      },
    },
  });

  const detectionTimestamp = new Date(now - config.detection_offset_minutes * 60_000).toISOString();
  log.info(
    `Seeded chronic background "${ruleName}": ${operations.length / 2} docs over ` +
      `${config.duration_minutes}m at ${config.rate_per_minute}/min, change point ${detectionTimestamp}`
  );
  return { detectionTimestamp };
};
