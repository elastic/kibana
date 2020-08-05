/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { fieldExists } from './pure_helpers';

describe('fieldExists', () => {
  it('returns whether or not a field exists', () => {
    expect(fieldExists({ a: { b: true } }, 'a', 'b')).toBeTruthy();
    expect(fieldExists({ a: { b: true } }, 'a', 'c')).toBeFalsy();
    expect(fieldExists({ a: { b: true } }, 'b', 'b')).toBeFalsy();
  });
});
