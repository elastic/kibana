/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Observable, ReplaySubject, Subscription } from 'rxjs';
import { IKibanaSearchResponse, isErrorResponse } from '../../../../../src/plugins/data/public';

interface ResponseCacheItem {
  response: ReplaySubject<IKibanaSearchResponse<any>>;
  size: number;
  subs: Subscription;
}

export const CACHE_MAX_SIZE_MB = 10;

export class SearchResponseCache {
  private responseCache: Map<string, ResponseCacheItem>;
  private cacheSize = 0;

  constructor(private maxItems: number, private maxCacheSizeMB: number) {
    this.responseCache = new Map();
  }

  private byteToMb(size: number) {
    return size / (1024 * 1024);
  }

  private deleteItem(key: string, clearSubs = true) {
    const item = this.responseCache.get(key);
    if (item) {
      if (clearSubs) {
        item.subs.unsubscribe();
      }
      this.cacheSize -= item.size;
      this.responseCache.delete(key);
    }
  }

  private setItem(key: string, item: ResponseCacheItem) {
    // The deletion of the key will move it to the end of the Map's entries.
    this.deleteItem(key, false);
    this.cacheSize += item.size;
    this.responseCache.set(key, item);
  }

  public clear() {
    this.cacheSize = 0;
    this.responseCache.forEach((item) => {
      item.subs.unsubscribe();
    });
    this.responseCache.clear();
  }

  private shrink() {
    while (
      this.responseCache.size > this.maxItems ||
      this.byteToMb(this.cacheSize) > this.maxCacheSizeMB
    ) {
      const [key] = this.responseCache.entries().next().value as [string, ResponseCacheItem];
      this.deleteItem(key);
    }
  }

  /**
   *
   * @param key key to cache
   * @param response$
   * @returns A ReplaySubject that mimics the behavior of the original observable
   * @throws error if key already exists
   */
  public set(key: string, response$: Observable<IKibanaSearchResponse<any>>) {
    if (this.responseCache.has(key)) {
      throw new Error('duplicate key');
    }

    const responseReplay$ = new ReplaySubject<IKibanaSearchResponse<any>>(1);
    const item = {
      response: responseReplay$,
      subs: new Subscription(),
      size: 0,
    };

    this.setItem(key, item);

    item.subs.add(
      response$.subscribe({
        next: (r) => {
          const newSize = JSON.stringify(r).length;

          if (this.byteToMb(newSize) < this.maxCacheSizeMB && !isErrorResponse(r)) {
            this.setItem(key, {
              ...item,
              size: newSize,
            });
            this.shrink();
          } else {
            // Single item is too large to be cached, or an error response returned.
            // Evict and ignore.
            this.deleteItem(key);
          }
        },
        error: () => {
          // Evict item on error
          this.deleteItem(key);
        },
      })
    );
    item.subs.add(response$.subscribe({
      next: r => responseReplay$.next(r),
      error: e => responseReplay$.error(e),
    }));
    this.shrink();
    return responseReplay$;
  }

  public get(key: string) {
    const item = this.responseCache.get(key);
    if (item) {
      // touch the item, and move it to the end of the map's entries
      this.setItem(key, item);
      return item?.response;
    }
  }
}
