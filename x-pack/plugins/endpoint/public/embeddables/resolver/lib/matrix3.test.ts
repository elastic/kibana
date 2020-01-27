/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { multiply } from './matrix3';
describe('matrix3', () => {
  it('can multiply two matrix3s', () => {
    expect(multiply([1, 2, 3, 4, 5, 6, 7, 8, 9], [10, 11, 12, 13, 14, 15, 16, 17, 18])).toEqual([
      84,
      90,
      96,
      201,
      216,
      231,
      318,
      342,
      366,
    ]);
  });
});
