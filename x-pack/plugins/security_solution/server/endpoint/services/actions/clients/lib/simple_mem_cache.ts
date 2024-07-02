/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

export interface SimpleMemCacheInterface {
  /** Store a piece of data in cache */
  set(
    key: any,
    value: any,
    /** Time-to-live for this entry only (in seconds) */
    ttl?: number
  ): void;
  /** Retrieve a piece of data from cache */
  get<TValue = any>(key: any): TValue | undefined;
  /** Delete a piece of data from cache */
  delete(key: any): void;
  /** Clean up the cache by removing all expired entries */
  cleanup(): void;
}

export interface SimpleMemCacheOptions {
  /**
   * Default Time-to-live (in seconds) for each piece of data that is cached.
   * Defaults to `10` seconds. Can also be set on each entry explicitly
   */
  ttl?: number;
}

interface CachedEntry {
  value: any;
  expires: number;
}

/**
 * A simple memory caching mechanism. Entries are given a time-to-live (`ttl`) and deleted only when
 * attempted to be retrieved and entry is expired.
 *
 * > **NOTE**:  There is no automated "cache cleanup" to remove expired entries over time due to the
 * >            fact that it could lead to memory leaks. A `cleanup()` method, however, is provided
 * >            which can be called periodically to clean up the cache
 */
export class SimpleMemCache implements SimpleMemCacheInterface {
  private readonly ttl: number;
  private readonly cache = new Map<any, CachedEntry>();

  constructor({ ttl = 10 }: SimpleMemCacheOptions = {}) {
    this.ttl = ttl;
  }

  private isExpired(entry: CachedEntry): boolean {
    return entry.expires < Date.now();
  }

  public set(key: any, value: any, ttl = this.ttl): void {
    const expiresDt = new Date();
    expiresDt.setSeconds(expiresDt.getSeconds() + ttl);
    this.cache.set(key, { value, expires: expiresDt.getTime() });
  }

  public get<TValue = any>(key: any): TValue | undefined {
    const cachedValue = this.cache.get(key);

    if (cachedValue) {
      if (this.isExpired(cachedValue)) {
        this.delete(key);
        return;
      }

      return cachedValue.value as TValue;
    }
  }

  public delete(key: any): void {
    this.cache.delete(key);
  }

  public cleanup(): void {
    for (const [cacheKey, cacheData] of this.cache.entries()) {
      if (this.isExpired(cacheData)) {
        this.delete(cacheKey);
      }
    }
  }
}
