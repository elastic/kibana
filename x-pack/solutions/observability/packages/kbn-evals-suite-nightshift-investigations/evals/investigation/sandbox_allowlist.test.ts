/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpHandler } from '@kbn/core/public';
import {
  SANDBOX_ALLOWLIST_API_PATH,
  validateSandboxAllowlist,
} from '@kbn/nightshift-investigations-plugin/common';
import {
  CUSTOMER0_SANDBOX_ALLOWLIST,
  getDatasetSandboxAllowlist,
  ORCA_SANDBOX_ALLOWLIST,
  replaceSandboxAllowlist,
} from './sandbox_allowlist';

describe('sandbox allowlists', () => {
  it.each([
    ['ORCA', ORCA_SANDBOX_ALLOWLIST],
    ['Customer-0', CUSTOMER0_SANDBOX_ALLOWLIST],
  ])('stores the %s rules unchanged, as the route would', (_name, rules) => {
    expect(validateSandboxAllowlist([...rules])).toEqual({ hosts: rules, errors: [] });
  });

  it('allows only git smart HTTP to the demo repository', () => {
    expect(ORCA_SANDBOX_ALLOWLIST).toEqual([
      'allow https github.com GET /open-telemetry/opentelemetry-demo/info/refs',
      'allow https github.com POST /open-telemetry/opentelemetry-demo/git-upload-pack',
      'allow https github.com GET /open-telemetry/opentelemetry-demo.git/info/refs',
      'allow https github.com POST /open-telemetry/opentelemetry-demo.git/git-upload-pack',
    ]);
  });

  it('picks the rules for the dataset whose custom context points at those repositories', () => {
    expect(getDatasetSandboxAllowlist({ name: 'nightshift/orca-sampled50-v4' })).toBe(
      ORCA_SANDBOX_ALLOWLIST
    );
    expect(
      getDatasetSandboxAllowlist({ name: 'ns-investigation-golden-2710', tags: ['customer0'] })
    ).toBe(CUSTOMER0_SANDBOX_ALLOWLIST);
    expect(getDatasetSandboxAllowlist({ name: 'nightshift/synthetic' })).toEqual([]);
  });
});

describe('replaceSandboxAllowlist', () => {
  it('writes the rules', async () => {
    const fetch = jest.fn().mockResolvedValue({ hosts: [] });
    await replaceSandboxAllowlist(fetch as unknown as HttpHandler, ORCA_SANDBOX_ALLOWLIST);
    expect(fetch).toHaveBeenCalledWith(SANDBOX_ALLOWLIST_API_PATH, {
      method: 'PUT',
      body: JSON.stringify({ hosts: ORCA_SANDBOX_ALLOWLIST }),
    });
  });

  it('clears stored rules, and writes nothing when there are none to clear', async () => {
    const stored = jest.fn().mockResolvedValue({ hosts: ['github.com'] });
    await replaceSandboxAllowlist(stored as unknown as HttpHandler, []);
    expect(stored).toHaveBeenLastCalledWith(SANDBOX_ALLOWLIST_API_PATH, {
      method: 'PUT',
      body: JSON.stringify({ hosts: [] }),
    });

    const empty = jest.fn().mockResolvedValue({ hosts: [] });
    await replaceSandboxAllowlist(empty as unknown as HttpHandler, []);
    expect(empty).toHaveBeenCalledTimes(1);
    expect(empty).toHaveBeenCalledWith(SANDBOX_ALLOWLIST_API_PATH);
  });
});
