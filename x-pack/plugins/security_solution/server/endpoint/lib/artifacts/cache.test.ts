/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ExceptionsCache } from './cache';

describe('ExceptionsCache tests', () => {
  let cache: ExceptionsCache;
  const body = Buffer.from('body');

  beforeEach(() => {
    jest.clearAllMocks();
    cache = new ExceptionsCache(3);
  });

  test('it should cache', async () => {
    cache.set('test', body);
    const cacheResp = cache.get('test');
    expect(cacheResp).toEqual(body);
  });

  test('it should handle cache miss', async () => {
    cache.set('test', body);
    const cacheResp = cache.get('not test');
    expect(cacheResp).toEqual(undefined);
  });

  test('it should handle cache eviction', async () => {
    const a = Buffer.from('a');
    const b = Buffer.from('b');
    const c = Buffer.from('c');
    const d = Buffer.from('d');
    cache.set('1', a);
    cache.set('2', b);
    cache.set('3', c);
    const cacheResp = cache.get('1');
    expect(cacheResp).toEqual(a);

    cache.set('4', d);
    const secondResp = cache.get('1');
    expect(secondResp).toEqual(undefined);
    expect(cache.get('2')).toEqual(b);
    expect(cache.get('3')).toEqual(c);
    expect(cache.get('4')).toEqual(d);
  });
});
