/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ExceptionsCache } from './cache';

describe('ExceptionsCache tests', () => {
  let cache: ExceptionsCache;

  beforeEach(() => {
    cache = new ExceptionsCache(100);
  });

  test('it should cache', async () => {
    cache.set('test', 'body');
    const cacheResp = cache.get('test');
    expect(cacheResp).toEqual('body');
  });

  test('it should handle cache miss', async () => {
    cache.set('test', 'body');
    const cacheResp = cache.get('not test');
    expect(cacheResp).toEqual(undefined);
  });

  test('it should handle cache clean', async () => {
    cache.set('test', 'body');
    const cacheResp = cache.get('test');
    expect(cacheResp).toEqual('body');

    // Clean will remove all entries from the cache that have not been called by `get` since the last time it was cleaned
    cache.clean();

    // Need to call clean again to simulate a ttl period has gone by without `test` being requested
    cache.clean();
    const cacheRespCleaned = cache.get('test');
    expect(cacheRespCleaned).toEqual(undefined);
  });
});
