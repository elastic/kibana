/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { SearchResult } from '@elastic/search-ui';

import { flattenDocument, flattenDocumentField } from '.';

describe('flattenDocumentField', () => {
  it('flattens field if raw key is absent', () => {
    expect(flattenDocumentField('address', { country: { raw: 'United States' } })).toEqual([
      ['address.country', { raw: 'United States' }],
    ]);
  });
  it('preserves field if raw key is present', () => {
    expect(flattenDocumentField('country', { raw: 'United States' })).toEqual([
      ['country', { raw: 'United States' }],
    ]);
  });
  it('can flatten multiple levels', () => {
    const data = {
      name: { raw: 'Bubba Gump' },
      address: {
        street: { raw: 'South St' },
        country: {
          code: { raw: 'US' },
          name: { raw: 'United States' },
        },
      },
    };
    const expected = [
      ['customer.name', { raw: 'Bubba Gump' }],
      ['customer.address.street', { raw: 'South St' }],
      ['customer.address.country.code', { raw: 'US' }],
      ['customer.address.country.name', { raw: 'United States' }],
    ];
    expect(flattenDocumentField('customer', data)).toEqual(expected);
  });
});

describe('flattenDocument', () => {
  it('flattens all fields without raw key', () => {
    const result: SearchResult = {
      id: { raw: '123' },
      _meta: { engine: 'Test', id: '1' },
      title: { raw: 'Getty Museum' },
      address: { city: { raw: 'Los Angeles' }, state: { raw: 'California' } },
    };
    const expected: SearchResult = {
      id: { raw: '123' },
      _meta: { engine: 'Test', id: '1' },
      title: { raw: 'Getty Museum' },
      'address.city': { raw: 'Los Angeles' },
      'address.state': { raw: 'California' },
    };
    expect(flattenDocument(result)).toEqual(expected);
  });
});
