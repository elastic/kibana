/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { continuousModeDelayValidator } from './validators';

describe('delayValidator', () => {
  test('it should allow 0 input without unit', () => {
    expect(continuousModeDelayValidator('0')).toBe(true);
  });

  test('it should allow 0 input with unit provided', () => {
    expect(continuousModeDelayValidator('0s')).toBe(true);
  });

  test('it should allow integer input with unit provided', () => {
    expect(continuousModeDelayValidator('234nanos')).toBe(true);
  });

  test('it should not allow integer input without unit provided', () => {
    expect(continuousModeDelayValidator('90000')).toBe(false);
  });

  test('it should not allow float input', () => {
    expect(continuousModeDelayValidator('122.5d')).toBe(false);
  });
});
