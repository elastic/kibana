/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { delayValidator } from './validators';

describe('delayValidator', () => {
  test('it should allow 0 input without unit', () => {
    expect(delayValidator('0')).toBe(true);
  });

  test('it should allow 0 input with unit provided', () => {
    expect(delayValidator('0s')).toBe(true);
  });

  test('it should allow integer input with unit provided', () => {
    expect(delayValidator('234nanos')).toBe(true);
  });

  test('it should not allow integer input without unit provided', () => {
    expect(delayValidator('90000')).toBe(false);
  });

  test('it should not allow float input', () => {
    expect(delayValidator('122.5d')).toBe(false);
  });
});
