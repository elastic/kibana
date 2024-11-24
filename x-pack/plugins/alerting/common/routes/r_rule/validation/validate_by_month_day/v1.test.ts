/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { validateByMonthDay } from './v1';

describe('validateByMonthDay', () => {
  test('returns an error if the are no values', () => {
    expect(validateByMonthDay([])).toEqual('rRule bymonthday cannot be empty');
  });

  test('returns an error if the values are less than one', () => {
    expect(validateByMonthDay([0])).toEqual(
      'rRule bymonthday should be between 1 and 31 inclusive'
    );
  });

  test('returns an error if the values are bigger than 31', () => {
    expect(validateByMonthDay([32])).toEqual(
      'rRule bymonthday should be between 1 and 31 inclusive'
    );
  });

  test('returns an error with valid and invalid values', () => {
    expect(validateByMonthDay([2, 32])).toEqual(
      'rRule bymonthday should be between 1 and 31 inclusive'
    );
  });

  test('does not return an error with valid values', () => {
    expect(validateByMonthDay([2, 5, 7])).toEqual(undefined);
  });
});
