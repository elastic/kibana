/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpHandler } from '@kbn/core/public';
import { ensureOrcaSpace, saveOrcaConnector, spaceBasePath } from './orca_spaces';

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
  it("creates the space's Elasticsearch connector with the cutoff key", async () => {
    const fetch = mockFetch(false);

    await saveOrcaConnector(fetch, connector);

    const [path, { method, body }] = fetch.mock.calls[1];
    expect([path, method]).toEqual(['/s/orca-abc/api/actions/connector/orcabench-es-abc', 'POST']);
    expect(JSON.parse(body)).toEqual({
      name: 'orcabench_es',
      connector_type_id: '.elasticsearch',
      config: { url: 'https://orca.example', selectedActions: ['_test'] },
      secrets: { authType: 'api_key_header', Authorization: 'ApiKey cutoff-key' },
    });
  });

  it("replaces an existing connector's key, so a rerun reads with this run's key", async () => {
    const fetch = mockFetch(true);

    await saveOrcaConnector(fetch, connector);

    const [, { method, body }] = fetch.mock.calls[1];
    expect(method).toBe('PUT');
    expect(JSON.parse(body)).not.toHaveProperty('connector_type_id');
    expect(JSON.parse(body).secrets.Authorization).toBe('ApiKey cutoff-key');
  });

  it('redacts the key from a failure', async () => {
    const fetch = jest
      .fn()
      .mockRejectedValueOnce(notFound())
      .mockRejectedValueOnce(new Error('400 -- {"Authorization":"ApiKey cutoff-key"} is invalid'));

    await expect(saveOrcaConnector(fetch as unknown as HttpHandler, connector)).rejects.toThrow(
      'Saving ORCA connector orcabench-es-abc failed: 400 -- {"Authorization":"ApiKey [redacted]"} is invalid'
    );
  });
});

it('addresses a space by its base path', () => {
  expect(spaceBasePath('orca-abc')).toBe('/s/orca-abc');
});
