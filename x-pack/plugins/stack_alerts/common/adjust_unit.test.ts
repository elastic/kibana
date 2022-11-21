/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { adjustUnit } from './adjust_units';

describe('adjustUnit', () => {
  it('should return the unit if it is not h, d, or y', () => {
    expect(adjustUnit('m')).toBe('m');
  });

  it('should return the unit with a slash if it is h, d, or y', () => {
    expect(adjustUnit('h')).toBe('h/h');
    expect(adjustUnit('d')).toBe('d/d');
    expect(adjustUnit('y')).toBe('y/d');
  });
});
