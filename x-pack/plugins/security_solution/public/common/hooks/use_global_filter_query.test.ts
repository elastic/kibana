/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react-hooks';
import { TestProviders } from '../mock';
import { useGlobalFilterQuery } from './use_global_filter_query';
import type { Filter, Query } from '@kbn/es-query';

const DEFAULT_QUERY: Query = { query: '', language: 'kuery' };

const mockGlobalFiltersQuerySelector = jest.fn();
const mockGlobalQuerySelector = jest.fn();
const mockUseInvalidFilterQuery = jest.fn();

jest.mock('../store', () => {
  const original = jest.requireActual('../store');
  return {
    ...original,
    inputsSelectors: {
      ...original.inputsSelectors,
      globalFiltersQuerySelector: () => mockGlobalFiltersQuerySelector,
      globalQuerySelector: () => mockGlobalQuerySelector,
    },
  };
});

jest.mock('./use_invalid_filter_query', () => ({
  useInvalidFilterQuery: (...args: unknown[]) => mockUseInvalidFilterQuery(...args),
}));

describe('useGlobalFilterQuery', () => {
  beforeEach(() => {
    mockGlobalFiltersQuerySelector.mockReturnValue([]);
    mockGlobalQuerySelector.mockReturnValue(DEFAULT_QUERY);
  });

  it('returns filterQuery', () => {
    const { result } = renderHook(() => useGlobalFilterQuery(), { wrapper: TestProviders });

    expect(result.current.filterQuery).toEqual({
      bool: { must: [], filter: [], should: [], must_not: [] },
    });
  });

  it('filters by KQL search', () => {
    mockGlobalQuerySelector.mockReturnValue({ query: 'test: 123', language: 'kuery' });
    const { result } = renderHook(() => useGlobalFilterQuery(), { wrapper: TestProviders });

    expect(result.current.filterQuery).toEqual({
      bool: {
        must: [],
        filter: [
          {
            bool: {
              minimum_should_match: 1,
              should: [
                {
                  match: {
                    test: '123',
                  },
                },
              ],
            },
          },
        ],
        should: [],
        must_not: [],
      },
    });
  });

  it('filters by global filters', () => {
    const query = {
      match_phrase: {
        test: '1234',
      },
    };
    const globalFilter: Filter[] = [
      {
        meta: {
          disabled: false,
        },
        query,
      },
    ];
    mockGlobalFiltersQuerySelector.mockReturnValue(globalFilter);
    const { result } = renderHook(() => useGlobalFilterQuery(), { wrapper: TestProviders });

    expect(result.current.filterQuery).toEqual({
      bool: {
        must: [],
        filter: [query],
        should: [],
        must_not: [],
      },
    });
  });

  it('filters by extra filter', () => {
    const query = {
      match_phrase: {
        test: '12345',
      },
    };
    const extraFilter: Filter = {
      meta: {
        disabled: false,
      },
      query,
    };

    const { result } = renderHook(() => useGlobalFilterQuery({ extraFilter }), {
      wrapper: TestProviders,
    });

    expect(result.current.filterQuery).toEqual({
      bool: {
        must: [],
        filter: [query],
        should: [],
        must_not: [],
      },
    });
  });

  it('displays the KQL error when query is invalid', () => {
    mockGlobalQuerySelector.mockReturnValue({ query: ': :', language: 'kuery' });
    const { result } = renderHook(() => useGlobalFilterQuery(), { wrapper: TestProviders });

    expect(result.current.filterQuery).toEqual(undefined);
    expect(mockUseInvalidFilterQuery).toHaveBeenLastCalledWith(
      expect.objectContaining({
        kqlError: expect.anything(),
      })
    );
  });
});
