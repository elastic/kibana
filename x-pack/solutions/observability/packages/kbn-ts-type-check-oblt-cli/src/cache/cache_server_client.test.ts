/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isCacheServerAvailable } from './cache_server_client';

describe('isCacheServerAvailable', () => {
  const originalFetch = globalThis.fetch;
  const originalUrl = process.env.TS_TYPE_CHECK_CACHE_SERVER_URL;

  beforeEach(() => {
    process.env.TS_TYPE_CHECK_CACHE_SERVER_URL = 'http://cache.example';
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    if (originalUrl === undefined) {
      delete process.env.TS_TYPE_CHECK_CACHE_SERVER_URL;
    } else {
      process.env.TS_TYPE_CHECK_CACHE_SERVER_URL = originalUrl;
    }
  });

  it('cancels the unread body once the headers arrive', async () => {
    const cancel = jest.fn().mockResolvedValue(undefined);
    globalThis.fetch = jest.fn().mockResolvedValue({ body: { cancel } }) as typeof fetch;

    await expect(isCacheServerAvailable()).resolves.toBe(true);
    expect(cancel).toHaveBeenCalledTimes(1);
  });

  it('returns false when the request fails', async () => {
    globalThis.fetch = jest.fn().mockRejectedValue(new Error('offline')) as typeof fetch;

    await expect(isCacheServerAvailable()).resolves.toBe(false);
  });
});
