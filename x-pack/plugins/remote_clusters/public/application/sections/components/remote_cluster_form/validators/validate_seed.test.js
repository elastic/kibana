/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { validateSeed } from './validate_seed';

describe('validateSeeds', () => {
  test(`rejects invalid seeds and invalid ports`, () => {
    const errorsCount = validateSeed('&').length;
    expect(errorsCount).toBe(2);
  });

  test(`accepts no seed`, () => {
    const errorsCount = validateSeed('').length;
    expect(errorsCount).toBe(0);
  });

  test(`accepts a valid seed with a valid port`, () => {
    const errorsCount = validateSeed('seed:10').length;
    expect(errorsCount).toBe(0);
  });
});
