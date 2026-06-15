/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Local CSV-based eval data loader — no GCS or snapshot infrastructure required.
 *
 * Used by evals/re2ob_local.spec.ts for local development and CI runs that have
 * access to extracted RCAEval CSV files (RCAEVAL_DATA_DIR env var).
 *
 * Production evals use evals/re2ob.spec.ts (GCS snapshots via replaySnapshot).
 */

import { createReadStream, existsSync } from 'fs';
import { readFile } from 'fs/promises';
import { createInterface } from 'readline';
import { join } from 'path';
import { randomUUID } from 'crypto';
import type { Client } from '@elastic/elasticsearch';
import type { ToolingLog } from '@kbn/tooling-log';
import type { RcaScenario } from '../scenarios/types';

const WINDOW_BEFORE_S = 600;
const WINDOW_AFTER_S = 600;
const TARGET_INJECT_OFFSET_S = 600;
const BATCH_SIZE = 2000;

export interface LocalReplayHandle {
  scenario: RcaScenario;
  logsIndex: string;
  tracesIndex: string;
}

function generateOpaqueDataStreamNames(): {
  logsIndex: string;
  tracesIndex: string;
} {
  const runId = randomUUID().slice(0, 8);
  return {
    logsIndex: `logs-rcabench-${runId}`,
    tracesIndex: `traces-rcabench-${runId}`,
  };
}

export function resolveLocalCaseDir(rcaevalDataDir: string, scenario: RcaScenario): string | null {
  // Standard RE2-OB layout: {dataDir}/RE2-OB/{service}_{faultType}/1
  const standard = join(rcaevalDataDir, 'RE2-OB', `${scenario.service}_${scenario.faultType}`, '1');
  if (existsSync(join(standard, 'logs.csv'))) return standard;

  // Fallback: flat layout used for currencyservice_loss in our local cache
  const flat = join(rcaevalDataDir, `re2ob-${scenario.service}-${scenario.faultType}-1`);
  if (existsSync(join(flat, 'logs.csv'))) return flat;

  return null;
}

async function bulkIndex(
  esClient: Client,
  index: string,
  docs: Record<string, unknown>[]
): Promise<number> {
  const body = docs.flatMap((doc) => [
    JSON.stringify({ create: { _index: index } }),
    JSON.stringify(doc),
  ]);
  const result = await esClient.bulk({ body: body.join('\n') + '\n', refresh: false });
  const failed = result.errors
    ? (result.items ?? []).filter((i: any) => i.create?.error).length
    : 0;
  return docs.length - failed;
}

type RowMapper = (
  row: Record<string, string>,
  shiftS: number,
  injectTime: number
) => Record<string, unknown> | null;

async function indexCsv(
  esClient: Client,
  csvPath: string,
  index: string,
  rowMapper: RowMapper,
  shiftS: number,
  injectTime: number
): Promise<number> {
  const rl = createInterface({ input: createReadStream(csvPath), crlfDelay: Infinity });

  let header: string[] | null = null;
  let batch: Record<string, unknown>[] = [];
  let total = 0;

  const flush = async () => {
    if (batch.length === 0) return;
    total += await bulkIndex(esClient, index, batch);
    batch = [];
  };

  for await (const line of rl) {
    if (!header) {
      header = line.split(',');
      continue;
    }
    if (!line.trim()) continue;
    const values = line.split(',');
    const row = Object.fromEntries(header.map((k, i) => [k.trim(), (values[i] ?? '').trim()]));
    const doc = rowMapper(row, shiftS, injectTime);
    if (!doc) continue;
    batch.push(doc);
    if (batch.length >= BATCH_SIZE) await flush();
  }
  await flush();
  return total;
}

function mapLogRow(
  row: Record<string, string>,
  shiftS: number,
  injectTime: number
): Record<string, unknown> | null {
  const tsNs = parseInt(row.timestamp, 10);
  if (isNaN(tsNs)) return null;
  const tsS = tsNs / 1_000_000_000;
  if (tsS < injectTime - WINDOW_BEFORE_S || tsS >= injectTime + WINDOW_AFTER_S) return null;

  const shiftedNs = BigInt(Math.round(tsNs)) + BigInt(Math.round(shiftS * 1_000_000_000));
  const shiftedMs = Number(shiftedNs / 1_000_000n);

  const doc: Record<string, unknown> = {
    '@timestamp': new Date(shiftedMs).toISOString(),
    'service.name': row.container_name || undefined,
    message: row.message || undefined,
    'log.level': row.level || undefined,
  };
  if (row.req_path) doc['http.url.path'] = row.req_path;
  if (row.error) doc['error.message'] = row.error;
  if (row.log_template) doc['rcaeval.log_template'] = row.log_template;
  return doc;
}

function mapTraceRow(
  row: Record<string, string>,
  shiftS: number,
  injectTime: number
): Record<string, unknown> | null {
  const startMs = parseInt(row.startTimeMillis, 10);
  if (isNaN(startMs)) return null;
  const startS = startMs / 1000;
  if (startS < injectTime - WINDOW_BEFORE_S || startS >= injectTime + WINDOW_AFTER_S) return null;

  const shiftedMs = startMs + shiftS * 1000;
  const durationNs = parseFloat(row.duration) || 0;

  const doc: Record<string, unknown> = {
    '@timestamp': new Date(shiftedMs).toISOString(),
    'service.name': row.serviceName || undefined,
    'trace.id': row.traceID || undefined,
    'span.id': row.spanID || undefined,
    'span.name': row.operationName || undefined,
    'event.duration': Math.round(durationNs * 1000),
  };
  if (row.methodName) doc['span.action'] = row.methodName;
  if (row.parentSpanID) doc['parent.id'] = row.parentSpanID;
  const status = parseFloat(row.statusCode);
  if (!isNaN(status) && status > 0) doc['http.response.status_code'] = Math.round(status);
  return doc;
}

export async function indexLocalScenario(
  esClient: Client,
  log: ToolingLog,
  scenario: RcaScenario,
  caseDir: string
): Promise<LocalReplayHandle> {
  const injectTime = parseInt(await readFile(join(caseDir, 'inject_time.txt'), 'utf-8'), 10);
  const shiftS = Date.now() / 1000 - TARGET_INJECT_OFFSET_S - injectTime;

  const { logsIndex, tracesIndex } = generateOpaqueDataStreamNames();

  log.info(
    `[${scenario.snapshotName}] Indexing — shift +${Math.round(shiftS / 3600)}h, ` +
      `inject → ${new Date((injectTime + shiftS) * 1000).toISOString()}`
  );

  const logsIndexed = await indexCsv(
    esClient,
    join(caseDir, 'logs.csv'),
    logsIndex,
    mapLogRow,
    shiftS,
    injectTime
  );
  const tracesIndexed = await indexCsv(
    esClient,
    join(caseDir, 'traces.csv'),
    tracesIndex,
    mapTraceRow,
    shiftS,
    injectTime
  );

  await esClient.indices.refresh({ index: `${logsIndex},${tracesIndex}` });

  log.info(`[${scenario.snapshotName}] Indexed ${logsIndexed} logs + ${tracesIndexed} traces`);

  return { scenario, logsIndex, tracesIndex };
}

export async function cleanLocalScenario(
  esClient: Client,
  handle: LocalReplayHandle,
  log: ToolingLog
): Promise<void> {
  for (const index of [handle.logsIndex, handle.tracesIndex]) {
    try {
      // Try data stream first, fall back to plain index delete
      await esClient.indices
        .deleteDataStream({ name: index })
        .catch(() => esClient.indices.delete({ index, ignore_unavailable: true }));
    } catch (err) {
      log.warning(`Cleanup failed for ${index}: ${(err as Error).message}`);
    }
  }
}
