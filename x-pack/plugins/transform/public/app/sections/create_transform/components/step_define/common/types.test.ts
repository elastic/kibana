/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isRuntimeField, isRuntimeMappings } from './types';

describe('Transform: step_define type guards', () => {
  it('isRuntimeField()', () => {
    expect(isRuntimeField(1)).toBe(false);
    expect(isRuntimeField(null)).toBe(false);
    expect(isRuntimeField([])).toBe(false);
    expect(isRuntimeField({})).toBe(false);
    expect(isRuntimeField({ someAttribute: 'someValue' })).toBe(false);
    expect(isRuntimeField({ type: 'wrong-type' })).toBe(false);
    expect(isRuntimeField({ type: 'keyword', someAttribute: 'some value' })).toBe(false);

    expect(isRuntimeField({ type: 'keyword' })).toBe(true);
    expect(isRuntimeField({ type: 'keyword', script: 'some script' })).toBe(true);
  });

  it('isRuntimeMappings()', () => {
    expect(isRuntimeMappings(1)).toBe(false);
    expect(isRuntimeMappings(null)).toBe(false);
    expect(isRuntimeMappings([])).toBe(false);
    expect(isRuntimeMappings({})).toBe(false);
    expect(isRuntimeMappings({ someAttribute: 'someValue' })).toBe(false);
    expect(isRuntimeMappings({ fieldName1: { type: 'keyword' }, fieldName2: 'someValue' })).toBe(
      false
    );
    expect(
      isRuntimeMappings({
        fieldName1: { type: 'keyword' },
        fieldName2: { type: 'keyword', someAttribute: 'some value' },
      })
    ).toBe(false);

    expect(isRuntimeMappings({ fieldName: { type: 'keyword' } })).toBe(true);
    expect(
      isRuntimeMappings({ fieldName1: { type: 'keyword' }, fieldName2: { type: 'keyword' } })
    ).toBe(true);
    expect(
      isRuntimeMappings({
        fieldName1: { type: 'keyword' },
        fieldName2: { type: 'keyword', script: 'some script' },
      })
    ).toBe(true);
  });
});
