/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isArrayOfPrimitives } from './is_array_of_primitives';

describe('is_array_of_primitives', () => {
  beforeAll(() => {
    jest.resetAllMocks();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  test('returns true when an empty array is passed in', () => {
    expect(isArrayOfPrimitives([])).toEqual(true);
  });

  test('returns true when an array of primitives are passed in', () => {
    expect(isArrayOfPrimitives([null, 2, 'string', 5, undefined])).toEqual(true);
  });

  /**
   * Simple table test of values of primitive arrays which should all pass
   */
  test.each([
    [[null]],
    [[1]],
    [['string']],
    [['string', null, 5, false, String('hi'), Boolean(true), undefined]],
  ])('returns true when a primitive array of %o is passed in', (arrayValue) => {
    expect(isArrayOfPrimitives(arrayValue)).toEqual(true);
  });

  /**
   * Simple table test of values of all objects which should not pass
   */
  test.each([
    [[{}]],
    [[{ a: 1 }]],
    [[1, {}]],
    [[[], 'string']],
    [['string', null, 5, false, String('hi'), {}, Boolean(true), undefined]],
  ])('returns false when the array of %o contains an object is passed in', (arrayValue) => {
    expect(isArrayOfPrimitives(arrayValue)).toEqual(false);
  });
});
