/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { calcMemoryUsed, calcMemoryUsedRate } from './helper';
describe('calcMemoryUsed', () => {
  it('returns undefined when memory values are no a number', () => {
    [
      { memoryFree: null, memoryTotal: null },
      { memoryFree: undefined, memoryTotal: undefined },
      { memoryFree: 100, memoryTotal: undefined },
      { memoryFree: undefined, memoryTotal: 100 },
    ].forEach(({ memoryFree, memoryTotal }) => {
      expect(calcMemoryUsed({ memoryFree, memoryTotal })).toBeUndefined();
    });
  });

  it('returns correct memory used', () => {
    expect(calcMemoryUsed({ memoryFree: 50, memoryTotal: 100 })).toBe(50);
  });
});

describe('calcMemoryUsedRate', () => {
  it('returns undefined when memory values are no a number', () => {
    [
      { memoryFree: null, memoryTotal: null },
      { memoryFree: undefined, memoryTotal: undefined },
      { memoryFree: 100, memoryTotal: undefined },
      { memoryFree: undefined, memoryTotal: 100 },
    ].forEach(({ memoryFree, memoryTotal }) => {
      expect(calcMemoryUsedRate({ memoryFree, memoryTotal })).toBeUndefined();
    });
  });

  it('returns correct memory used rate', () => {
    expect(calcMemoryUsedRate({ memoryFree: 50, memoryTotal: 100 })).toBe(0.5);
  });
});
