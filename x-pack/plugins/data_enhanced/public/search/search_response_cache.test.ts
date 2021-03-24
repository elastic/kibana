/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { interval, of, ReplaySubject } from 'rxjs';
import { switchMap, take } from 'rxjs/operators';
import { IKibanaSearchResponse } from 'src/plugins/data/public';
import { SearchResponseCache } from './search_response_cache';

describe('', () => {
  let cache: SearchResponseCache;

  const r: Array<IKibanaSearchResponse<any>> = [
    {
      isPartial: true,
      isRunning: true,
      rawResponse: {
        t: 1,
      },
    },
    {
      isPartial: true,
      isRunning: true,
      rawResponse: {
        t: 2,
      },
    },
    {
      isPartial: true,
      isRunning: true,
      rawResponse: {
        t: 3,
      },
    },
    {
      isPartial: false,
      isRunning: false,
      rawResponse: {
        t: 4,
      },
    },
  ];

  function getSearchObservable$(responses: Array<IKibanaSearchResponse<any>> = r) {
    return interval(100).pipe(
      take(responses.length),
      switchMap((value: number, i: number) => {
        return of(responses[i]);
      })
    );
  }

  beforeEach(() => {
    cache = new SearchResponseCache(3, 0.1);
  });

  describe('Cache eviction', () => {
    test('clear evicts all', () => {
      const finalResult = r[r.length - 1];
      cache.set('123', of(finalResult));
      cache.set('234', of(finalResult));

      cache.clear();

      expect(cache.get('123')).toBeUndefined();
      expect(cache.get('234')).toBeUndefined();
    });

    test('evicts oldest item if has too many cached items', async () => {
      const finalResult = r[r.length - 1];
      cache.set('123', of(finalResult));
      cache.set('234', of(finalResult));
      cache.set('345', of(finalResult));
      cache.set('456', of(finalResult));

      expect(cache.get('123')).toBeUndefined();
      expect(cache.get('234')).not.toBeUndefined();
      expect(cache.get('345')).not.toBeUndefined();
      expect(cache.get('456')).not.toBeUndefined();
    });

    test('evicts oldest item if cache gets bigger than max size', async () => {
      const largeResult$ = getSearchObservable$([
        {
          isPartial: true,
          isRunning: true,
          rawResponse: {
            t: 'a'.repeat(1000),
          },
        },
        {
          isPartial: false,
          isRunning: false,
          rawResponse: {
            t: 'a'.repeat(50000),
          },
        },
      ]);

      cache.set('123', largeResult$);
      cache.set('234', largeResult$);
      cache.set('345', largeResult$);

      await largeResult$.toPromise();

      expect(cache.get('123')).toBeUndefined();
      expect(cache.get('234')).not.toBeUndefined();
      expect(cache.get('345')).not.toBeUndefined();
    });

    test('evicts from cache any single item that gets bigger than max size', async () => {
      const largeResult$ = getSearchObservable$([
        {
          isPartial: true,
          isRunning: true,
          rawResponse: {
            t: 'a'.repeat(500),
          },
        },
        {
          isPartial: false,
          isRunning: false,
          rawResponse: {
            t: 'a'.repeat(500000),
          },
        },
      ]);

      cache.set('234', largeResult$);
      await largeResult$.toPromise();
      expect(cache.get('234')).toBeUndefined();
    });

    test('get updates the insertion time of an item', async () => {
      const finalResult = r[r.length - 1];
      cache.set('123', of(finalResult));
      cache.set('234', of(finalResult));
      cache.set('345', of(finalResult));

      cache.get('123');
      cache.get('234');

      cache.set('456', of(finalResult));

      expect(cache.get('123')).not.toBeUndefined();
      expect(cache.get('234')).not.toBeUndefined();
      expect(cache.get('345')).toBeUndefined();
      expect(cache.get('456')).not.toBeUndefined();
    });
  });

  describe('Observable behavior', () => {
    test('caches a response and re-emits it', async () => {
      const s$ = getSearchObservable$();
      cache.set('123', s$);
      expect(await cache.get('123')!.toPromise()).toBe(r[r.length - 1]);
    });

    test('cached$ should emit same as original search$', async () => {
      const s$ = getSearchObservable$();
      cache.set('123', s$);

      const next = jest.fn();
      const cached$ = cache.get('123');

      cached$!.subscribe({
        next,
      });

      // wait for original search to complete
      await s$!.toPromise();

      // get final response from cached$
      const finalRes = await cached$!.toPromise();
      expect(finalRes).toBe(r[r.length - 1]);
      expect(next).toHaveBeenCalledTimes(4);
    });

    test('cached$ should emit only current value and keep emitting if subscribed while search$ is running', async () => {
      const s$ = getSearchObservable$();
      cache.set('123', s$);

      const next = jest.fn();
      let cached$: ReplaySubject<IKibanaSearchResponse<any>> | undefined;
      s$.subscribe({
        next: (res) => {
          if (res.rawResponse.t === 3) {
            cached$ = cache.get('123');
            cached$!.subscribe({
              next,
            });
          }
        },
      });

      // wait for original search to complete
      await s$!.toPromise();

      const finalRes = await cached$!.toPromise();

      expect(finalRes).toBe(r[r.length - 1]);
      expect(next).toHaveBeenCalledTimes(2);
    });

    test('cached$ should emit only last value if subscribed after search$ was complete 1', async () => {
      const finalResult = r[r.length - 1];
      const s$ = of(finalResult);
      cache.set('123', s$);

      // wait for original search to complete
      await s$!.toPromise();

      const next = jest.fn();
      const cached$ = cache.get('123');
      cached$!.subscribe({
        next,
      });

      const finalRes = await cached$!.toPromise();

      expect(finalRes).toBe(r[r.length - 1]);
      expect(next).toHaveBeenCalledTimes(1);
    });

    test('cached$ should emit only last value if subscribed after search$ was complete', async () => {
      const s$ = getSearchObservable$();
      cache.set('123', s$);

      // wait for original search to complete
      await s$!.toPromise();

      const next = jest.fn();
      const cached$ = cache.get('123');
      cached$!.subscribe({
        next,
      });

      const finalRes = await cached$!.toPromise();

      expect(finalRes).toBe(r[r.length - 1]);
      expect(next).toHaveBeenCalledTimes(1);
    });
  });
});
