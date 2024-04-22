/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { renderHook, act } from '@testing-library/react-hooks';
import { waitFor } from '@testing-library/react';
import { CaseStatuses } from '@kbn/cases-components';

import { TestProviders } from '../../common/mock';
import { useAllCasesState } from './use_all_cases_state';
import { DEFAULT_CASES_TABLE_STATE, DEFAULT_TABLE_LIMIT } from '../../containers/constants';
import { SortFieldCase } from '../../containers/types';
import { stringifyUrlParams } from './utils/stringify_url_params';
import { CaseSeverity } from '../../../common';
import type { AllCasesTableState } from './types';
import { CustomFieldTypes } from '../../../common/types/domain';
import { useCaseConfigureResponse } from '../configure_cases/__mock__';
import { useGetCaseConfiguration } from '../../containers/configure/use_get_case_configuration';

const mockLocation = { search: '' };
const mockPush = jest.fn();
const mockReplace = jest.fn();

jest.mock('../../containers/configure/use_get_case_configuration');

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useLocation: jest.fn().mockImplementation(() => {
    return mockLocation;
  }),
  useHistory: jest.fn().mockImplementation(() => ({
    replace: mockReplace,
    push: mockPush,
    location: {
      search: '',
    },
  })),
}));

const useGetCaseConfigurationMock = useGetCaseConfiguration as jest.Mock;

const LS_KEY = 'securitySolution.cases.list.state';

describe('useAllCasesQueryParams', () => {
  beforeEach(() => {
    localStorage.clear();
    mockLocation.search = '';

    useGetCaseConfigurationMock.mockImplementation(() => useCaseConfigureResponse);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('returns default state with empty URL and local storage', () => {
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
    mockLocation.search = stringifyUrlParams({ page: 2, perPage: 15 });

    const { result } = renderHook(() => useAllCasesState(), {
      wrapper: ({ children }) => <TestProviders>{children}</TestProviders>,
    });

    expect(result.current.queryParams).toMatchObject({
      ...DEFAULT_CASES_TABLE_STATE.queryParams,
      ...{ page: 2, perPage: 15 },
    });
  });

  it('takes into account existing url filter options on first run', () => {
    mockLocation.search = stringifyUrlParams({
      severity: [CaseSeverity.CRITICAL],
      status: [CaseStatuses.open],
    });

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
    nonDefaultUrlParams.append('severity', 'all');
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

  it('preserves non cases state url parameters', () => {
    mockLocation.search = `${stringifyUrlParams({
      status: [CaseStatuses.open],
    })}&foo=bar&foo=baz&test=my-test`;

    const { result } = renderHook(() => useAllCasesState(), {
      wrapper: ({ children }) => <TestProviders>{children}</TestProviders>,
    });

    act(() => {
      result.current.setFilterOptions({ severity: [CaseSeverity.MEDIUM] });
    });

    expect(mockPush).toHaveBeenCalledWith({
      search:
        'cases=(page:1,perPage:10,severity:!(medium),sortField:createdAt,sortOrder:desc,status:!(open))&foo=bar&foo=baz&test=my-test',
    });
  });

  it('does not preserve cases state in the url when clearing filters', async () => {
    const defaultStateWithValues: AllCasesTableState = {
      filterOptions: {
        search: 'my search',
        searchFields: ['title'],
        severity: [CaseSeverity.MEDIUM],
        assignees: ['elastic'],
        reporters: [],
        status: [CaseStatuses.closed],
        tags: ['test-tag'],
        owner: ['cases'],
        category: ['test-category'],
        customFields: {
          testCustomField: { options: ['foo'], type: CustomFieldTypes.TEXT },
        },
      },
      queryParams: {
        page: DEFAULT_CASES_TABLE_STATE.queryParams.page + 10,
        perPage: DEFAULT_CASES_TABLE_STATE.queryParams.perPage + 50,
        sortField: SortFieldCase.closedAt,
        sortOrder: 'asc',
      },
    };

    const { result } = renderHook(() => useAllCasesState(), {
      wrapper: ({ children }) => <TestProviders>{children}</TestProviders>,
    });

    act(() => {
      result.current.setFilterOptions(defaultStateWithValues.filterOptions);
    });

    act(() => {
      result.current.setQueryParams(defaultStateWithValues.queryParams);
    });

    await waitFor(() => {
      expect(result.current.queryParams).toStrictEqual(defaultStateWithValues.queryParams);
      expect(result.current.filterOptions).toStrictEqual(defaultStateWithValues.filterOptions);
    });

    act(() => {
      result.current.setFilterOptions(DEFAULT_CASES_TABLE_STATE.filterOptions);
    });

    act(() => {
      result.current.setQueryParams(DEFAULT_CASES_TABLE_STATE.queryParams);
    });

    await waitFor(() => {
      expect(result.current.queryParams).toStrictEqual(DEFAULT_CASES_TABLE_STATE.queryParams);
      expect(result.current.filterOptions).toStrictEqual(DEFAULT_CASES_TABLE_STATE.filterOptions);
    });
  });

  it('urlParams take precedence over localStorage query params values', () => {
    mockLocation.search = stringifyUrlParams({ perPage: 15 });

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
    mockLocation.search = stringifyUrlParams({
      severity: [CaseSeverity.HIGH],
      status: [CaseStatuses.open],
    });

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

  it('loads the URL from the local storage when the URL is empty on first run', async () => {
    const existingLocalStorageValues = {
      queryParams: {
        ...DEFAULT_CASES_TABLE_STATE.queryParams,
        perPage: DEFAULT_CASES_TABLE_STATE.queryParams.perPage + 20,
      },
      filterOptions: DEFAULT_CASES_TABLE_STATE.filterOptions,
    };

    localStorage.setItem(LS_KEY, JSON.stringify(existingLocalStorageValues));

    renderHook(() => useAllCasesState(), {
      wrapper: ({ children }) => <TestProviders>{children}</TestProviders>,
    });

    expect(mockReplace).toHaveBeenCalledWith({
      search: 'cases=(page:1,perPage:30,sortField:createdAt,sortOrder:desc)',
    });
  });

  it('does not load the URL from the local storage when the URL is empty on the second run', async () => {
    const existingLocalStorageValues = {
      queryParams: {
        ...DEFAULT_CASES_TABLE_STATE.queryParams,
        perPage: DEFAULT_CASES_TABLE_STATE.queryParams.perPage + 20,
      },
      filterOptions: DEFAULT_CASES_TABLE_STATE.filterOptions,
    };

    localStorage.setItem(LS_KEY, JSON.stringify(existingLocalStorageValues));

    const { rerender } = renderHook(() => useAllCasesState(), {
      wrapper: ({ children }) => <TestProviders>{children}</TestProviders>,
    });

    rerender();

    expect(mockReplace).toHaveBeenCalledTimes(1);
  });

  it('does not load the URL from the local storage when the URL is not empty', async () => {
    mockLocation.search = stringifyUrlParams({
      severity: [CaseSeverity.HIGH],
      status: [CaseStatuses.open],
    });

    const existingLocalStorageValues = {
      queryParams: {
        ...DEFAULT_CASES_TABLE_STATE.queryParams,
        perPage: DEFAULT_CASES_TABLE_STATE.queryParams.perPage + 20,
      },
      filterOptions: DEFAULT_CASES_TABLE_STATE.filterOptions,
    };

    localStorage.setItem(LS_KEY, JSON.stringify(existingLocalStorageValues));

    renderHook(() => useAllCasesState(), {
      wrapper: ({ children }) => <TestProviders>{children}</TestProviders>,
    });

    expect(mockReplace).toHaveBeenCalledTimes(0);
  });

  it('loads the state from the URL correctly', () => {
    mockLocation.search = stringifyUrlParams({
      severity: [CaseSeverity.HIGH],
      status: [CaseStatuses['in-progress']],
    });

    const { result } = renderHook(() => useAllCasesState(), {
      wrapper: ({ children }) => <TestProviders>{children}</TestProviders>,
    });

    expect(result.current.queryParams).toStrictEqual(DEFAULT_CASES_TABLE_STATE.queryParams);
    expect(result.current.filterOptions).toStrictEqual({
      ...DEFAULT_CASES_TABLE_STATE.filterOptions,
      status: [CaseStatuses['in-progress']],
      severity: [CaseSeverity.HIGH],
    });
  });

  it('loads the state from the local storage if they URL is empty correctly', () => {
    const existingLocalStorageValues = {
      queryParams: {
        ...DEFAULT_CASES_TABLE_STATE.queryParams,
        perPage: DEFAULT_CASES_TABLE_STATE.queryParams.perPage + 20,
      },
      filterOptions: DEFAULT_CASES_TABLE_STATE.filterOptions,
    };

    localStorage.setItem(LS_KEY, JSON.stringify(existingLocalStorageValues));

    const { result } = renderHook(() => useAllCasesState(), {
      wrapper: ({ children }) => <TestProviders>{children}</TestProviders>,
    });

    expect(result.current.queryParams).toStrictEqual({
      ...DEFAULT_CASES_TABLE_STATE.queryParams,
      perPage: DEFAULT_CASES_TABLE_STATE.queryParams.perPage + 20,
    });
    expect(result.current.filterOptions).toStrictEqual(DEFAULT_CASES_TABLE_STATE.filterOptions);
  });

  it('updates the query params correctly', () => {
    const { result } = renderHook(() => useAllCasesState(), {
      wrapper: ({ children }) => <TestProviders>{children}</TestProviders>,
    });

    act(() => {
      result.current.setQueryParams({
        perPage: DEFAULT_CASES_TABLE_STATE.queryParams.perPage + 20,
      });
    });

    expect(result.current.queryParams).toStrictEqual({
      ...DEFAULT_CASES_TABLE_STATE.queryParams,
      perPage: DEFAULT_CASES_TABLE_STATE.queryParams.perPage + 20,
    });
    expect(result.current.filterOptions).toStrictEqual(DEFAULT_CASES_TABLE_STATE.filterOptions);
  });

  it('updates URL when updating the query params', () => {
    const { result } = renderHook(() => useAllCasesState(), {
      wrapper: ({ children }) => <TestProviders>{children}</TestProviders>,
    });

    act(() => {
      result.current.setQueryParams({
        perPage: DEFAULT_CASES_TABLE_STATE.queryParams.perPage + 20,
      });
    });

    expect(mockPush).toHaveBeenCalledWith({
      search: 'cases=(page:1,perPage:30,sortField:createdAt,sortOrder:desc)',
    });
  });

  it('updates the local storage when updating the query params', () => {
    const { result } = renderHook(() => useAllCasesState(), {
      wrapper: ({ children }) => <TestProviders>{children}</TestProviders>,
    });

    act(() => {
      result.current.setQueryParams({
        perPage: DEFAULT_CASES_TABLE_STATE.queryParams.perPage + 20,
      });
    });

    const localStorageState = JSON.parse(localStorage.getItem(LS_KEY) ?? '{}');
    expect(localStorageState).toEqual({
      ...DEFAULT_CASES_TABLE_STATE,
      queryParams: {
        ...DEFAULT_CASES_TABLE_STATE.queryParams,
        perPage: DEFAULT_CASES_TABLE_STATE.queryParams.perPage + 20,
      },
    });
  });

  it('updates the filter options correctly', () => {
    const { result } = renderHook(() => useAllCasesState(), {
      wrapper: ({ children }) => <TestProviders>{children}</TestProviders>,
    });

    act(() => {
      result.current.setFilterOptions({ status: [CaseStatuses.closed] });
    });

    expect(result.current.queryParams).toStrictEqual(DEFAULT_CASES_TABLE_STATE.queryParams);
    expect(result.current.filterOptions).toStrictEqual({
      ...DEFAULT_CASES_TABLE_STATE.filterOptions,
      status: [CaseStatuses.closed],
    });
  });

  it('updates the URL when updating the filter options', () => {
    const { result } = renderHook(() => useAllCasesState(), {
      wrapper: ({ children }) => <TestProviders>{children}</TestProviders>,
    });

    act(() => {
      result.current.setFilterOptions({ status: [CaseStatuses.closed] });
    });

    expect(mockPush).toHaveBeenCalledWith({
      search: 'cases=(page:1,perPage:10,sortField:createdAt,sortOrder:desc,status:!(closed))',
    });
  });

  it('updates the local storage when updating the filter options', () => {
    const { result } = renderHook(() => useAllCasesState(), {
      wrapper: ({ children }) => <TestProviders>{children}</TestProviders>,
    });

    act(() => {
      result.current.setFilterOptions({ status: [CaseStatuses.closed] });
    });

    const localStorageState = JSON.parse(localStorage.getItem(LS_KEY) ?? '{}');
    expect(localStorageState).toEqual({
      ...DEFAULT_CASES_TABLE_STATE,
      filterOptions: {
        ...DEFAULT_CASES_TABLE_STATE.filterOptions,
        status: [CaseStatuses.closed],
      },
    });
  });

  it('updates the local storage when navigating to a URL and the query params are not empty', () => {
    mockLocation.search = stringifyUrlParams({
      severity: [CaseSeverity.HIGH],
      status: [CaseStatuses['in-progress']],
      customFields: { my_field: ['foo'] },
    });

    useGetCaseConfigurationMock.mockImplementation(() => ({
      ...useCaseConfigureResponse,
      data: {
        ...useCaseConfigureResponse.data,
        customFields: [
          { key: 'my_field', required: false, type: CustomFieldTypes.TEXT, label: 'foo' },
        ],
      },
    }));

    renderHook(() => useAllCasesState(), {
      wrapper: ({ children }) => <TestProviders>{children}</TestProviders>,
    });

    const localStorageState = JSON.parse(localStorage.getItem(LS_KEY) ?? '{}');

    expect(localStorageState).toEqual({
      ...DEFAULT_CASES_TABLE_STATE,
      filterOptions: {
        ...DEFAULT_CASES_TABLE_STATE.filterOptions,
        severity: [CaseSeverity.HIGH],
        status: [CaseStatuses['in-progress']],
        customFields: { my_field: { options: ['foo'], type: CustomFieldTypes.TEXT } },
      },
    });
  });

  it('does not update the local storage when navigating to an empty URL', () => {
    const lsSpy = jest.spyOn(Storage.prototype, 'setItem');

    renderHook(() => useAllCasesState(), {
      wrapper: ({ children }) => <TestProviders>{children}</TestProviders>,
    });

    // first call is the initial call made by useLocalStorage
    expect(lsSpy).toBeCalledTimes(1);
  });

  it('does not update the local storage on the second run', () => {
    mockLocation.search = stringifyUrlParams({
      severity: [CaseSeverity.HIGH],
      status: [CaseStatuses['in-progress']],
    });

    const lsSpy = jest.spyOn(Storage.prototype, 'setItem');

    const { rerender } = renderHook(() => useAllCasesState(), {
      wrapper: ({ children }) => <TestProviders>{children}</TestProviders>,
    });

    rerender();

    // first call is the initial call made by useLocalStorage
    expect(lsSpy).toBeCalledTimes(2);
  });

  it('does not update the local storage when the URL and the local storage are the same', async () => {
    mockLocation.search = stringifyUrlParams({
      perPage: DEFAULT_CASES_TABLE_STATE.queryParams.perPage + 20,
    });

    const lsSpy = jest.spyOn(Storage.prototype, 'setItem');

    const existingLocalStorageValues = {
      queryParams: {
        ...DEFAULT_CASES_TABLE_STATE.queryParams,
        perPage: DEFAULT_CASES_TABLE_STATE.queryParams.perPage + 20,
      },
      filterOptions: DEFAULT_CASES_TABLE_STATE.filterOptions,
    };

    localStorage.setItem(LS_KEY, JSON.stringify(existingLocalStorageValues));

    renderHook(() => useAllCasesState(), {
      wrapper: ({ children }) => <TestProviders>{children}</TestProviders>,
    });

    // first call is the initial call made by useLocalStorage
    expect(lsSpy).toBeCalledTimes(2);
  });

  it('does not update the local storage when the custom field configuration is loading', async () => {
    mockLocation.search = stringifyUrlParams({
      severity: [CaseSeverity.HIGH],
      status: [CaseStatuses['in-progress']],
    });

    useGetCaseConfigurationMock.mockImplementation(() => ({
      ...useCaseConfigureResponse,
      isFetching: true,
    }));

    const lsSpy = jest.spyOn(Storage.prototype, 'setItem');

    renderHook(() => useAllCasesState(), {
      wrapper: ({ children }) => <TestProviders>{children}</TestProviders>,
    });

    // first call is the initial call made by useLocalStorage
    expect(lsSpy).toBeCalledTimes(1);
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
      mockLocation.search = stringifyUrlParams({ perPage: 1000 });

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
      // @ts-expect-error: testing invalid sortOrder
      mockLocation.search = stringifyUrlParams({ sortOrder: 'foobar' });

      const { result } = renderHook(() => useAllCasesState(), {
        wrapper: ({ children }) => <TestProviders>{children}</TestProviders>,
      });

      expect(result.current.queryParams).toMatchObject({ sortOrder: 'desc' });
    });
  });

  describe('Modal', () => {
    it('returns default state with empty URL and local storage', () => {
      const { result } = renderHook(() => useAllCasesState(true), {
        wrapper: ({ children }) => <TestProviders>{children}</TestProviders>,
      });

      expect(result.current.queryParams).toStrictEqual(DEFAULT_CASES_TABLE_STATE.queryParams);
      expect(result.current.filterOptions).toStrictEqual(DEFAULT_CASES_TABLE_STATE.filterOptions);
    });

    it('updates the query params correctly', () => {
      const { result } = renderHook(() => useAllCasesState(true), {
        wrapper: ({ children }) => <TestProviders>{children}</TestProviders>,
      });

      act(() => {
        result.current.setQueryParams({
          perPage: DEFAULT_CASES_TABLE_STATE.queryParams.perPage + 20,
        });
      });

      expect(result.current.queryParams).toStrictEqual({
        ...DEFAULT_CASES_TABLE_STATE.queryParams,
        perPage: DEFAULT_CASES_TABLE_STATE.queryParams.perPage + 20,
      });
      expect(result.current.filterOptions).toStrictEqual(DEFAULT_CASES_TABLE_STATE.filterOptions);
    });

    it('updates the filter options correctly', () => {
      const { result } = renderHook(() => useAllCasesState(true), {
        wrapper: ({ children }) => <TestProviders>{children}</TestProviders>,
      });

      act(() => {
        result.current.setFilterOptions({ status: [CaseStatuses.closed] });
      });

      expect(result.current.queryParams).toStrictEqual(DEFAULT_CASES_TABLE_STATE.queryParams);
      expect(result.current.filterOptions).toStrictEqual({
        ...DEFAULT_CASES_TABLE_STATE.filterOptions,
        status: [CaseStatuses.closed],
      });
    });

    it('does not update the URL when changing the state of the table', () => {
      const { result } = renderHook(() => useAllCasesState(true), {
        wrapper: ({ children }) => <TestProviders>{children}</TestProviders>,
      });

      act(() => {
        result.current.setQueryParams({ perPage: 20 });
      });

      expect(mockPush).not.toHaveBeenCalled();
    });

    it('does not update the local storage when changing the state of the table', () => {
      const { result } = renderHook(() => useAllCasesState(true), {
        wrapper: ({ children }) => <TestProviders>{children}</TestProviders>,
      });

      act(() => {
        result.current.setQueryParams({
          perPage: DEFAULT_CASES_TABLE_STATE.queryParams.perPage + 20,
        });
      });

      const localStorageState = JSON.parse(localStorage.getItem(LS_KEY) ?? '{}');
      expect(localStorageState).toEqual(DEFAULT_CASES_TABLE_STATE);
    });

    it('does not load the URL from the local storage when the URL is empty on first run', () => {
      const existingLocalStorageValues = {
        queryParams: {
          ...DEFAULT_CASES_TABLE_STATE.queryParams,
          perPage: DEFAULT_CASES_TABLE_STATE.queryParams.perPage + 20,
        },
        filterOptions: DEFAULT_CASES_TABLE_STATE.filterOptions,
      };

      localStorage.setItem(LS_KEY, JSON.stringify(existingLocalStorageValues));

      renderHook(() => useAllCasesState(true), {
        wrapper: ({ children }) => <TestProviders>{children}</TestProviders>,
      });

      expect(mockPush).not.toHaveBeenCalled();
    });

    it('does not load the state from the URL', () => {
      mockLocation.search = stringifyUrlParams({
        severity: [CaseSeverity.HIGH],
        status: [CaseStatuses['in-progress']],
      });

      const { result } = renderHook(() => useAllCasesState(true), {
        wrapper: ({ children }) => <TestProviders>{children}</TestProviders>,
      });

      expect(result.current.queryParams).toStrictEqual(DEFAULT_CASES_TABLE_STATE.queryParams);
      expect(result.current.filterOptions).toStrictEqual(DEFAULT_CASES_TABLE_STATE.filterOptions);
    });

    it('does not load the state from the local storage', () => {
      const existingLocalStorageValues = {
        queryParams: {
          ...DEFAULT_CASES_TABLE_STATE.queryParams,
          perPage: DEFAULT_CASES_TABLE_STATE.queryParams.perPage + 20,
        },
        filterOptions: DEFAULT_CASES_TABLE_STATE.filterOptions,
      };

      localStorage.setItem(LS_KEY, JSON.stringify(existingLocalStorageValues));

      const { result } = renderHook(() => useAllCasesState(true), {
        wrapper: ({ children }) => <TestProviders>{children}</TestProviders>,
      });

      expect(result.current.queryParams).toStrictEqual(DEFAULT_CASES_TABLE_STATE.queryParams);
      expect(result.current.filterOptions).toStrictEqual(DEFAULT_CASES_TABLE_STATE.filterOptions);
    });

    it('does not update the local storage when navigating to a URL and the query params are not empty', () => {
      mockLocation.search = stringifyUrlParams({
        severity: [CaseSeverity.HIGH],
        status: [CaseStatuses['in-progress']],
      });

      renderHook(() => useAllCasesState(true), {
        wrapper: ({ children }) => <TestProviders>{children}</TestProviders>,
      });

      const localStorageState = JSON.parse(localStorage.getItem(LS_KEY) ?? '{}');

      expect(localStorageState).toEqual(DEFAULT_CASES_TABLE_STATE);
    });
  });
});
