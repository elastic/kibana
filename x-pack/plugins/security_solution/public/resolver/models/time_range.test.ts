/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { maxDate, createRange } from './time_range';

describe('range', () => {
  it('creates a range starting from 1970-01-01T00:00:00.000Z to +275760-09-13T00:00:00.000Z by default', () => {
    const { from, to } = createRange();
    expect(from).toBe('1970-01-01T00:00:00.000Z');
    expect(to).toBe('+275760-09-13T00:00:00.000Z');
  });

  it('creates an invalid to date using a number greater than 8640000000000000', () => {
    expect(() => {
      createRange({ to: new Date(maxDate + 1) });
    }).toThrow(RangeError);
  });
});
