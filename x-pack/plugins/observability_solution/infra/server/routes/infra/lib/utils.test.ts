/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { assertQueryStructure, hasFilters } from './utils';

const query = { bool: { must_not: [], filter: [], should: [], must: [] } };

describe('utils', () => {
  describe('assertQueryStructure', () => {
    test('should successfully parse a partial query object', () => {
      const partialQuery = {
        ...query,
        bool: {
          filter: [],
        },
      };

      expect(() => assertQueryStructure(partialQuery)).not.toThrow();
    });

    test('should successfully parse query object', () => {
      expect(() => assertQueryStructure(query)).not.toThrow();
    });

    test('should fail to parse query object', () => {
      const anyObject = { test: [{ a: 1 }] };
      expect(() => assertQueryStructure(anyObject)).toThrow();
    });

    test('should fail to parse query object without any filter clause', () => {
      const anyObject = { bool: {} };
      expect(() => assertQueryStructure(anyObject)).toThrow();
    });
  });
  describe('hasFilters', () => {
    test('should return true if there is any filter', () => {
      const result = hasFilters({
        ...query,
        bool: {
          filter: [
            {
              term: {
                'host.name': 'host',
              },
            },
          ],
        },
      });
      expect(result).toEqual(true);
    });

    test('should return false when there is not filter', () => {
      const result = hasFilters(query);
      expect(result).toEqual(false);
    });
  });
});
