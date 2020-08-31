/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { TestScheduler } from 'rxjs/testing';
import { httpServiceMock } from '../../../../../src/core/public/mocks';
import { GlobalSearchResult } from '../../common/types';
import { fetchServerResults } from './fetch_server_results';

const getTestScheduler = () =>
  new TestScheduler((actual, expected) => {
    expect(actual).toEqual(expected);
  });

const createResult = (id: string, parts: Partial<GlobalSearchResult> = {}): GlobalSearchResult => ({
  id,
  title: id,
  type: 'type',
  url: `/path/to/${id}`,
  score: 100,
  ...parts,
});

describe('fetchServerResults', () => {
  let http: ReturnType<typeof httpServiceMock.createStartContract>;

  beforeEach(() => {
    http = httpServiceMock.createStartContract();
  });

  it('perform a POST request to the endpoint with valid options', () => {
    http.post.mockResolvedValue({ results: [] });

    fetchServerResults(http, 'some term', { preference: 'pref' });

    expect(http.post).toHaveBeenCalledTimes(1);
    expect(http.post).toHaveBeenCalledWith('/internal/global_search/find', {
      body: JSON.stringify({ term: 'some term', options: { preference: 'pref' } }),
    });
  });

  it('returns the results from the server', async () => {
    const resultA = createResult('A');
    const resultB = createResult('B');

    http.post.mockResolvedValue({ results: [resultA, resultB] });

    const results = await fetchServerResults(http, 'some term', { preference: 'pref' }).toPromise();

    expect(http.post).toHaveBeenCalledTimes(1);
    expect(results).toHaveLength(2);
    expect(results[0]).toEqual(resultA);
    expect(results[1]).toEqual(resultB);
  });

  describe('returns an observable that', () => {
    // NOTE: test scheduler do not properly work with promises because of their asynchronous nature.
    // we are cheating here by having `http.post` return an observable instead of a promise.
    // this still allows more finely grained testing about timing, and asserting that the method
    // works properly when `post` returns a real promise is handled in other tests of this suite

    it('emits when the response is received', () => {
      getTestScheduler().run(({ expectObservable, hot }) => {
        http.post.mockReturnValue(hot('---(a|)', { a: { results: [] } }) as any);

        const results = fetchServerResults(http, 'term', {});

        expectObservable(results).toBe('---(a|)', {
          a: [],
        });
      });
    });

    it('completes without returning results if aborted$ emits before the response', () => {
      getTestScheduler().run(({ expectObservable, hot }) => {
        http.post.mockReturnValue(hot('---(a|)', { a: { results: [] } }) as any);
        const aborted$ = hot('-(a|)', { a: undefined });
        const results = fetchServerResults(http, 'term', { aborted$ });

        expectObservable(results).toBe('-|', {
          a: [],
        });
      });
    });
  });
});
