/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ValidationFunc } from '../index';
import { validateInterval } from '../interval';

describe('validateInterval', () => {
  let validationFunction: ValidationFunc;
  beforeEach(() => {
    validationFunction = validateInterval.validationFunction;
  });

  it('passes valid @every syntax', () => {
    expect(validationFunction(undefined, '@every 5s')).toBe(true);
  });

  it('allows valid @every hour syntax', () => {
    expect(validationFunction(undefined, '@every 1h')).toBe(true);
  });

  it('allows valid @every minute syntax', () => {
    expect(validationFunction(undefined, '@every 25m')).toBe(true);
  });

  it('checks for cron syntax', () => {
    expect(validationFunction(undefined, '* * *')).toBe(true);
  });

  it(`doesn't allow non-interval text`, () => {
    expect(validationFunction(undefined, '5s')).toBe(false);
  });

  it(`doesn't allow unsupported unit`, () => {
    expect(validationFunction(undefined, '@every 10x'));
  });
});
