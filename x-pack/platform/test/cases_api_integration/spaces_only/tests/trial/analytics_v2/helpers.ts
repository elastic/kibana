/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import type SuperTest from 'supertest';

export const CASE_INDEX = '.cases';
export const DATA_VIEW_ID_PREFIX = 'cases-analytics-managed-';

const POLL_INTERVAL_MS = 200;
const DEFAULT_TIMEOUT_MS = 15_000;
const BOOTSTRAP_TIMEOUT_MS = 30_000;

const INTERNAL_HEADERS = {
  'kbn-xsrf': 'true',
  'x-elastic-internal-origin': 'kibana',
} as const;

/**
 * Wait for `.cases` to exist. Called once in the suite's `before` hook to ride
 * out the gap between plugin start firing and `ensureCaseIndex` completing
 * its async bootstrap.
 */
export async function waitForCaseIndexExists(
  es: Client,
  timeoutMs = BOOTSTRAP_TIMEOUT_MS
): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const exists = await es.indices.exists({ index: CASE_INDEX });
    if (exists) return;
    await sleep(POLL_INTERVAL_MS);
  }
  throw new Error(`Timed out waiting for ${CASE_INDEX} to exist`);
}

/**
 * Poll `.cases` until the analytics doc for the given caseId reaches the
 * expected presence. The v2 writer is fire-and-forget on a separate code path
 * from the SO write — `?refresh=true` on the cases API doesn't refresh
 * `.cases`, so tests must poll-with-refresh.
 */
export async function waitForAnalyticsCase(
  es: Client,
  caseId: string,
  options: { expect: 'present' | 'absent'; timeoutMs?: number } = { expect: 'present' }
): Promise<void> {
  const { expect: expectState, timeoutMs = DEFAULT_TIMEOUT_MS } = options;
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      await es.indices.refresh({ index: CASE_INDEX });
    } catch {
      // Index may have been dropped mid-test — keep polling, the next
      // `get` will throw 404 and we'll handle it.
    }
    try {
      await es.get({ index: CASE_INDEX, id: caseId });
      if (expectState === 'present') return;
    } catch (err) {
      const status =
        (err as { meta?: { statusCode?: number } })?.meta?.statusCode ??
        (err as { statusCode?: number })?.statusCode;
      if (status === 404 && expectState === 'absent') return;
    }
    await sleep(POLL_INTERVAL_MS);
  }
  throw new Error(`Timed out waiting for ${CASE_INDEX}/${caseId} to be ${expectState}`);
}

/**
 * Poll `.cases` until the doc's `updated_at` matches `expected` — useful for
 * "patched the case, wait until v2 sees the new value" without relying on a
 * fixed sleep.
 */
export async function waitForAnalyticsCaseUpdate(
  es: Client,
  caseId: string,
  predicate: (source: AnalyticsCaseSource) => boolean,
  timeoutMs = DEFAULT_TIMEOUT_MS
): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    await es.indices.refresh({ index: CASE_INDEX });
    try {
      const result = await es.get<AnalyticsCaseSource>({ index: CASE_INDEX, id: caseId });
      if (result._source && predicate(result._source)) return;
    } catch {
      // Doc not yet present.
    }
    await sleep(POLL_INTERVAL_MS);
  }
  throw new Error(`Timed out waiting for ${CASE_INDEX}/${caseId} to satisfy predicate`);
}

/** Fetch the analytics doc body for a case. Throws if missing. */
export async function getAnalyticsCase(es: Client, caseId: string): Promise<AnalyticsCaseSource> {
  await es.indices.refresh({ index: CASE_INDEX });
  const result = await es.get<AnalyticsCaseSource>({ index: CASE_INDEX, id: caseId });
  if (!result._source) {
    throw new Error(`${CASE_INDEX}/${caseId} has no _source`);
  }
  return result._source;
}

/**
 * Drop `.cases`, all per-space data views, and reset the reconciliation task
 * state. Then triggers an immediate tick. Useful between tests for a clean
 * slate.
 */
export async function resetV2(supertest: SuperTest.Agent): Promise<void> {
  await supertest.post('/internal/cases/_analyticsV2/reset').set(INTERNAL_HEADERS).expect(200);
  // After reset, wait for the index to come back so the next test doesn't
  // hit a 404 on its first poll.
  // The /reset handler awaits `ensureCaseIndex` before returning, but ES
  // index creation can briefly lag the response.
}

/** GET the /state route. */
export async function getV2State(supertest: SuperTest.Agent): Promise<V2StateBody> {
  const response = await supertest
    .get('/internal/cases/_analyticsV2/state')
    .set(INTERNAL_HEADERS)
    .expect(200);
  return response.body as V2StateBody;
}

/** POST /reconcile/run_soon. */
export async function runReconcileSoon(supertest: SuperTest.Agent): Promise<void> {
  await supertest
    .post('/internal/cases/_analyticsV2/reconcile/run_soon')
    .set(INTERNAL_HEADERS)
    .expect(200);
}

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

// ----- Response shape types (subset of what we assert against) -----

export interface AnalyticsCaseSource {
  '@timestamp': string;
  kibana: { space_ids: string[] };
  cases: {
    id: string;
    title: string;
    description?: string;
    owner: string;
    status: string;
    severity: string;
    tags?: string[];
    updated_at?: string | null;
    created_at?: string;
    [k: string]: unknown;
  };
}

export interface V2StateBody {
  enabled: boolean;
  index: string;
  index_exists: boolean;
  reconciliation: {
    task_type: string;
    last_run: {
      last_run_at?: string;
      runs?: number;
      next_run_at?: string;
      status?: string;
    } | null;
  };
}
