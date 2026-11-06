/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpHandler } from '@kbn/core/public';
import type { KbnClient } from '@kbn/scout';
import { countSpacesWith, ensureOrcaSpace, saveOrcaConnector, spaceBasePath } from './orca_spaces';

const notFound = () => Object.assign(new Error('Not Found'), { status: 404 });

const mockFetch = (existing: boolean) => {
  const fetch = jest.fn(async (_path: string, options?: { method?: string }) => {
    if (!options?.method && !existing) throw notFound();
    return {};
  });
  return fetch as unknown as HttpHandler & jest.Mock;
};

const connector = {
  basePath: '/s/orca-abc',
  connectorId: 'orcabench-es-abc',
  url: 'https://orca.example',
  apiKey: 'cutoff-key',
};

describe('ensureOrcaSpace', () => {
  it('creates a missing space and leaves an existing one', async () => {
    const missing = mockFetch(false);
    await ensureOrcaSpace(missing, 'orca-abc');
    expect(missing.mock.calls[1]).toEqual([
      '/api/spaces/space',
      { method: 'POST', body: JSON.stringify({ id: 'orca-abc', name: 'ORCA orca-abc' }) },
    ]);

    const existing = mockFetch(true);
    await ensureOrcaSpace(existing, 'orca-abc');
    expect(existing).toHaveBeenCalledTimes(1);
  });
});

describe('saveOrcaConnector', () => {
  // A fake kbnClient that answers the connector GET with `found`, and the write with `saved`.
  const mockKbnClient = (found: number, saved = { status: 200, data: '{}' }) => {
    const request = jest.fn(async ({ method }: { method: string }) =>
      method === 'GET' ? { status: found, data: '' } : saved
    );
    return { request } as unknown as Pick<KbnClient, 'request'> & { request: jest.Mock };
  };

  it("creates the space's Elasticsearch connector with the cutoff key", async () => {
    const kbnClient = mockKbnClient(404);

    await saveOrcaConnector(kbnClient, connector);

    const [{ path, method, body }] = kbnClient.request.mock.calls[1];
    expect([path, method]).toEqual(['/s/orca-abc/api/actions/connector/orcabench-es-abc', 'POST']);
    expect(body).toEqual({
      name: 'orcabench_es',
      connector_type_id: '.elasticsearch',
      config: { url: 'https://orca.example', selectedActions: ['_test'] },
      secrets: { authType: 'api_key_header', Authorization: 'ApiKey cutoff-key' },
    });
  });

  it("replaces an existing connector's key, so a rerun reads with this run's key", async () => {
    const kbnClient = mockKbnClient(200);

    await saveOrcaConnector(kbnClient, connector);

    const [{ method, body }] = kbnClient.request.mock.calls[1];
    expect(method).toBe('PUT');
    expect(body).not.toHaveProperty('connector_type_id');
    expect(body.secrets.Authorization).toBe('ApiKey cutoff-key');
  });

  it('takes every failure as a response, so the client never logs one, and redacts the key', async () => {
    const kbnClient = mockKbnClient(404, {
      status: 400,
      data: '{"Authorization":"ApiKey cutoff-key"} is invalid',
    });

    await expect(saveOrcaConnector(kbnClient, connector)).rejects.toThrow(
      'Saving ORCA connector orcabench-es-abc returned HTTP 400: {"Authorization":"ApiKey [redacted]"} is invalid'
    );
    for (const [{ ignoreErrors, retries }] of kbnClient.request.mock.calls) {
      expect(retries).toBe(0);
      expect(ignoreErrors).toEqual(
        expect.arrayContaining([400, 401, 403, 404, 409, 500, 502, 503])
      );
    }
  });

  it('stops before writing when the connector cannot be read', async () => {
    const kbnClient = mockKbnClient(500);

    await expect(saveOrcaConnector(kbnClient, connector)).rejects.toThrow(
      'Reading ORCA connector orcabench-es-abc returned HTTP 500'
    );
    expect(kbnClient.request).toHaveBeenCalledTimes(1);
  });
});

it('addresses a space by its base path', () => {
  expect(spaceBasePath('orca-abc')).toBe('/s/orca-abc');
});

it('counts the spaces earlier slices left on the stack together with this run’s', async () => {
  const fetch = jest
    .fn()
    .mockResolvedValue([{ id: 'default' }, { id: 'orca-old' }, { id: 'orca-abc' }]);

  await expect(
    countSpacesWith(fetch as unknown as HttpHandler, ['orca-abc', 'orca-new'])
  ).resolves.toBe(4);
  expect(fetch).toHaveBeenCalledWith('/api/spaces/space');
});
