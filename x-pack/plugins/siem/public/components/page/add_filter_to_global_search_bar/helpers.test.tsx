/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createFilter } from './helpers';

describe('helpers', () => {
  describe('createFilter', () => {
    test('returns valid filter when key and value are provided', () => {
      const filter = createFilter('host.name', 'siem-xavier');
      expect(filter).toEqual({
        meta: {
          alias: null,
          disabled: false,
          key: 'host.name',
          negate: false,
          params: { query: 'siem-xavier' },
          type: 'phrase',
          value: 'siem-xavier',
        },
        query: { match: { 'host.name': { query: 'siem-xavier', type: 'phrase' } } },
      });
    });

    test('returns a negated filter when `negate` is true', () => {
      const filter = createFilter('host.name', 'siem-xavier', true);
      expect(filter).toEqual({
        meta: {
          alias: null,
          disabled: false,
          key: 'host.name',
          negate: true, // <-- filter is negated
          params: { query: 'siem-xavier' },
          type: 'phrase',
          value: 'siem-xavier',
        },
        query: { match: { 'host.name': { query: 'siem-xavier', type: 'phrase' } } },
      });
    });

    test('return valid exists filter when valid key and null value are provided', () => {
      const filter = createFilter('host.name', null);
      expect(filter).toEqual({
        exists: { field: 'host.name' },
        meta: {
          alias: null,
          disabled: false,
          key: 'host.name',
          negate: false,
          type: 'exists',
          value: 'exists',
        },
      });
    });

    test('return valid !exists filter when valid key and undefined value are provided', () => {
      const filter = createFilter('host.name', undefined);
      expect(filter).toEqual({
        exists: { field: 'host.name' },
        meta: {
          alias: null,
          disabled: false,
          key: 'host.name',
          negate: true,
          type: 'exists',
          value: 'exists',
        },
      });
    });
  });
});
