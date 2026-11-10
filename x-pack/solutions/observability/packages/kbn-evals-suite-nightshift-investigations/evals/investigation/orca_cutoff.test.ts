/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ORCA_FLAG_DOCUMENTS_QUERY,
  ORCA_REFERENCE_CUTOFF,
  getOrcaCutoff,
  getOrcaCutoffs,
  orcaCutoffKeyName,
  mintOrcaCutoffKeys,
  orcaCutoffQuery,
  resolveOrcaEsCredentials,
  withOrcaKeysInvalidated,
} from './orca_cutoff';
import type { OrcaTelemetryVariant } from './orca_dataset';

const task = (caseId: string, metadata: Record<string, string> = {}) => ({
  metadata: {
    case_id: caseId,
    current_time: '2026-04-19T16:22:00Z',
    telemetry_snapshot_time: '2026-04-19T16:27:11Z',
    ...metadata,
  },
});

describe('getOrcaCutoff', () => {
  it('bounds a task at its recorded snapshot, to the millisecond', () => {
    expect(getOrcaCutoff(task('a', { telemetry_snapshot_time: '2026-04-24T19:25:42Z' }))).toBe(
      '2026-04-24T19:25:42.000Z'
    );
  });
  it('rejects a task without a parseable snapshot rather than guess one from its current time', () => {
    expect(() => getOrcaCutoff(task('a', { telemetry_snapshot_time: 'soon' }))).toThrow(
      'ORCA case a has no parseable telemetry_snapshot_time'
    );
    expect(() =>
      getOrcaCutoff({ metadata: { case_id: 'b', current_time: '2026-04-19T16:22:00Z' } })
    ).toThrow('ORCA case b has no parseable telemetry_snapshot_time');
  });
});

describe('getOrcaCutoffs', () => {
  it('lists each cutoff once, in cutoff order', () => {
    const tasks = [
      task('late', { telemetry_snapshot_time: '2026-04-24T19:25:42Z' }),
      task('early-1'),
      task('early-2', { telemetry_snapshot_time: '2026-04-19T16:27:11.000Z' }),
    ];
    expect(getOrcaCutoffs(tasks)).toEqual(['2026-04-19T16:27:11.000Z', '2026-04-24T19:25:42.000Z']);
  });
});

describe('orcaCutoffKeyName', () => {
  it('names a key by a stable hash that shows neither the snapshot time nor the variant', () => {
    const name = orcaCutoffKeyName('2026-04-19T16:27:11.000Z', 'no-flags');
    expect(name).toMatch(/^nightshift-orcabench-eval-[0-9a-f]{12}$/);
    expect(name).toBe(orcaCutoffKeyName('2026-04-19T16:27:11.000Z', 'no-flags'));
    expect(name).not.toBe(orcaCutoffKeyName('2026-04-19T16:27:11.000Z', 'full'));
    expect(name).not.toMatch(/2026|1627|flags/);
  });
});

describe('orcaCutoffQuery', () => {
  it('filters on @timestamp up to the cutoff, and also hides flag documents for no-flags', () => {
    const range = { range: { '@timestamp': { lte: '2026-04-19T16:27:00.000Z' } } };
    expect(orcaCutoffQuery('2026-04-19T16:27:00.000Z', 'full')).toEqual(range);
    expect(orcaCutoffQuery('2026-04-19T16:27:00.000Z', 'no-flags')).toEqual({
      bool: { filter: [range], must_not: [ORCA_FLAG_DOCUMENTS_QUERY] },
    });
  });
});

describe('resolveOrcaEsCredentials', () => {
  const env = {
    NIGHTSHIFT_CONNECTOR_SET: 'orcabench',
    NIGHTSHIFT_ORCA_ES_URL: 'https://orca.example/',
    NIGHTSHIFT_ORCA_ES_USERNAME: 'nightshift-orcabench-eval',
    NIGHTSHIFT_ORCA_ES_PASSWORD: 'password',
  };
  it('reads the eval user the Scout hook exported', () => {
    expect(resolveOrcaEsCredentials(env)).toEqual({
      url: 'https://orca.example',
      username: 'nightshift-orcabench-eval',
      password: 'password',
    });
  });
  it.each(['NIGHTSHIFT_ORCA_ES_PASSWORD', 'NIGHTSHIFT_ORCA_ES_URL', 'NIGHTSHIFT_CONNECTOR_SET'])(
    'requires the orcabench Scout server, not just %s',
    (name) => {
      expect(() => resolveOrcaEsCredentials({ ...env, [name]: '' })).toThrow(
        'ORCA requires a Scout server started with the orcabench connector set'
      );
    }
  );
});

/**
 * An ORCA cluster that mints keys for the eval user and answers each key's reads. `seenAfter` and
 * `flagDocuments` are what a key's counts return for reads past its cutoff (only `leakingCutoff`'s,
 * when set) and for flag documents. `slowKeys` answer their creation late, and `stuckKeys` survive
 * their first invalidation.
 */
const fakeOrca = ({
  seenAfter = 0,
  leakingCutoff,
  flagDocuments = 0,
  variant = 'full',
  slowKeys = [],
  stuckKeys = [],
  failInvalidations = 0,
}: {
  seenAfter?: number;
  leakingCutoff?: string;
  flagDocuments?: number;
  variant?: OrcaTelemetryVariant;
  slowKeys?: string[];
  stuckKeys?: string[];
  failInvalidations?: number;
} = {}) => {
  const stuck = new Set(stuckKeys);
  let invalidationFailures = failInvalidations;
  const minted: Array<{
    id: string;
    body: { name: string; role_descriptors: unknown; metadata: unknown };
  }> = [];
  const invalidated: unknown[] = [];
  const pinned =
    variant === 'full'
      ? { logs: 14268, traces: 11864, metrics: 117594 }
      : { logs: 13182, traces: 11136, metrics: 115056 };
  const request = jest.fn(async (input: string | URL | Request, init?: RequestInit) => {
    const { pathname } = new URL(String(input));
    const body = init?.body ? JSON.parse(String(init.body)) : undefined;
    const authorization = (init?.headers as Record<string, string>).Authorization;
    if (pathname === '/_security/api_key' && init?.method === 'POST') {
      expect(authorization).toBe(`Basic ${Buffer.from('eval:password').toString('base64')}`);
      const id = `key-${minted.length + 1}`;
      minted.push({ id, body });
      if (slowKeys.includes(id)) await new Promise((resolve) => setTimeout(resolve, 20));
      return new Response(JSON.stringify({ id, encoded: `encoded-${id}` }));
    }
    if (pathname === '/_security/api_key' && init?.method === 'DELETE') {
      invalidated.push(body);
      if (invalidationFailures > 0) {
        invalidationFailures--;
        return new Response('', { status: 503 });
      }
      const ids: string[] = body.ids;
      const kept = ids.filter((id) => stuck.has(id));
      kept.forEach((id) => stuck.delete(id));
      return new Response(
        JSON.stringify({
          invalidated_api_keys: ids.filter((id) => !kept.includes(id)),
          previously_invalidated_api_keys: [],
          error_count: kept.length,
        })
      );
    }
    expect(authorization).toMatch(/^ApiKey encoded-key-\d+$/);
    if (pathname === '/_query') {
      const signal = body.query.split(/[ -]/)[1] as keyof typeof pinned;
      return new Response(JSON.stringify({ values: [[pinned[signal]]] }));
    }
    const leaks = !leakingCutoff || body?.query.range?.['@timestamp'].gt === leakingCutoff;
    const count = !body ? 10 : body.query.range ? (leaks ? seenAfter : 0) : flagDocuments;
    return new Response(JSON.stringify({ count }));
  });
  return { request, minted, invalidated };
};

describe('mintOrcaCutoffKeys', () => {
  const credentials = { url: 'https://orca.example', username: 'eval', password: 'password' };
  const cutoffs = ['2026-04-19T16:27:00.000Z', '2026-04-24T19:25:42.000Z'];
  // Longer than a day, as a half of the 755 can run.
  const expiresInMs = 26 * 3_600_000 + 1;

  it('mints a checked DLS key per cutoff as the eval user, after a reference key proves the variant', async () => {
    const orca = fakeOrca({ variant: 'no-flags' });

    const { apiKeys, invalidate } = await mintOrcaCutoffKeys({
      credentials,
      expiresInMs,
      cutoffs,
      variant: 'no-flags',
      request: orca.request,
      concurrency: 1,
    });

    expect([...apiKeys.entries()]).toEqual([
      [cutoffs[0], 'encoded-key-2'],
      [cutoffs[1], 'encoded-key-3'],
    ]);
    expect(orca.minted.map(({ body }) => body.name)).toEqual(
      [ORCA_REFERENCE_CUTOFF, ...cutoffs].map((cutoff) => orcaCutoffKeyName(cutoff, 'no-flags'))
    );
    expect(orca.minted.map(({ body }) => body.metadata)).toEqual(
      Array(3).fill({ purpose: 'nightshift-orcabench-eval', run: expect.any(String) })
    );
    expect(orca.minted[1].body.role_descriptors).toEqual({
      orca_cutoff: {
        indices: [
          {
            names: ['logs-orcabench.otel-*', 'traces-orcabench.otel-*', 'metrics-orcabench.otel-*'],
            privileges: ['read', 'view_index_metadata'],
            query: orcaCutoffQuery(cutoffs[0], 'no-flags'),
          },
        ],
      },
    });
    expect(orca.minted.map(({ body }) => body)).toEqual(
      // Outlives the run's own timeout, rounded up to the minute.
      orca.minted.map(() => expect.objectContaining({ expiration: '1561m' }))
    );
    // Each cutoff key is checked on every signal: after the cutoff, up to it, and flag documents.
    const counts = orca.request.mock.calls.filter(([url]) => String(url).endsWith('/_count'));
    expect(counts).toHaveLength(cutoffs.length * 3 * 3);

    await invalidate();
    expect(orca.invalidated).toEqual([{ ids: ['key-1', 'key-2', 'key-3'], owner: true }]);
  });

  it('refuses a key that reads past its cutoff and revokes every key, including one still being minted', async () => {
    // The first cutoff's key fails its check while the second cutoff's key is still being created.
    const orca = fakeOrca({ seenAfter: 3, leakingCutoff: cutoffs[0], slowKeys: ['key-3'] });

    const minting = mintOrcaCutoffKeys({
      credentials,
      expiresInMs,
      cutoffs,
      variant: 'full',
      request: orca.request,
    });

    await expect(minting).rejects.toThrow(
      `ORCA key for ${cutoffs[0]} reads 3 logs-orcabench.otel-* documents after it`
    );
    await expect(minting).rejects.not.toThrow(/encoded-key/);
    expect(orca.invalidated).toEqual([
      { ids: expect.arrayContaining(['key-1', 'key-2', 'key-3']), owner: true },
    ]);
  });

  it('keeps every key when the invalidation request itself fails, and revokes them on retry', async () => {
    const orca = fakeOrca({ failInvalidations: 1 });
    const { invalidate } = await mintOrcaCutoffKeys({
      credentials,
      expiresInMs,
      cutoffs,
      variant: 'full',
      request: orca.request,
    });

    await expect(invalidate()).rejects.toThrow('ORCA DELETE /_security/api_key returned HTTP 503');
    await expect(invalidate()).resolves.toBeUndefined();
    expect(orca.invalidated).toEqual([
      { ids: ['key-1', 'key-2', 'key-3'], owner: true },
      { ids: ['key-1', 'key-2', 'key-3'], owner: true },
    ]);
  });

  it('keeps keys Elasticsearch did not invalidate, names them, and revokes them on the next call', async () => {
    const orca = fakeOrca({ stuckKeys: ['key-2'] });
    const { invalidate } = await mintOrcaCutoffKeys({
      credentials,
      expiresInMs,
      cutoffs,
      variant: 'full',
      request: orca.request,
    });

    await expect(invalidate()).rejects.toThrow('ORCA left 1 of 3 keys active: key-2');
    await expect(invalidate()).resolves.toBeUndefined();
    expect(orca.invalidated.at(-1)).toEqual({ ids: ['key-2'], owner: true });
    await expect(invalidate()).resolves.toBeUndefined();
    expect(orca.invalidated).toHaveLength(2);
  });

  it('refuses a no-flags key that still reads flag documents', async () => {
    const orca = fakeOrca({ variant: 'no-flags', flagDocuments: 2 });

    await expect(
      mintOrcaCutoffKeys({
        credentials,
        expiresInMs,
        cutoffs,
        variant: 'no-flags',
        request: orca.request,
      })
    ).rejects.toThrow(/no-flags key for .* reads 2 .* flag documents/);
  });

  it('refuses keys whose variant the pinned counts do not prove', async () => {
    const orca = fakeOrca({ variant: 'full' });

    await expect(
      mintOrcaCutoffKeys({
        credentials,
        expiresInMs,
        cutoffs,
        variant: 'no-flags',
        request: orca.request,
      })
    ).rejects.toThrow('pinned no-flags snapshot');
    expect(orca.minted).toHaveLength(1);
    expect(orca.invalidated).toEqual([{ ids: ['key-1'], owner: true }]);
  });
});

describe('withOrcaKeysInvalidated', () => {
  it('invalidates after the work and returns its result', async () => {
    const invalidate = jest.fn().mockResolvedValue(undefined);
    await expect(withOrcaKeysInvalidated(invalidate, async () => 'done')).resolves.toBe('done');
    expect(invalidate).toHaveBeenCalledTimes(1);
  });

  it("rethrows the work's own error after invalidating", async () => {
    const failure = new Error('setup broke');
    const invalidate = jest.fn().mockResolvedValue(undefined);
    await expect(
      withOrcaKeysInvalidated(invalidate, async () => {
        throw failure;
      })
    ).rejects.toBe(failure);
    expect(invalidate).toHaveBeenCalledTimes(1);
  });

  it('keeps the reason the run broke when invalidation also fails', async () => {
    const invalidate = jest
      .fn()
      .mockRejectedValue(new Error('ORCA left 1 of 3 keys active: key-2'));
    await expect(
      withOrcaKeysInvalidated(invalidate, async () => {
        throw new Error('setup broke');
      })
    ).rejects.toThrow('setup broke; ORCA left 1 of 3 keys active: key-2');
  });

  it('reports an invalidation failure after successful work', async () => {
    const invalidate = jest
      .fn()
      .mockRejectedValue(new Error('ORCA left 1 of 3 keys active: key-2'));
    await expect(withOrcaKeysInvalidated(invalidate, async () => 'done')).rejects.toThrow(
      'ORCA left 1 of 3 keys active: key-2'
    );
  });
});
