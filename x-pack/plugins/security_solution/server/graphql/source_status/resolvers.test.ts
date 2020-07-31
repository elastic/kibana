/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { filterIndexes } from './resolvers';

describe('resolvers', () => {
  test('it should filter single index that has an empty string', () => {
    const emptyArray = filterIndexes(['']);
    expect(emptyArray).toEqual([]);
  });

  test('it should filter single index that has blanks within it', () => {
    const emptyArray = filterIndexes(['   ']);
    expect(emptyArray).toEqual([]);
  });

  test('it should filter indexes that has an empty string and a valid index', () => {
    const emptyArray = filterIndexes(['', 'valid-index']);
    expect(emptyArray).toEqual(['valid-index']);
  });

  test('it should filter indexes that have blanks within them and a valid index', () => {
    const emptyArray = filterIndexes(['   ', 'valid-index']);
    expect(emptyArray).toEqual(['valid-index']);
  });

  test('it should filter single index that has _all within it', () => {
    const emptyArray = filterIndexes(['_all']);
    expect(emptyArray).toEqual([]);
  });

  test('it should filter single index that has _all within it surrounded by spaces', () => {
    const emptyArray = filterIndexes(['  _all  ']);
    expect(emptyArray).toEqual([]);
  });

  test('it should filter indexes that _all within them and a valid index', () => {
    const emptyArray = filterIndexes(['_all', 'valid-index']);
    expect(emptyArray).toEqual(['valid-index']);
  });

  test('it should filter indexes that _all surrounded with spaces within them and a valid index', () => {
    const emptyArray = filterIndexes(['  _all   ', 'valid-index']);
    expect(emptyArray).toEqual(['valid-index']);
  });
});
