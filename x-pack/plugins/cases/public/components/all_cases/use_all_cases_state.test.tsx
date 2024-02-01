/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useHistory } from 'react-router-dom';
import { renderHook } from '@testing-library/react-hooks';

import { TestProviders } from '../../common/mock';
import { useAllCasesState } from './use_all_cases_state';
import { DEFAULT_CASES_TABLE_STATE, DEFAULT_TABLE_LIMIT } from '../../containers/constants';
import { SortFieldCase } from '../../containers/types';
import { stringifyUrlParams } from './utils/stringify_url_params';

const mockLocation = { search: '' };

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useLocation: jest.fn().mockImplementation(() => {
    return mockLocation;
  }),
  useHistory: jest.fn().mockReturnValue({
    replace: jest.fn(),
    push: jest.fn(),
    location: {
      search: '',
    },
  }),
}));

const LS_KEY = 'testAppId.cases.list.state';

describe('useAllCasesQueryParams', () => {
  beforeEach(() => {
    localStorage.clear();
    mockLocation.search = '';
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('calls setState with default values on first run', () => {
    const { result } = renderHook(() => useAllCasesState(), {
      wrapper: ({ children }) => <TestProviders>{children}</TestProviders>,
    });

    expect(result.current.queryParams).toStrictEqual(DEFAULT_CASES_TABLE_STATE.queryParams);
    expect(result.current.filterOptions).toStrictEqual(DEFAULT_CASES_TABLE_STATE.filterOptions);
  });

  it('takes into account existing localStorage query params on first run', () => {
    const existingLocalStorageValues = {
      queryParams: {
        ...DEFAULT_CASES_TABLE_STATE.queryParams,
        perPage: DEFAULT_TABLE_LIMIT + 10,
        sortOrder: 'asc',
        sortField: SortFieldCase.severity,
      },
      filterOptions: DEFAULT_CASES_TABLE_STATE.filterOptions,
    };

    localStorage.setItem(LS_KEY, JSON.stringify(existingLocalStorageValues));

    const { result } = renderHook(() => useAllCasesState(), {
      wrapper: ({ children }) => <TestProviders>{children}</TestProviders>,
    });

    expect(result.current.queryParams).toMatchObject(existingLocalStorageValues.queryParams);
  });

  it('takes into account existing localStorage filter options values on first run', () => {
    const existingLocalStorageValues = {
      queryParams: DEFAULT_CASES_TABLE_STATE.queryParams,
      filterOptions: {
        ...DEFAULT_CASES_TABLE_STATE.filterOptions,
        severity: ['critical'],
        status: ['open'],
      },
    };

    localStorage.setItem(LS_KEY, JSON.stringify(existingLocalStorageValues));

    const { result } = renderHook(() => useAllCasesState(), {
      wrapper: ({ children }) => <TestProviders>{children}</TestProviders>,
    });

    expect(result.current.filterOptions).toMatchObject(existingLocalStorageValues.filterOptions);
  });

  it('takes into account existing url query params on first run', () => {
    mockLocation.search = stringifyUrlParams({ page: '2', perPage: '15' });

    const { result } = renderHook(() => useAllCasesState(), {
      wrapper: ({ children }) => <TestProviders>{children}</TestProviders>,
    });

    expect(result.current.queryParams).toMatchObject({
      ...DEFAULT_CASES_TABLE_STATE.queryParams,
      ...{ page: 2, perPage: 15 },
    });
  });

  it('takes into account existing url filter options on first run', () => {
    mockLocation.search = stringifyUrlParams({ severity: 'critical', status: 'open' });

    const { result } = renderHook(() => useAllCasesState(), {
      wrapper: ({ children }) => <TestProviders>{children}</TestProviders>,
    });

    expect(result.current.filterOptions).toMatchObject({
      ...DEFAULT_CASES_TABLE_STATE.filterOptions,
      ...{ severity: ['critical'], status: ['open'] },
    });
  });

  it('takes into account legacy url filter option "all"', () => {
    const nonDefaultUrlParams = new URLSearchParams();
    nonDefaultUrlParams.append('severity', 'foo');
    nonDefaultUrlParams.append('status', 'all');
    nonDefaultUrlParams.append('status', 'open');
    nonDefaultUrlParams.append('severity', 'low');

    mockLocation.search = nonDefaultUrlParams.toString();

    const { result } = renderHook(() => useAllCasesState(), {
      wrapper: ({ children }) => <TestProviders>{children}</TestProviders>,
    });

    expect(result.current.filterOptions).toMatchObject({
      ...DEFAULT_CASES_TABLE_STATE.filterOptions,
      ...{ severity: ['low'], status: ['open'] },
    });
  });

  // TODO: Fix it
  it.skip('preserves other url parameters', () => {
    const nonDefaultUrlParams = {
      foo: 'bar',
    };

    mockLocation.search = stringifyUrlParams(nonDefaultUrlParams);

    renderHook(() => useAllCasesState(), {
      wrapper: ({ children }) => <TestProviders>{children}</TestProviders>,
    });

    expect(useHistory().push).toHaveBeenCalledWith({
      search: 'foo=bar&page=1&perPage=10&sortField=createdAt&sortOrder=desc&severity=&status=',
    });
  });

  it('urlParams take precedence over localStorage query params values', () => {
    mockLocation.search = stringifyUrlParams({ perPage: '15' });
    const existingLocalStorageValues = {
      queryParams: { ...DEFAULT_CASES_TABLE_STATE.queryParams, perPage: 20 },
      filterOptions: DEFAULT_CASES_TABLE_STATE.filterOptions,
    };

    localStorage.setItem(LS_KEY, JSON.stringify(existingLocalStorageValues));

    const { result } = renderHook(() => useAllCasesState(), {
      wrapper: ({ children }) => <TestProviders>{children}</TestProviders>,
    });

    expect(result.current.queryParams).toMatchObject({
      ...DEFAULT_CASES_TABLE_STATE.queryParams,
      ...{ perPage: 15 },
    });
  });

  it('urlParams take precedence over localStorage filter options values', () => {
    mockLocation.search = stringifyUrlParams({ severity: 'high', status: 'open' });
    const existingLocalStorageValues = {
      filterOptions: {
        ...DEFAULT_CASES_TABLE_STATE.filterOptions,
        severity: ['low'],
        status: ['closed'],
      },
      queryParams: DEFAULT_CASES_TABLE_STATE.queryParams,
    };

    localStorage.setItem(LS_KEY, JSON.stringify(existingLocalStorageValues));

    const { result } = renderHook(() => useAllCasesState(), {
      wrapper: ({ children }) => <TestProviders>{children}</TestProviders>,
    });

    expect(result.current.filterOptions).toMatchObject({ severity: ['high'], status: ['open'] });
  });

  describe('validation', () => {
    it('localStorage perPage query param cannot be > 100', () => {
      const existingLocalStorageValues = {
        queryParams: { ...DEFAULT_CASES_TABLE_STATE.queryParams, perPage: 1000 },
        filterOptions: DEFAULT_CASES_TABLE_STATE.filterOptions,
      };

      localStorage.setItem(LS_KEY, JSON.stringify(existingLocalStorageValues));

      const { result } = renderHook(() => useAllCasesState(), {
        wrapper: ({ children }) => <TestProviders>{children}</TestProviders>,
      });

      expect(result.current.queryParams).toMatchObject({
        perPage: 100,
      });
    });

    it('url perPage query param cannot be > 100', () => {
      mockLocation.search = stringifyUrlParams({ perPage: '1000' });

      const { result } = renderHook(() => useAllCasesState(), {
        wrapper: ({ children }) => <TestProviders>{children}</TestProviders>,
      });

      expect(result.current.queryParams).toMatchObject({
        ...DEFAULT_CASES_TABLE_STATE.queryParams,
        ...{ perPage: 100 },
      });
    });

    it('validate spelling of localStorage sortOrder', () => {
      const existingLocalStorageValues = {
        queryParams: { ...DEFAULT_CASES_TABLE_STATE.queryParams, sortOrder: 'foobar' },
        filterOptions: DEFAULT_CASES_TABLE_STATE.filterOptions,
      };

      localStorage.setItem(LS_KEY, JSON.stringify(existingLocalStorageValues));

      const { result } = renderHook(() => useAllCasesState(), {
        wrapper: ({ children }) => <TestProviders>{children}</TestProviders>,
      });

      expect(result.current.queryParams).toMatchObject({ sortOrder: 'desc' });
    });

    it('validate spelling of url sortOrder', () => {
      mockLocation.search = stringifyUrlParams({ sortOrder: 'foobar' });

      const { result } = renderHook(() => useAllCasesState(), {
        wrapper: ({ children }) => <TestProviders>{children}</TestProviders>,
      });

      expect(result.current.queryParams).toMatchObject({ sortOrder: 'desc' });
    });
  });
});
