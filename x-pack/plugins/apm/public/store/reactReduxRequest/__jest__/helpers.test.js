/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createInitialDataSelector } from '../helpers';

describe('createInitialDataSelector', () => {
  it('should use initialData when data is missing from state', () => {
    const state = {};
    const initialData = { foo: 'bar' };
    const withInitialData = createInitialDataSelector(initialData);

    expect(withInitialData(state)).toBe(withInitialData(state));
    expect(withInitialData(state, initialData)).toEqual({
      data: { foo: 'bar' }
    });
  });

  it('should use data when available', () => {
    const state = { data: 'hello' };
    const initialData = { foo: 'bar' };
    const withInitialData = createInitialDataSelector(initialData);

    expect(withInitialData(state)).toBe(withInitialData(state));
    expect(withInitialData(state, initialData)).toEqual({
      data: 'hello'
    });
  });
});
