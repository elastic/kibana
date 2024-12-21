/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { validateByWeekDay } from './v1';

describe('validateByWeekDay', () => {
  test('returns an error if the are no values', () => {
    expect(validateByWeekDay([])).toEqual('rRule byweekday cannot be empty');
  });

  test('returns an error if the values are not valid days', () => {
    expect(validateByWeekDay(['invalid'])).toEqual(
      'rRule byweekday should be one of MO, TU, WE, TH, FR, SA, SU'
    );
  });

  test('returns an error with valid and invalid values', () => {
    expect(validateByWeekDay(['MO', 'invalid'])).toEqual(
      'rRule byweekday should be one of MO, TU, WE, TH, FR, SA, SU'
    );
  });

  test('does not return an error with valid values', () => {
    expect(validateByWeekDay(['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'])).toEqual(undefined);
  });
});
