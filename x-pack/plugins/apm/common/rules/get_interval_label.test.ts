/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { getIntervalLabel } from './get_interval_label';

describe('getIntervalLabel', () => {
  [
    { value: 1, unit: 's', expected: '1 second' },
    { value: 2, unit: 's', expected: '2 seconds' },
    { value: 1, unit: 'm', expected: '1 minute' },
    { value: 2, unit: 'm', expected: '2 minutes' },
    { value: 1, unit: 'h', expected: '1 hour' },
    { value: 2, unit: 'h', expected: '2 hours' },
    { value: 1, unit: 'd', expected: '1 day' },
    { value: 2, unit: 'd', expected: '2 days' },
    { value: 1, unit: 'foo', expected: '1 foo' },
  ].map(({ value, unit, expected }) => {
    it(`returns "${expected}" for value: ${value} and unit: ${unit}`, () => {
      expect(getIntervalLabel(value, unit)).toEqual(expected);
    });
  });
});
