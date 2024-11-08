/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { SimpleMemCache } from './simple_mem_cache';

describe('SimpleMemCache class', () => {
  let cache: SimpleMemCache;
  let key: any;
  let value: any;

  beforeAll(() => {
    jest.useFakeTimers();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  beforeEach(() => {
    cache = new SimpleMemCache();
    key = Symbol('foo');
    value = () => {};
  });

  it('should `set` and `get` a value to cache', () => {
    cache.set(key, value);

    expect(cache.get(key)).toEqual(value);
  });

  it('should accept strings as keys', () => {
    key = 'mykey';
    cache.set(key, value);

    expect(cache.get(key)).toEqual(value);
  });

  it('should delete a value from cache', () => {
    cache.set(key, value);

    expect(cache.get(key)).toEqual(value);

    cache.delete(key);

    expect(cache.get(key)).toEqual(undefined);
  });

  it('should delete all entries from cache', () => {
    cache.set(key, value);
    cache.deleteAll();

    expect(cache.get(key)).toEqual(undefined);
  });

  it('should cleanup expired cache entries', () => {
    const key2 = 'myKey';
    cache.set(key, value); // Default ttl of 10s
    cache.set(key2, value, 60); // ttl 60s
    const dateObj = new Date();
    dateObj.setSeconds(dateObj.getSeconds() + 11);
    jest.setSystemTime(dateObj);
    cache.cleanup();

    expect(cache.get(key)).toBeUndefined();
    expect(cache.get(key2)).toEqual(value);
  });

  it('should return undefined when a cache entry exists, but it is expired', () => {
    cache.set(key, value);
    const dateObj = new Date();
    dateObj.setSeconds(dateObj.getSeconds() + 11);
    jest.setSystemTime(dateObj);

    expect(cache.get(key)).toBeUndefined();
  });
});
