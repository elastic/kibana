/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { Result } from '../../components/result/types';
import { flattenSearchResult, flattenField } from '.';

describe('flattenField', () => {
  it('flattens field if raw key is absent', () => {
    expect(flattenField('address', { country: { raw: 'United States' } })).toEqual([
      ['address.country', { raw: 'United States' }],
    ]);
  });
  it('preserves field if raw key is present', () => {
    expect(flattenField('country', { raw: 'United States' })).toEqual([
      ['country', { raw: 'United States' }],
    ]);
  });
});

describe('flattenSearchResult', () => {
  it('flattens all fields without raw key', () => {
    const result: Result = {
      id: { raw: '123' },
      _meta: { engine: 'Test', id: '1' },
      title: { raw: 'Getty Museum' },
      address: { city: { raw: 'Los Angeles' }, state: { raw: 'California' } },
    };
    const expected: Result = {
      id: { raw: '123' },
      _meta: { engine: 'Test', id: '1' },
      title: { raw: 'Getty Museum' },
      'address.city': { raw: 'Los Angeles' },
      'address.state': { raw: 'California' },
    };
    expect(flattenSearchResult(result)).toEqual(expected);
  });
});
