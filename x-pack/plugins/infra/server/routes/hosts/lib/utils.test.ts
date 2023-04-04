/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parseFilters, hasFilters } from './utils';

const query = { bool: { must_not: [], filter: [], should: [], must: [] } };

describe('utils', () => {
  describe('parseFilters', () => {
    test('should successfully parse a partial query object', () => {
      const partialQuery = {
        ...query,
        bool: {
          filter: [],
        },
      };
      const parsed = parseFilters(partialQuery);
      expect(parsed).toEqual(partialQuery);
    });

    test('should successfully parse query object', () => {
      const parsed = parseFilters(query);
      expect(parsed).toEqual(query);
    });

    test('should fail to parse query object', () => {
      const anyObject = { test: [{ a: 1 }] };
      expect(() => parseFilters(anyObject)).toThrowError();
    });

    test('should fail to parse query object without any filter clause', () => {
      const anyObject = { bool: {} };
      expect(() => parseFilters(anyObject)).toThrowError();
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
