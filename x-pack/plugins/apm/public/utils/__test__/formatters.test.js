/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { asTime } from '../formatters';

describe('formatters', () => {
  it('asTime', () => {
    expect(asTime(1000)).toBe('1 ms');
    expect(asTime(1000 * 1000)).toBe('1,000 ms');
    expect(asTime(1000 * 1000 * 10)).toBe('10,000 ms');
    expect(asTime(1000 * 1000 * 20)).toBe('20.0 s');
  });
});
