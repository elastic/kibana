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
  useAllCasesQueryParams,
  getQueryParamsLocalStorageKey,
} from './use_all_cases_query_params';
import { DEFAULT_QUERY_PARAMS } from '../../containers/use_get_cases';
import { stringify } from 'query-string';
import { DEFAULT_TABLE_ACTIVE_PAGE, DEFAULT_TABLE_LIMIT } from '../../containers/constants';

const LOCAL_STORAGE_DEFAULTS = {
  perPage: DEFAULT_QUERY_PARAMS.perPage,
  sortOrder: DEFAULT_QUERY_PARAMS.sortOrder,
};
const URL_DEFAULTS = {
  page: DEFAULT_QUERY_PARAMS.page,
  perPage: DEFAULT_QUERY_PARAMS.perPage,
  sortOrder: DEFAULT_QUERY_PARAMS.sortOrder,
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
const LOCALSTORAGE_KEY = getQueryParamsLocalStorageKey(APP_ID);

describe('useAllCasesQueryParams', () => {
  beforeEach(() => {
    global.localStorage.clear();
  });

  it('calls setState with default values on first run', () => {
    const { result } = renderHook(() => useAllCasesQueryParams(), {
      wrapper: ({ children }) => <TestProviders>{children}</TestProviders>,
    });

    expect(result.current.queryParams).toStrictEqual(DEFAULT_QUERY_PARAMS);
  });

  it('updates localstorage with default values on first run', () => {
    expect(global.localStorage.getItem(LOCALSTORAGE_KEY)).toStrictEqual(null);

    renderHook(() => useAllCasesQueryParams(), {
      wrapper: ({ children }) => <TestProviders>{children}</TestProviders>,
    });

    expect(JSON.parse(global.localStorage.getItem(LOCALSTORAGE_KEY) ?? '{}')).toMatchObject({
      ...LOCAL_STORAGE_DEFAULTS,
    });
  });

  it('calls history.replace with default values on first run', () => {
    renderHook(() => useAllCasesQueryParams(), {
      wrapper: ({ children }) => <TestProviders>{children}</TestProviders>,
    });

    expect(useHistory().replace).toHaveBeenCalledWith({
      search: stringify(URL_DEFAULTS),
    });
  });

  it('takes into account existing localStorage values on first run', () => {
    const existingLocalStorageValues = { perPage: DEFAULT_TABLE_LIMIT + 10, sortOrder: 'asc' };

    global.localStorage.setItem(LOCALSTORAGE_KEY, JSON.stringify(existingLocalStorageValues));

    const { result } = renderHook(() => useAllCasesQueryParams(), {
      wrapper: ({ children }) => <TestProviders>{children}</TestProviders>,
    });

    expect(result.current.queryParams).toMatchObject({
      ...LOCAL_STORAGE_DEFAULTS,
      ...existingLocalStorageValues,
    });
  });

  it('takes into account existing urlParams on first run', () => {
    const nonDefaultUrlParams = {
      page: DEFAULT_TABLE_ACTIVE_PAGE + 1,
      perPage: DEFAULT_TABLE_LIMIT + 5,
    };
    const expectedUrl = { ...URL_DEFAULTS, ...nonDefaultUrlParams };

    mockLocation.search = stringify(nonDefaultUrlParams);

    renderHook(() => useAllCasesQueryParams(), {
      wrapper: ({ children }) => <TestProviders>{children}</TestProviders>,
    });

    expect(useHistory().replace).toHaveBeenCalledWith({
      search: stringify(expectedUrl),
    });
  });

  it('calls history.replace on first run and history.push onwards', () => {
    const { result } = renderHook(() => useAllCasesQueryParams(), {
      wrapper: ({ children }) => <TestProviders>{children}</TestProviders>,
    });

    expect(useHistory().replace).toHaveBeenCalled();
    expect(useHistory().push).toHaveBeenCalledTimes(0);

    act(() => {
      result.current.setQueryParams({ perPage: DEFAULT_TABLE_LIMIT + 10 });
    });

    expect(useHistory().replace).toHaveBeenCalled();
    expect(useHistory().push).toHaveBeenCalledTimes(1);
  });

  it('preserves other url parameters', () => {
    const nonDefaultUrlParams = {
      foo: 'bar',
    };
    const expectedUrl = { ...URL_DEFAULTS, ...nonDefaultUrlParams };

    mockLocation.search = stringify(nonDefaultUrlParams);

    renderHook(() => useAllCasesQueryParams(), {
      wrapper: ({ children }) => <TestProviders>{children}</TestProviders>,
    });

    expect(useHistory().replace).toHaveBeenCalledWith({
      search: stringify(expectedUrl),
    });
  });

  it('urlParams take precedence over localStorage values', () => {
    const nonDefaultUrlParams = {
      perPage: DEFAULT_TABLE_LIMIT + 5,
    };

    mockLocation.search = stringify(nonDefaultUrlParams);

    global.localStorage.setItem(
      LOCALSTORAGE_KEY,
      JSON.stringify({ perPage: DEFAULT_TABLE_LIMIT + 10 }) // existingLocalStorageValues
    );

    const { result } = renderHook(() => useAllCasesQueryParams(), {
      wrapper: ({ children }) => <TestProviders>{children}</TestProviders>,
    });

    expect(result.current.queryParams).toMatchObject({
      ...DEFAULT_QUERY_PARAMS,
      ...nonDefaultUrlParams,
    });
  });
});
