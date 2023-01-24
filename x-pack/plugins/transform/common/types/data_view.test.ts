/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isDataView } from './data_view';

describe('data_view', () => {
  test('isDataView()', () => {
    expect(isDataView(0)).toBe(false);
    expect(isDataView('')).toBe(false);
    expect(isDataView(null)).toBe(false);
    expect(isDataView({})).toBe(false);
    expect(isDataView({ attribute: 'value' })).toBe(false);
    expect(isDataView({ fields: [], title: 'Data View Title', getComputedFields: () => {} })).toBe(
      true
    );
  });
});
