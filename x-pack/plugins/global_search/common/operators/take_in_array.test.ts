/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { TestScheduler } from 'rxjs/testing';
import { takeInArray } from './take_in_array';

const getTestScheduler = () =>
  new TestScheduler((actual, expected) => {
    expect(actual).toEqual(expected);
  });

describe('takeInArray', () => {
  it('only emits a given `count` of items from an array observable', () => {
    getTestScheduler().run(({ expectObservable, hot }) => {
      const source = hot('a-b-c', { a: [1], b: [2], c: [3] });
      const expected = 'a-(b|)';

      expectObservable(source.pipe(takeInArray(2))).toBe(expected, {
        a: [1],
        b: [2],
      });
    });
  });

  it('completes if the source completes before reaching the given `count`', () => {
    getTestScheduler().run(({ expectObservable, hot }) => {
      const source = hot('a-b-c-|', { a: [1, 2], b: [3, 4], c: [5] });
      const expected = 'a-b-c-|';

      expectObservable(source.pipe(takeInArray(10))).toBe(expected, {
        a: [1, 2],
        b: [3, 4],
        c: [5],
      });
    });
  });

  it('split the emission if `count` is reached in a given emission', () => {
    getTestScheduler().run(({ expectObservable, hot }) => {
      const source = hot('a-b-c', { a: [1, 2, 3], b: [4, 5, 6], c: [7, 8] });
      const expected = 'a-(b|)';

      expectObservable(source.pipe(takeInArray(5))).toBe(expected, {
        a: [1, 2, 3],
        b: [4, 5],
      });
    });
  });

  it('throws when trying to take a negative number of items', () => {
    getTestScheduler().run(({ expectObservable, hot }) => {
      const source = hot('a-b-c', { a: [1, 2, 3], b: [4, 5, 6], c: [7, 8] });

      expect(() => {
        source.pipe(takeInArray(-4)).subscribe(() => undefined);
      }).toThrowErrorMatchingInlineSnapshot(`"Cannot take a negative number of items"`);
    });
  });
});
