/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useHistory } from 'react-router-dom';
import { act, renderHook } from '@testing-library/react-hooks';

import { TestProviders } from '../../common/mock';
import {
  useAllCasesState,
  getQueryParamsLocalStorageKey,
  getFilterOptionsLocalStorageKey,
} from './use_all_cases_state';
import { DEFAULT_FILTER_OPTIONS, DEFAULT_QUERY_PARAMS } from '../../containers/use_get_cases';
import { stringify } from 'query-string';
import { DEFAULT_TABLE_ACTIVE_PAGE, DEFAULT_TABLE_LIMIT } from '../../containers/constants';
import { CaseStatuses } from '../../../common';
import { SortFieldCase } from '../../containers/types';

const LOCAL_STORAGE_QUERY_PARAMS_DEFAULTS = {
  perPage: DEFAULT_QUERY_PARAMS.perPage,
  sortOrder: DEFAULT_QUERY_PARAMS.sortOrder,
};

const LOCAL_STORAGE_FILTER_OPTIONS_DEFAULTS = {
  severity: DEFAULT_FILTER_OPTIONS.severity,
  status: DEFAULT_FILTER_OPTIONS.status,
};

const URL_DEFAULTS = {
  ...DEFAULT_QUERY_PARAMS,
  ...LOCAL_STORAGE_FILTER_OPTIONS_DEFAULTS,
};

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

const APP_ID = 'testAppId';
const LOCALSTORAGE_QUERY_PARAMS_KEY = getQueryParamsLocalStorageKey(APP_ID);
const LOCALSTORAGE_FILTER_OPTIONS_KEY = getFilterOptionsLocalStorageKey(APP_ID);

describe('useAllCasesQueryParams', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('calls setState with default values on first run', () => {
    const { result } = renderHook(() => useAllCasesState(), {
      wrapper: ({ children }) => <TestProviders>{children}</TestProviders>,
    });

    expect(result.current.queryParams).toStrictEqual(DEFAULT_QUERY_PARAMS);
    expect(result.current.filterOptions).toStrictEqual(DEFAULT_FILTER_OPTIONS);
  });

  it('updates localstorage with default values on first run', () => {
    expect(localStorage.getItem(LOCALSTORAGE_QUERY_PARAMS_KEY)).toStrictEqual(null);
    expect(localStorage.getItem(LOCALSTORAGE_FILTER_OPTIONS_KEY)).toStrictEqual(null);

    renderHook(() => useAllCasesState(), {
      wrapper: ({ children }) => <TestProviders>{children}</TestProviders>,
    });

    expect(JSON.parse(localStorage.getItem(LOCALSTORAGE_QUERY_PARAMS_KEY)!)).toMatchObject({
      ...LOCAL_STORAGE_QUERY_PARAMS_DEFAULTS,
    });
    expect(JSON.parse(localStorage.getItem(LOCALSTORAGE_FILTER_OPTIONS_KEY)!)).toMatchObject({
      ...LOCAL_STORAGE_FILTER_OPTIONS_DEFAULTS,
    });
  });

  it('takes into account input filter options', () => {
    const existingLocalStorageValues = { owner: ['foobar'], status: CaseStatuses.open };

    const { result } = renderHook(() => useAllCasesState(false, existingLocalStorageValues), {
      wrapper: ({ children }) => <TestProviders>{children}</TestProviders>,
    });

    expect(result.current.filterOptions).toStrictEqual({
      ...DEFAULT_FILTER_OPTIONS,
      ...existingLocalStorageValues,
    });
  });

  it('calls history.replace on every run', () => {
    const { result } = renderHook(() => useAllCasesState(), {
      wrapper: ({ children }) => <TestProviders>{children}</TestProviders>,
    });

    expect(useHistory().replace).toHaveBeenCalledTimes(1);
    expect(useHistory().push).toHaveBeenCalledTimes(0);

    act(() => {
      result.current.setQueryParams({ perPage: DEFAULT_TABLE_LIMIT + 10 });
    });

    expect(useHistory().replace).toHaveBeenCalledTimes(2);
    expect(useHistory().push).toHaveBeenCalledTimes(0);
  });

  it('takes into account existing localStorage query params on first run', () => {
    const existingLocalStorageValues = {
      perPage: DEFAULT_TABLE_LIMIT + 10,
      sortOrder: 'asc',
      sortField: SortFieldCase.severity,
    };

    localStorage.setItem(LOCALSTORAGE_QUERY_PARAMS_KEY, JSON.stringify(existingLocalStorageValues));

    const { result } = renderHook(() => useAllCasesState(), {
      wrapper: ({ children }) => <TestProviders>{children}</TestProviders>,
    });

    expect(result.current.queryParams).toMatchObject({
      ...LOCAL_STORAGE_QUERY_PARAMS_DEFAULTS,
      ...existingLocalStorageValues,
    });
  });

  it('takes into account existing localStorage filter options values on first run', () => {
    const existingLocalStorageValues = { severity: 'critical', status: 'open' };

    localStorage.setItem(
      LOCALSTORAGE_FILTER_OPTIONS_KEY,
      JSON.stringify(existingLocalStorageValues)
    );

    const { result } = renderHook(() => useAllCasesState(), {
      wrapper: ({ children }) => <TestProviders>{children}</TestProviders>,
    });

    expect(result.current.filterOptions).toMatchObject(existingLocalStorageValues);
  });

  it('takes into account existing url query params on first run', () => {
    const nonDefaultUrlParams = {
      page: DEFAULT_TABLE_ACTIVE_PAGE + 1,
      perPage: DEFAULT_TABLE_LIMIT + 5,
    };
    const expectedUrl = { ...URL_DEFAULTS, ...nonDefaultUrlParams };

    mockLocation.search = stringify(nonDefaultUrlParams);

    renderHook(() => useAllCasesState(), {
      wrapper: ({ children }) => <TestProviders>{children}</TestProviders>,
    });

    expect(useHistory().replace).toHaveBeenCalledWith({
      search: stringify(expectedUrl),
    });
  });

  it('takes into account existing url filter options on first run', () => {
    const nonDefaultUrlParams = { severity: 'critical', status: 'open' };
    const expectedUrl = { ...URL_DEFAULTS, ...nonDefaultUrlParams };

    mockLocation.search = stringify(nonDefaultUrlParams);

    renderHook(() => useAllCasesState(), {
      wrapper: ({ children }) => <TestProviders>{children}</TestProviders>,
    });

    expect(useHistory().replace).toHaveBeenCalledWith({
      search: stringify(expectedUrl),
    });
  });

  it('preserves other url parameters', () => {
    const nonDefaultUrlParams = {
      foo: 'bar',
    };
    const expectedUrl = { ...URL_DEFAULTS, ...nonDefaultUrlParams };

    mockLocation.search = stringify(nonDefaultUrlParams);

    renderHook(() => useAllCasesState(), {
      wrapper: ({ children }) => <TestProviders>{children}</TestProviders>,
    });

    expect(useHistory().replace).toHaveBeenCalledWith({
      search: stringify(expectedUrl),
    });
  });

  it('urlParams take precedence over localStorage query params values', () => {
    const nonDefaultUrlParams = {
      perPage: DEFAULT_TABLE_LIMIT + 5,
    };

    mockLocation.search = stringify(nonDefaultUrlParams);

    localStorage.setItem(
      LOCALSTORAGE_QUERY_PARAMS_KEY,
      JSON.stringify({ perPage: DEFAULT_TABLE_LIMIT + 10 })
    );

    const { result } = renderHook(() => useAllCasesState(), {
      wrapper: ({ children }) => <TestProviders>{children}</TestProviders>,
    });

    expect(result.current.queryParams).toMatchObject({
      ...DEFAULT_QUERY_PARAMS,
      ...nonDefaultUrlParams,
    });
  });

  it('urlParams take precedence over localStorage filter options values', () => {
    const nonDefaultUrlParams = {
      severity: 'high',
      status: 'open',
    };

    mockLocation.search = stringify(nonDefaultUrlParams);

    localStorage.setItem(
      LOCALSTORAGE_FILTER_OPTIONS_KEY,
      JSON.stringify({ severity: 'low', status: 'closed' })
    );

    const { result } = renderHook(() => useAllCasesState(), {
      wrapper: ({ children }) => <TestProviders>{children}</TestProviders>,
    });

    expect(result.current.filterOptions).toMatchObject(nonDefaultUrlParams);
  });
});
