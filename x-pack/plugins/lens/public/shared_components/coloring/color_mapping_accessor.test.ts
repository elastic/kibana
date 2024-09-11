/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getColorAccessorFn } from './color_mapping_accessor';

jest.mock('@kbn/coloring', () => ({
  ...jest.requireActual('@kbn/coloring'),
  getColorFactory: jest
    .fn()
    .mockReturnValue((v: string | number) => (v === '123' ? 'blue' : 'red')),
}));

describe('getColorAccessorFn', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const getColorAccessor = getColorAccessorFn('{}', {} as any, false);

  it('should return null for null values', () => {
    expect(getColorAccessor(null)).toBe(null);
  });

  it('should return null for undefined values', () => {
    expect(getColorAccessor(undefined)).toBe(null);
  });

  it('should return stringified value for numbers', () => {
    expect(getColorAccessor(123)).toBe('blue');
  });

  it('should return color for string values', () => {
    expect(getColorAccessor('testing')).toBe('red');
  });
});
