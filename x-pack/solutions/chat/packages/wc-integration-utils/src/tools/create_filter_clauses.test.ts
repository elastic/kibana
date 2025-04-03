/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createFilterClauses } from './create_filter_clauses';
import type { SearchFilter } from './generate_search_schema';

describe('createFilterClauses', () => {
  it('generate the correct clauses for a keyword filter', () => {
    const filter: SearchFilter = {
      type: 'keyword',
      field: 'foo',
      description: 'foo filter',
    };

    const values = {
      foo: 'bar',
      hello: 'dolly',
    };

    const output = createFilterClauses({ filters: [filter], values });

    expect(output).toEqual([{ term: { foo: 'bar' } }]);
  });

  it('generate the correct clauses for a boolean filter', () => {
    const filter: SearchFilter = {
      type: 'boolean',
      field: 'isActive',
      description: 'active status filter',
    };

    const values = {
      isActive: true,
      otherField: 'ignored',
    };

    const output = createFilterClauses({ filters: [filter], values });

    expect(output).toEqual([{ term: { isActive: true } }]);
  });

  it('handles multiple filters correctly', () => {
    const filters: SearchFilter[] = [
      {
        type: 'keyword',
        field: 'foo',
        description: 'foo filter',
      },
      {
        type: 'boolean',
        field: 'isActive',
        description: 'active status filter',
      },
    ];

    const values = {
      foo: 'bar',
      isActive: true,
      ignored: 'value',
    };

    const output = createFilterClauses({ filters, values });

    expect(output).toEqual([{ term: { foo: 'bar' } }, { term: { isActive: true } }]);
  });

  it('returns empty array when no values are provided', () => {
    const filters: SearchFilter[] = [
      {
        type: 'keyword',
        field: 'foo',
        description: 'foo filter',
      },
    ];

    const values = {};

    const output = createFilterClauses({ filters, values });

    expect(output).toEqual([]);
  });

  it('ignores values that do not have matching filters', () => {
    const filters: SearchFilter[] = [
      {
        type: 'keyword',
        field: 'foo',
        description: 'foo filter',
      },
    ];

    const values = {
      foo: 'bar',
      unmatched: 'value',
      anotherUnmatched: 123,
    };

    const output = createFilterClauses({ filters, values });

    expect(output).toEqual([{ term: { foo: 'bar' } }]);
  });
});
