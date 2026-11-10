/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpHandler } from '@kbn/core/public';
import { CUSTOMER0_CUSTOM_CONTEXT, ORCA_CUSTOM_CONTEXT } from './custom_context';
import {
  ensureSandboxHosts,
  getDatasetSandboxHosts,
  GITHUB_SOURCE_HOSTS,
} from './sandbox_allowlist';

const fetchWith = (hosts: string[]) => {
  const fetch = jest.fn(async (path: string, options?: { method?: string }) =>
    options?.method === 'PUT' ? {} : { hosts }
  );
  return fetch as unknown as jest.Mock & HttpHandler;
};

describe('getDatasetSandboxHosts', () => {
  it('allows GitHub when the custom context points at public source code', () => {
    expect(getDatasetSandboxHosts(ORCA_CUSTOM_CONTEXT)).toEqual(GITHUB_SOURCE_HOSTS);
    expect(getDatasetSandboxHosts(CUSTOMER0_CUSTOM_CONTEXT)).toEqual(GITHUB_SOURCE_HOSTS);
  });

  it('allows nothing without custom context', () => {
    expect(getDatasetSandboxHosts([])).toEqual([]);
  });
});

describe('ensureSandboxHosts', () => {
  it('adds the missing hosts and keeps existing entries', async () => {
    const fetch = fetchWith(['example.com', 'github.com']);
    await ensureSandboxHosts(fetch, GITHUB_SOURCE_HOSTS);
    expect(fetch).toHaveBeenLastCalledWith('/internal/nightshift/sandbox_allowlist', {
      method: 'PUT',
      body: JSON.stringify({
        hosts: ['example.com', 'github.com', ...GITHUB_SOURCE_HOSTS.slice(1)],
      }),
    });
  });

  it('writes nothing when every host is already allowed', async () => {
    const fetch = fetchWith([...GITHUB_SOURCE_HOSTS]);
    await ensureSandboxHosts(fetch, GITHUB_SOURCE_HOSTS);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('does not read the allowlist when no host is needed', async () => {
    const fetch = fetchWith([]);
    await ensureSandboxHosts(fetch, []);
    expect(fetch).not.toHaveBeenCalled();
  });
});
