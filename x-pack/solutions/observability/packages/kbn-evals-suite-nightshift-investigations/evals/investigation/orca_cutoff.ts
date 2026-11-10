/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { timeoutSignal } from '@kbn/std';
import assert from 'assert';
import { createHash, randomBytes } from 'crypto';
import pMap from 'p-map';
import { z, lazySchema } from '@kbn/zod/v4';
import { ORCABENCH_ES_CONNECTOR_PREFIX, getConnectorSet } from './connector_sets';
import { assertOrcaSource } from './orca_dataset';
import type { OrcaTelemetryVariant } from './orca_dataset';
import type { InvestigationExample } from './types';

/** The three ORCA signals, each a set of hourly data streams. */
export const ORCA_SIGNALS = ['logs', 'traces', 'metrics'] as const;
const ORCA_INDEX_PATTERNS = ORCA_SIGNALS.map((signal) => `${signal}-orcabench.otel-*`);

/**
 * ORCA's last telemetry snapshot. A key bounded here sees the whole window the pinned preflight
 * counts cover (16:22 to 16:50 UTC on 2026-04-19), so it proves which variant the keys serve.
 */
export const ORCA_REFERENCE_CUTOFF = '2026-04-24T19:25:42.000Z';

/**
 * Flag documents, which the `no-flags` variant hides: flagd itself, every `feature_flag` field,
 * flag-evaluation spans and log lines naming a flag or one of the demo's flag keys.
 */
export const ORCA_FLAG_DOCUMENTS_QUERY = {
  bool: {
    should: [
      { term: { 'service.name': 'flagd' } },
      { term: { 'resource.attributes.service.name': 'flagd' } },
      { exists: { field: '*feature_flag*' } },
      { wildcard: { name: { value: '*flag*', case_insensitive: true } } },
      {
        query_string: {
          fields: ['body.text', 'message'],
          query:
            'paymentFailure OR paymentUnreachable OR productCatalogFailure OR cartFailure OR adFailure OR adManualGc OR adHighCpu OR imageSlowLoad OR recommendationCacheFailure OR loadGeneratorFloodHomepage OR kafkaQueueProblems OR emailMemoryLeak OR llmRateLimitError OR llmInaccurateResponse OR flagd OR "feature flag" OR openfeature',
        },
      },
    ],
    minimum_should_match: 1,
  },
} as const;

/**
 * The last moment of telemetry an ORCA task may read: the snapshot ORCA serves it, recorded on every
 * example. Always written with milliseconds, because Elasticsearch rounds a `lte` date without them
 * up to the end of that second.
 */
export const getOrcaCutoff = ({ metadata }: Pick<InvestigationExample, 'metadata'>): string => {
  const { case_id: caseId, telemetry_snapshot_time: snapshotTime } = metadata;
  const snapshotMs = typeof snapshotTime === 'string' ? Date.parse(snapshotTime) : Number.NaN;
  assert(!Number.isNaN(snapshotMs), `ORCA case ${caseId} has no parseable telemetry_snapshot_time`);
  return new Date(snapshotMs).toISOString();
};

/** The tasks sharing one cutoff, and the Kibana space and connector that read up to it. */
export interface OrcaCutoffGroup {
  cutoff: string;
  spaceId: string;
  connectorId: string;
  caseIds: readonly string[];
}

/**
 * The id suffix of a cutoff's space, connector and key. A hash, so neither the ids nor the key's
 * name show the investigator its snapshot time or the variant.
 */
const orcaCutoffSuffix = (cutoff: string, variant: OrcaTelemetryVariant): string =>
  createHash('sha256').update(`${variant}:${cutoff}`).digest('hex').slice(0, 12);

/**
 * Groups tasks by cutoff, in cutoff order. Space and connector ids derive from a hash of the
 * cutoff and the variant: stable across runs, and never shared by a `full` and a `no-flags` run on
 * one stack, which would otherwise overwrite each other's keys.
 */
export const groupOrcaCasesByCutoff = (
  examples: ReadonlyArray<Pick<InvestigationExample, 'metadata'>>,
  variant: OrcaTelemetryVariant
): OrcaCutoffGroup[] => {
  const caseIdsByCutoff = new Map<string, string[]>();
  for (const example of examples) {
    const cutoff = getOrcaCutoff(example);
    caseIdsByCutoff.set(cutoff, [...(caseIdsByCutoff.get(cutoff) ?? []), example.metadata.case_id]);
  }
  return [...caseIdsByCutoff.entries()]
    .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0))
    .map(([cutoff, caseIds]) => {
      const suffix = orcaCutoffSuffix(cutoff, variant);
      return {
        cutoff,
        spaceId: `orca-${suffix}`,
        connectorId: `${ORCABENCH_ES_CONNECTOR_PREFIX}${suffix}`,
        caseIds,
      };
    });
};

/** The document-level security query of a key that reads ORCA up to `cutoff`, inclusive. */
export const orcaCutoffQuery = (cutoff: string, variant: OrcaTelemetryVariant) => {
  const range = { range: { '@timestamp': { lte: cutoff } } };
  return variant === 'no-flags'
    ? { bool: { filter: [range], must_not: [ORCA_FLAG_DOCUMENTS_QUERY] } }
    : range;
};

/** The ORCA cluster and the eval user that mints its read keys. */
export interface OrcaEsCredentials {
  url: string;
  username: string;
  password: string;
}

/** The eval user's credentials, which the Scout hook exports for the orcabench connector set. */
export const resolveOrcaEsCredentials = (
  env: NodeJS.ProcessEnv = process.env
): OrcaEsCredentials => {
  const {
    NIGHTSHIFT_ORCA_ES_URL: url,
    NIGHTSHIFT_ORCA_ES_USERNAME: username,
    NIGHTSHIFT_ORCA_ES_PASSWORD: password,
  } = env;
  assert(
    url && username && password && getConnectorSet(env) === 'orcabench',
    'ORCA requires a Scout server started with the orcabench connector set'
  );
  return { url: url.replace(/\/$/, ''), username, password };
};

type OrcaEsRequest = (method: string, path: string, body?: object) => Promise<unknown>;

/** Requests to the ORCA cluster. Errors name the request, never the credential or a response. */
const createOrcaEsRequest =
  (url: string, authorization: string, request: typeof globalThis.fetch): OrcaEsRequest =>
  async (method, path, body) => {
    const deadline = timeoutSignal(30_000);
    try {
      const response = await request(`${url}${path}`, {
        method,
        headers: { Authorization: authorization, 'Content-Type': 'application/json' },
        ...(body ? { body: JSON.stringify(body) } : {}),
        signal: deadline,
      });
      assert(response.ok, `ORCA ${method} ${path} returned HTTP ${response.status}`);
      return response.json();
    } finally {
      deadline.dispose();
    }
  };

const countSchema = lazySchema(() => z.object({ count: z.number() }));
const apiKeySchema = lazySchema(() =>
  z.object({ id: z.string().min(1), encoded: z.string().min(1) })
);
const invalidationSchema = lazySchema(() =>
  z.object({
    invalidated_api_keys: z.array(z.string()),
    previously_invalidated_api_keys: z.array(z.string()),
  })
);

const messageOf = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

/**
 * Checks a cutoff key on every signal: nothing after the cutoff, something up to it, and for
 * `no-flags` no flag document.
 */
export const assertOrcaCutoffKey = async (
  request: OrcaEsRequest,
  cutoff: string,
  variant: OrcaTelemetryVariant
): Promise<void> => {
  await Promise.all(
    ORCA_INDEX_PATTERNS.map(async (index) => {
      const count = async (query?: object) =>
        countSchema.parse(await request('POST', `/${index}/_count`, query ? { query } : undefined))
          .count;
      const [after, visible, flags] = await Promise.all([
        count({ range: { '@timestamp': { gt: cutoff } } }),
        count(),
        variant === 'no-flags' ? count(ORCA_FLAG_DOCUMENTS_QUERY) : 0,
      ]);
      assert(after === 0, `ORCA key for ${cutoff} reads ${after} ${index} documents after it`);
      assert(visible > 0, `ORCA key for ${cutoff} reads no ${index} documents`);
      assert(flags === 0, `ORCA no-flags key for ${cutoff} reads ${flags} ${index} flag documents`);
    })
  );
};

type MintedKey =
  | { ok: true; cutoff: string; apiKey: string }
  | { ok: false; cutoff: string; error: unknown };

/** One read key per cutoff, and how to revoke them all. */
export interface OrcaCutoffKeys {
  apiKeys: ReadonlyMap<string, string>;
  invalidate: () => Promise<void>;
}

/**
 * Mints a short-lived document-level security key per cutoff as the eval user, and checks each
 * before any investigation starts. A reference key first proves the variant with the pinned counts.
 * Keys can only carry privileges when a user creates them, so the eval holds a user credential
 * rather than an API key. Each key expires after `expiresInMs`, the run's own timeout, so it
 * outlives the investigations that use it; `invalidate` revokes them all sooner.
 */
export const mintOrcaCutoffKeys = async ({
  credentials: { url, username, password },
  cutoffs,
  variant,
  expiresInMs,
  request = globalThis.fetch,
  concurrency = 8,
}: {
  credentials: OrcaEsCredentials;
  cutoffs: readonly string[];
  variant: OrcaTelemetryVariant;
  expiresInMs: number;
  request?: typeof globalThis.fetch;
  concurrency?: number;
}): Promise<OrcaCutoffKeys> => {
  const asEvalUser = createOrcaEsRequest(
    url,
    `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`,
    request
  );
  const run = randomBytes(4).toString('hex');
  const minted: string[] = [];
  // Elasticsearch answers 200 even when it could not invalidate some keys, so the response is
  // checked, and any key still active is kept for the next call and named by id (not a secret).
  const invalidate = async () => {
    if (minted.length === 0) return;
    const ids = minted.splice(0);
    const result = await asEvalUser('DELETE', '/_security/api_key', { ids, owner: true })
      .then((body) => invalidationSchema.parse(body))
      .catch((error: unknown) => {
        // A failed request revoked nothing we know of, so every key stays tracked for a retry.
        minted.push(...ids);
        throw error;
      });
    const revoked = new Set([
      ...result.invalidated_api_keys,
      ...result.previously_invalidated_api_keys,
    ]);
    const active = ids.filter((id) => !revoked.has(id));
    if (active.length === 0) return;
    minted.push(...active);
    throw new Error(
      `ORCA left ${active.length} of ${ids.length} keys active: ${active.join(', ')}`
    );
  };
  const mint = async (cutoff: string) => {
    const { id, encoded } = apiKeySchema.parse(
      await asEvalUser('POST', '/_security/api_key', {
        // A key can read its own record, so its name and metadata leave out the cutoff and variant.
        name: `nightshift-orcabench-eval-${orcaCutoffSuffix(cutoff, variant)}`,
        expiration: `${Math.ceil(expiresInMs / 60_000)}m`,
        role_descriptors: {
          orca_cutoff: {
            indices: [
              {
                names: ORCA_INDEX_PATTERNS,
                privileges: ['read', 'view_index_metadata'],
                query: orcaCutoffQuery(cutoff, variant),
              },
            ],
          },
        },
        metadata: { purpose: 'nightshift-orcabench-eval', run },
      })
    );
    minted.push(id);
    return encoded;
  };
  try {
    await assertOrcaSource({ url, apiKey: await mint(ORCA_REFERENCE_CUTOFF), variant }, request);
    // Every job settles before a failure is raised, so no key is minted after the cleanup below.
    const settled = await pMap(
      cutoffs,
      async (cutoff): Promise<MintedKey> => {
        try {
          const apiKey = await mint(cutoff);
          await assertOrcaCutoffKey(
            createOrcaEsRequest(url, `ApiKey ${apiKey}`, request),
            cutoff,
            variant
          );
          return { ok: true, cutoff, apiKey };
        } catch (error) {
          return { ok: false, cutoff, error };
        }
      },
      { concurrency }
    );
    const apiKeys = new Map<string, string>();
    for (const each of settled) {
      if (!each.ok) throw each.error;
      apiKeys.set(each.cutoff, each.apiKey);
    }
    return { apiKeys, invalidate };
  } catch (error) {
    await invalidateAfterFailure(invalidate, error);
    throw error;
  }
};

/** Invalidates after a failure; a cleanup failure is added to the original error, never replaces it. */
const invalidateAfterFailure = async (
  invalidate: () => Promise<void>,
  failure: unknown
): Promise<void> => {
  await invalidate().catch((invalidateError: unknown) => {
    throw new Error(`${messageOf(failure)}; ${messageOf(invalidateError)}`);
  });
};

/** Runs `work`, then invalidates the keys. A cleanup failure never hides the work's own error. */
export const withOrcaKeysInvalidated = async <T>(
  invalidate: () => Promise<void>,
  work: () => Promise<T>
): Promise<T> => {
  let result: T;
  try {
    result = await work();
  } catch (error) {
    await invalidateAfterFailure(invalidate, error);
    throw error;
  }
  await invalidate();
  return result;
};
