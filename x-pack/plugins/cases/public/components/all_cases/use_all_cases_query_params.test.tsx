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
import { useAllCasesQueryParams } from './use_all_cases_query_params';
import { DEFAULT_QUERY_PARAMS } from '../../containers/use_get_cases';
import useLocalStorage from 'react-use/lib/useLocalStorage';
import { stringify } from 'query-string';
import { DEFAULT_TABLE_ACTIVE_PAGE, DEFAULT_TABLE_LIMIT } from '../../containers/constants';

jest.mock('react-use/lib/useLocalStorage');

const LOCAL_STORAGE_DEFAULTS = {
  perPage: DEFAULT_QUERY_PARAMS.perPage,
  sortOrder: DEFAULT_QUERY_PARAMS.sortOrder,
};
const URL_DEFAULTS = {
  page: DEFAULT_QUERY_PARAMS.page,
  perPage: DEFAULT_QUERY_PARAMS.perPage,
  sortOrder: DEFAULT_QUERY_PARAMS.sortOrder,
};

const useLocalStorageMock = useLocalStorage as jest.Mock;

const localStorageQueryParams = {};
const setLocalStorageQueryParams = jest.fn();
const mockLocation = { search: '' };

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useLocation: jest.fn().mockImplementation(() => {
    return mockLocation;
  }),
  useHistory: jest.fn().mockReturnValue({
    push: jest.fn(),
    location: {
      search: '',
    },
  }),
}));

describe('hooks', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('useUrlState', () => {
    beforeEach(() => {
      useLocalStorageMock.mockReturnValue([localStorageQueryParams, setLocalStorageQueryParams]);
    });

    it('calls setState with default values on first run', () => {
      const { result } = renderHook(() => useAllCasesQueryParams(), {
        wrapper: ({ children }) => <TestProviders>{children}</TestProviders>,
      });

      expect(result.current.queryParams).toStrictEqual(DEFAULT_QUERY_PARAMS);
    });

    it('updates localstorage with default values on first run', () => {
      renderHook(() => useAllCasesQueryParams(), {
        wrapper: ({ children }) => <TestProviders>{children}</TestProviders>,
      });

      expect(setLocalStorageQueryParams).toHaveBeenCalledWith(LOCAL_STORAGE_DEFAULTS);
    });

    it('calls history.push with default values on first run', () => {
      renderHook(() => useAllCasesQueryParams(), {
        wrapper: ({ children }) => <TestProviders>{children}</TestProviders>,
      });

      expect(useHistory().push).toHaveBeenCalledWith({
        search: stringify(URL_DEFAULTS),
      });
    });

    it('takes into account existing localStorage values on first run', () => {
      const existingLocalStorageValues = { perPage: DEFAULT_TABLE_LIMIT + 10, sortOrder: 'asc' };

      useLocalStorageMock.mockReturnValue([existingLocalStorageValues, setLocalStorageQueryParams]);

      renderHook(() => useAllCasesQueryParams(), {
        wrapper: ({ children }) => <TestProviders>{children}</TestProviders>,
      });

      expect(setLocalStorageQueryParams).toHaveBeenCalledWith({
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

      expect(useHistory().push).toHaveBeenCalledWith({
        search: stringify(expectedUrl),
      });
    });

    it('urlParams take precedence over localStorage values', () => {
      const nonDefaultUrlParams = {
        perPage: DEFAULT_TABLE_LIMIT + 5,
      };
      const existingLocalStorageValues = { perPage: DEFAULT_TABLE_LIMIT + 10 };

      mockLocation.search = stringify(nonDefaultUrlParams);
      useLocalStorageMock.mockReturnValue([existingLocalStorageValues, setLocalStorageQueryParams]);

      const { result } = renderHook(() => useAllCasesQueryParams(), {
        wrapper: ({ children }) => <TestProviders>{children}</TestProviders>,
      });

      expect(result.current.queryParams).toMatchObject({
        ...DEFAULT_QUERY_PARAMS,
        ...nonDefaultUrlParams,
      });
    });
  });
});
