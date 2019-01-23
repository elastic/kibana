/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { validateSeeds } from './validate_seeds';

describe('validateSeeds', () => {
  it(`rejects empty seeds when there's no input`, () => {
    expect(validateSeeds([], '')).toMatchSnapshot();
  });

  it(`accepts empty seeds when there's input`, () => {
    expect(validateSeeds([], 'input')).toBe(undefined);
  });

  it(`accepts existing seeds`, () => {
    expect(validateSeeds(['seed'])).toBe(undefined);
  });
});
