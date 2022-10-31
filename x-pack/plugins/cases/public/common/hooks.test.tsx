/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useHistory } from 'react-router-dom';
import { renderHook } from '@testing-library/react-hooks';

import { TestProviders } from './mock';
import { useIsMainApplication, useUrlState } from './hooks';
import { useApplication } from '../components/cases_context/use_application';
import { DEFAULT_QUERY_PARAMS } from '../containers/use_get_cases';
import useLocalStorage from 'react-use/lib/useLocalStorage';
import { stringify } from 'query-string';
import { DEFAULT_TABLE_ACTIVE_PAGE, DEFAULT_TABLE_LIMIT } from '../containers/constants';

jest.mock('../components/cases_context/use_application');
jest.mock('react-use/lib/useLocalStorage');

const { page, ...LOCAL_STORAGE_DEFAULTS } = { ...DEFAULT_QUERY_PARAMS };

const useApplicationMock = useApplication as jest.Mock;
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
    replace: jest.fn(),
    location: {
      search: '',
    },
  }),
}));

describe('hooks', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('useIsMainApplication', () => {
    beforeEach(() => {
      useApplicationMock.mockReturnValue({ appId: 'management', appTitle: 'Management' });
    });

    it('returns true if it is the main application', () => {
      const { result } = renderHook(() => useIsMainApplication(), {
        wrapper: ({ children }) => <TestProviders>{children}</TestProviders>,
      });

      expect(result.current).toBe(true);
    });

    it('returns false if it is not the main application', () => {
      useApplicationMock.mockReturnValue({ appId: 'testAppId', appTitle: 'Test app' });

      const { result } = renderHook(() => useIsMainApplication(), {
        wrapper: ({ children }) => <TestProviders>{children}</TestProviders>,
      });

      expect(result.current).toBe(false);
    });
  });

  describe('useUrlState', () => {
    beforeEach(() => {
      useLocalStorageMock.mockReturnValue([localStorageQueryParams, setLocalStorageQueryParams]);
    });

    it('it calls setState with default values on first run', () => {
      const { result } = renderHook(() => useUrlState(), {
        wrapper: ({ children }) => <TestProviders>{children}</TestProviders>,
      });

      expect(result.current.queryParams).toStrictEqual(DEFAULT_QUERY_PARAMS);
    });

    it('it updates localstorage with default values on first run', () => {
      renderHook(() => useUrlState(), {
        wrapper: ({ children }) => <TestProviders>{children}</TestProviders>,
      });

      expect(setLocalStorageQueryParams).toHaveBeenCalledWith(LOCAL_STORAGE_DEFAULTS);
    });

    it('it calls history.replace with default values on first run', () => {
      renderHook(() => useUrlState(), {
        wrapper: ({ children }) => <TestProviders>{children}</TestProviders>,
      });

      expect(useHistory().replace).toHaveBeenCalledWith({
        search: stringify(DEFAULT_QUERY_PARAMS),
      });
    });

    it('it takes into account existing localStorage values on first run', () => {
      const existingLocalStorageValues = { perPage: DEFAULT_TABLE_LIMIT + 10, sortOrder: 'asc' };

      useLocalStorageMock.mockReturnValue([existingLocalStorageValues, setLocalStorageQueryParams]);

      renderHook(() => useUrlState(), {
        wrapper: ({ children }) => <TestProviders>{children}</TestProviders>,
      });

      expect(setLocalStorageQueryParams).toHaveBeenCalledWith({
        ...LOCAL_STORAGE_DEFAULTS,
        ...existingLocalStorageValues,
      });
    });

    it('it takes into account existing urlParams on first run', () => {
      const nonDefaultUrlParams = {
        page: DEFAULT_TABLE_ACTIVE_PAGE + 1,
        perPage: DEFAULT_TABLE_LIMIT + 5,
      };
      const expectedUrl = { ...DEFAULT_QUERY_PARAMS, ...nonDefaultUrlParams };

      mockLocation.search = stringify(nonDefaultUrlParams);

      renderHook(() => useUrlState(), {
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
      const existingLocalStorageValues = { perPage: DEFAULT_TABLE_LIMIT + 10 };

      mockLocation.search = stringify(nonDefaultUrlParams);
      useLocalStorageMock.mockReturnValue([existingLocalStorageValues, setLocalStorageQueryParams]);

      const { result } = renderHook(() => useUrlState(), {
        wrapper: ({ children }) => <TestProviders>{children}</TestProviders>,
      });

      expect(result.current.queryParams).toMatchObject({
        ...DEFAULT_QUERY_PARAMS,
        ...nonDefaultUrlParams,
      });
    });

    it('url updated on unmount', () => {
      const { unmount } = renderHook(() => useUrlState(), {
        wrapper: ({ children }) => <TestProviders>{children}</TestProviders>,
      });

      unmount();

      expect(useHistory().replace).toHaveBeenCalledWith({
        search: '',
      });
    });

    it('url updated on unmount leaves existing url unaffected', () => {
      const existingUrlParams = 'foo=bar&lorem=ipsum';

      mockLocation.search = existingUrlParams;

      const { unmount } = renderHook(() => useUrlState(), {
        wrapper: ({ children }) => <TestProviders>{children}</TestProviders>,
      });

      unmount();

      expect(useHistory().replace).toHaveBeenCalledWith({
        search: existingUrlParams,
      });
    });
  });
});
