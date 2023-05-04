/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isNestedObject } from './is_nested_object';

describe('is_nested_object', () => {
  beforeAll(() => {
    jest.resetAllMocks();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  test('returns false when an empty array is passed in', () => {
    expect(isNestedObject([])).toEqual(false);
  });

  /**
   * Simple table test of values of primitive arrays which should all return false
   */
  test.each([
    [[1]],
    [['string']],
    [[true]],
    [[String('hi')]],
    [[Number(5)]],
    [[{ type: 'point' }]],
  ])('returns false when a primitive array of %o is passed in', (arrayValues) => {
    expect(isNestedObject(arrayValues)).toEqual(false);
  });

  /**
   * Simple table test of values of primitive arrays which should all return true
   */
  test.each([[[{}]], [[{ a: 'foo' }]]])(
    'returns false when a primitive array of %o is passed in',
    (arrayValues) => {
      expect(isNestedObject(arrayValues)).toEqual(true);
    }
  );
});
