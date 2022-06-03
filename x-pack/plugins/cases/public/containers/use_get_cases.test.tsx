/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { renderHook, act } from '@testing-library/react-hooks';
import { CaseSeverity, CaseStatuses } from '../../common/api';
import { SECURITY_SOLUTION_OWNER } from '../../common/constants';
import {
  DEFAULT_FILTER_OPTIONS,
  DEFAULT_QUERY_PARAMS,
  initialData,
  useGetCases,
  UseGetCases,
} from './use_get_cases';
import { allCases, basicCase } from './mock';
import * as api from './api';
import { TestProviders } from '../common/mock';
import { useToasts } from '../common/lib/kibana';

jest.mock('./api');
jest.mock('../common/lib/kibana');

describe('useGetCases', () => {
  const abortCtrl = new AbortController();
  const addSuccess = jest.fn();
  (useToasts as jest.Mock).mockReturnValue({ addSuccess, addError: jest.fn() });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('init', async () => {
    const { result } = renderHook<string, UseGetCases>(() => useGetCases(), {
      wrapper: ({ children }) => <TestProviders>{children}</TestProviders>,
    });

    await act(async () => {
      expect(result.current).toEqual({
        data: initialData,
        filterOptions: DEFAULT_FILTER_OPTIONS,
        isError: false,
        loading: ['cases'],
        queryParams: DEFAULT_QUERY_PARAMS,
        refetchCases: result.current.refetchCases,
        selectedCases: [],
        setFilters: result.current.setFilters,
        setQueryParams: result.current.setQueryParams,
        setSelectedCases: result.current.setSelectedCases,
      });
    });
  });

  it('calls getCases with correct arguments', async () => {
    const spyOnGetCases = jest.spyOn(api, 'getCases');
    await act(async () => {
      const { waitForNextUpdate } = renderHook<string, UseGetCases>(() => useGetCases(), {
        wrapper: ({ children }) => <TestProviders>{children}</TestProviders>,
      });
      await waitForNextUpdate();
      expect(spyOnGetCases).toBeCalledWith({
        filterOptions: { ...DEFAULT_FILTER_OPTIONS },
        queryParams: DEFAULT_QUERY_PARAMS,
        signal: abortCtrl.signal,
      });
    });
  });

  it('fetch cases', async () => {
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<string, UseGetCases>(() => useGetCases(), {
        wrapper: ({ children }) => <TestProviders>{children}</TestProviders>,
      });
      await waitForNextUpdate();
      expect(result.current).toEqual({
        data: allCases,
        filterOptions: DEFAULT_FILTER_OPTIONS,
        isError: false,
        loading: [],
        queryParams: DEFAULT_QUERY_PARAMS,
        refetchCases: result.current.refetchCases,
        selectedCases: [],
        setFilters: result.current.setFilters,
        setQueryParams: result.current.setQueryParams,
        setSelectedCases: result.current.setSelectedCases,
      });
    });
  });

  it('refetch cases', async () => {
    const spyOnGetCases = jest.spyOn(api, 'getCases');
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<string, UseGetCases>(() => useGetCases(), {
        wrapper: ({ children }) => <TestProviders>{children}</TestProviders>,
      });
      await waitForNextUpdate();
      result.current.refetchCases();
      expect(spyOnGetCases).toHaveBeenCalledTimes(2);
    });
  });

  it('set isLoading to true when refetching case', async () => {
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<string, UseGetCases>(() => useGetCases(), {
        wrapper: ({ children }) => <TestProviders>{children}</TestProviders>,
      });
      await waitForNextUpdate();
      result.current.refetchCases();

      expect(result.current.loading).toEqual(['cases']);
    });
  });

  it('unhappy path', async () => {
    const spyOnGetCases = jest.spyOn(api, 'getCases');
    spyOnGetCases.mockImplementation(() => {
      throw new Error('Something went wrong');
    });

    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<string, UseGetCases>(() => useGetCases(), {
        wrapper: ({ children }) => <TestProviders>{children}</TestProviders>,
      });
      await waitForNextUpdate();

      expect(result.current).toEqual({
        data: initialData,
        filterOptions: DEFAULT_FILTER_OPTIONS,
        isError: true,
        loading: [],
        queryParams: DEFAULT_QUERY_PARAMS,
        refetchCases: result.current.refetchCases,
        selectedCases: [],
        setFilters: result.current.setFilters,
        setQueryParams: result.current.setQueryParams,
        setSelectedCases: result.current.setSelectedCases,
      });
    });
  });

  it('set filters', async () => {
    await act(async () => {
      const spyOnGetCases = jest.spyOn(api, 'getCases');
      const newFilters = {
        search: 'new',
        severity: CaseSeverity.LOW,
        tags: ['new'],
        status: CaseStatuses.closed,
        owner: [SECURITY_SOLUTION_OWNER],
      };

      const { result, waitForNextUpdate } = renderHook<string, UseGetCases>(() => useGetCases(), {
        wrapper: ({ children }) => <TestProviders>{children}</TestProviders>,
      });

      await waitForNextUpdate();
      result.current.setFilters(newFilters);
      await waitForNextUpdate();

      expect(spyOnGetCases.mock.calls[1][0]).toEqual({
        filterOptions: {
          ...DEFAULT_FILTER_OPTIONS,
          ...newFilters,
          owner: [SECURITY_SOLUTION_OWNER],
        },
        queryParams: DEFAULT_QUERY_PARAMS,
        signal: abortCtrl.signal,
      });
    });
  });

  it('set query params', async () => {
    await act(async () => {
      const spyOnGetCases = jest.spyOn(api, 'getCases');
      const newQueryParams = {
        page: 2,
      };

      const { result, waitForNextUpdate } = renderHook<string, UseGetCases>(() => useGetCases(), {
        wrapper: ({ children }) => <TestProviders>{children}</TestProviders>,
      });

      await waitForNextUpdate();
      result.current.setQueryParams(newQueryParams);
      await waitForNextUpdate();

      expect(spyOnGetCases.mock.calls[1][0]).toEqual({
        filterOptions: { ...DEFAULT_FILTER_OPTIONS },
        queryParams: {
          ...DEFAULT_QUERY_PARAMS,
          ...newQueryParams,
        },
        signal: abortCtrl.signal,
      });
    });
  });

  it('set selected cases', async () => {
    await act(async () => {
      const selectedCases = [basicCase];
      const { result, waitForNextUpdate } = renderHook<string, UseGetCases>(() => useGetCases(), {
        wrapper: ({ children }) => <TestProviders>{children}</TestProviders>,
      });
      await waitForNextUpdate();
      result.current.setSelectedCases(selectedCases);
      expect(result.current.selectedCases).toEqual(selectedCases);
    });
  });
});
