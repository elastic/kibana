/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getFormattedNum } from './get_formatted_num';

const mockData: Array<{ value: number; expected: string }> = [
  {
    value: -1000000000,
    expected: '-1B',
  },
  {
    value: -1000,
    expected: '-1K',
  },
  {
    value: 0,
    expected: '0',
  },
  {
    value: 100,
    expected: '100',
  },
  {
    value: 1000,
    expected: '1K',
  },
  {
    value: 12345,
    expected: '12.3K',
  },
  {
    value: 123456,
    expected: '123.5K',
  },
  {
    value: 1234567,
    expected: '1.2M',
  },
  {
    value: 12345678,
    expected: '12.3M',
  },
  {
    value: 123456789,
    expected: '123.5M',
  },
  {
    value: 1234567890,
    expected: '1.2B',
  },
  {
    value: 1234567890000,
    expected: '1.2T',
  },
];

describe('getFormattedNum', () => {
  it('returns correct abbreviation', () => {
    // tests that the used properties for Intl.NumberFormat set in 'getFormattedNum' are correct
    const formattedResults = mockData.map(({ value }) => getFormattedNum(value));
    expect(formattedResults).toEqual(mockData.map(({ expected }) => expected));
  });
});
