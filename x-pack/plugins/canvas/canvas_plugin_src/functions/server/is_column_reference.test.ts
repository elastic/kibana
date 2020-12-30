/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { isColumnReference } from './pointseries/lib/is_column_reference';

describe('isColumnReference', () => {
  it('get a string result after parsing math expression', () => {
    expect(isColumnReference('field')).toBe(true);
  });
  it('non-string', () => {
    expect(isColumnReference('2')).toBe(false);
    expect(isColumnReference('mean(field)')).toBe(false);
    expect(isColumnReference('field * 3')).toBe(false);
  });
});
