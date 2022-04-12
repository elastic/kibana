/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { dataOrDash } from './data_or_dash';

const TEST_STRING = '123';
const TEST_NUMBER = 123;
const DASH = '-';

describe('dataOrDash(data)', () => {
  it('works for a valid string', () => {
    expect(dataOrDash(TEST_STRING)).toEqual(TEST_STRING);
  });
  it('works for a valid number', () => {
    expect(dataOrDash(TEST_NUMBER)).toEqual(TEST_NUMBER);
  });
  it('returns dash for undefined', () => {
    expect(dataOrDash(undefined)).toEqual(DASH);
  });
  it('returns dash for empty string', () => {
    expect(dataOrDash('')).toEqual(DASH);
  });
  it('returns dash for NaN', () => {
    expect(dataOrDash(NaN)).toEqual(DASH);
  });
});
