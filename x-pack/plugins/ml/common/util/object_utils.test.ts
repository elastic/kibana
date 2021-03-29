/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isPopulatedObject } from './object_utils';

describe('object_utils', () => {
  test('isPopulatedObject()', () => {
    expect(isPopulatedObject(0)).toBe(false);
    expect(isPopulatedObject('')).toBe(false);
    expect(isPopulatedObject(null)).toBe(false);
    expect(isPopulatedObject({})).toBe(false);
    expect(isPopulatedObject({ attribute: 'value' })).toBe(true);
    expect(isPopulatedObject({ attribute: 'value' }, ['otherAttribute'])).toBe(false);
    expect(isPopulatedObject({ attribute: 'value' }, ['attribute'])).toBe(true);
    expect(
      isPopulatedObject({ attribute1: 'value1', attribute2: 'value2' }, [
        'attribute1',
        'attribute2',
      ])
    ).toBe(true);
    expect(
      isPopulatedObject({ attribute1: 'value1', attribute2: 'value2' }, [
        'attribute1',
        'otherAttribute',
      ])
    ).toBe(true);
  });
});
