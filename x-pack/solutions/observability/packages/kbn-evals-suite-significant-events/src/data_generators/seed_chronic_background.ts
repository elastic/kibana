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

/** One stretch of the seeded failure pattern, in minutes before seed time (`from` is the older end). */
export interface ChronicSeedSegment {
  from_minutes_ago: number;
  to_minutes_ago: number;
  rate_per_minute: number;
}

export interface ChronicSeedConfig {
  /**
   * Failure phrase written to `body.text`; the KI query matches it as a phrase. Unique per scenario,
   * and never a part of another scenario's phrase: seeding deletes by it, and the stream is shared.
   */
  phrase: string;
  /** Service prefix written to `body.text` (mirrors the app-log format in the snapshots). */
  service: string;
  /**
   * The failure rate over time: one segment is a steady condition, a low segment then a high one
   * a surge, and a first segment that starts days ago a condition that is new. The span must cover
   * the 7-day baseline window plus today, about 8 days, and the pre window of the detection.
   */
  segments: ChronicSeedSegment[];
  /** Log level of the seeded rows. A failure phrase at INFO reports a normal state. Default `ERROR`, `null` for none. */
  level?: 'ERROR' | 'WARN' | 'INFO' | 'DEBUG' | null;
  /** Further fields on every seeded row, such as an exception the caller handled. */
  attributes?: Record<string, string | number | boolean>;
  /** Detection change point is stamped this many minutes before seed time. */
  detection_offset_minutes: number;
  ki_title: string;
  ki_description: string;
}

/** One seeded log row: the phrase as an app log line, with the config's level and extra fields. */
export const buildChronicDocument = ({
  config,
  timestamp,
}: {
  config: ChronicSeedConfig;
  timestamp: number;
}): Record<string, unknown> => ({
  '@timestamp': new Date(timestamp).toISOString(),
  body: { text: `${config.service} | ${config.phrase}` },
  ...(config.level === null ? {} : { severity_text: config.level ?? 'ERROR' }),
  attributes: config.attributes ?? {},
  resource: { attributes: { 'service.name': config.service } },
});

export interface ChronicSeedResult {
  /** Detection `@timestamp` to stamp on the scenario's canonical detections. */
  detectionTimestamp: string;
}

/** Timestamps (epoch ms) of the failures a config seeds, oldest first, at each segment's own rate. */
export const seedTimestamps = ({
  now,
  segments,
}: {
  now: number;
  segments: readonly ChronicSeedSegment[];
}): number[] =>
  segments.flatMap(({ from_minutes_ago: from, to_minutes_ago: to, rate_per_minute: rate }) => {
    if (!(from > to) || !(rate > 0)) {
      throw new Error(
        `Chronic seed segment needs from_minutes_ago > to_minutes_ago and a positive rate (got ${from}, ${to}, ${rate})`
      );
    }
    const intervalMs = 60_000 / rate;
    const timestamps: number[] = [];
    for (let ts = now - from * 60_000; ts < now - to * 60_000; ts += intervalMs) {
      timestamps.push(Math.round(ts));
    }
    return timestamps;
  });

const BULK_CHUNK_DOCS = 5_000;

/** The KI's stored query: the exact phrase only, so scenarios sharing a stream never match each other. */
export const kiQueryFor = ({
  streamName,
  phrase,
}: {
  streamName: string;
  phrase: string;
}): string => `FROM ${streamName}, ${streamName}.* | WHERE MATCH_PHRASE(body.text, "${phrase}")`;

/**
 * Seeds a failure pattern with a known rate over time (`config.segments`): matching ERROR logs
 * plus one rule-backed query KI for it. The truth is known exactly, so the grounding skill's
 * baseline profile (days failed, last day against the earlier days) can be checked against it.
 */
export const seedChronicBackground = async ({
  esClient,
  log,
  streamName,
  sourceId,
  spaceId,
  ruleUuid,
  ruleName,
  config,
}: {
  esClient: Client;
  log: ToolingLog;
  /** Data index the chronic logs are written to and the KI query reads from. */
  streamName: string;
  /** Nightshift source id the KI is keyed on; the KI reader looks it up by this, not by the index name. */
  sourceId: string;
  /** The reader filters on `kibana.space_ids`, so a KI without it is invisible to the agent. */
  spaceId: string;
  ruleUuid: string;
  ruleName: string;
  config: ChronicSeedConfig;
}): Promise<ChronicSeedResult> => {
  const now = Date.now();
  const timestamps = seedTimestamps({ now, segments: config.segments });

  // Idempotency across repetitions: drop any previously seeded layer so the rates stay as given.
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

  for (let start = 0; start < timestamps.length; start += BULK_CHUNK_DOCS) {
    const operations = timestamps
      .slice(start, start + BULK_CHUNK_DOCS)
      .flatMap((ts) => [{ create: {} }, buildChronicDocument({ config, timestamp: ts })]);
    const bulkResponse = await esClient.bulk({ index: streamName, operations, refresh: false });
    if (bulkResponse.errors) {
      const firstError = bulkResponse.items.find((item) => item.create?.error)?.create?.error;
      throw new Error(`Chronic background bulk seed failed: ${JSON.stringify(firstError)}`);
    }
  }
  await esClient.indices.refresh({ index: streamName });

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
      'source.id': sourceId,
      'kibana.space_ids': [spaceId],
      query: {
        esql: kiQueryFor({ streamName, phrase: config.phrase }),
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
    `Seeded chronic background "${ruleName}": ${timestamps.length} docs in ` +
      `${config.segments.length} segment(s), change point ${detectionTimestamp}`
  );
  return { detectionTimestamp };
};
