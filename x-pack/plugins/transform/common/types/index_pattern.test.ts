/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isIndexPattern } from './index_pattern';

describe('index_pattern', () => {
  test('isIndexPattern()', () => {
    expect(isIndexPattern(0)).toBe(false);
    expect(isIndexPattern('')).toBe(false);
    expect(isIndexPattern(null)).toBe(false);
    expect(isIndexPattern({})).toBe(false);
    expect(isIndexPattern({ attribute: 'value' })).toBe(false);
    expect(
      isIndexPattern({ fields: [], title: 'Data View Title', getComputedFields: () => {} })
    ).toBe(true);
  });
});
