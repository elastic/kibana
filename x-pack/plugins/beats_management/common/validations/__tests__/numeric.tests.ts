/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { validateNumeric } from '../numeric';

describe('validateNumeric', () => {
  const { validationFunction } = validateNumeric;

  it('allows an integer string', () => {
    expect(validationFunction(undefined, '12345')).toBe(true);
  });

  it(`doesn't allow floating point string`, () => {
    expect(validationFunction(undefined, '10.3')).toBe(false);
  });

  it(`doesn't allow alpha strings`, () => {
    expect(validationFunction(undefined, 'this is an alpha string')).toBe(false);
  });
});
