/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { renderHook, act } from '@testing-library/react-hooks';
import { CaseStatuses } from '../../common/api';
import { SECURITY_SOLUTION_OWNER } from '../../common/constants';
import {
  DEFAULT_FILTER_OPTIONS,
  DEFAULT_QUERY_PARAMS,
  initialData,
  useGetCases,
  UseGetCases,
} from './use_get_cases';
import { UpdateKey } from './types';
import { allCases, basicCase, caseWithAlerts, caseWithAlertsSyncOff } from './mock';
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
        dispatchUpdateCaseProperty: result.current.dispatchUpdateCaseProperty,
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
        dispatchUpdateCaseProperty: result.current.dispatchUpdateCaseProperty,
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

  it('dispatch update case property', async () => {
    const spyOnPatchCase = jest.spyOn(api, 'patchCase');
    await act(async () => {
      const updateCase = {
        updateKey: 'description' as UpdateKey,
        updateValue: 'description update',
        caseId: basicCase.id,
        refetchCasesStatus: jest.fn(),
        version: '99999',
      };
      const { result, waitForNextUpdate } = renderHook<string, UseGetCases>(() => useGetCases(), {
        wrapper: ({ children }) => <TestProviders>{children}</TestProviders>,
      });
      await waitForNextUpdate();
      result.current.dispatchUpdateCaseProperty(updateCase);
      expect(result.current.loading).toEqual(['caseUpdate']);
      expect(spyOnPatchCase).toBeCalledWith(
        basicCase.id,
        { [updateCase.updateKey]: updateCase.updateValue },
        updateCase.version,
        abortCtrl.signal
      );
    });
    expect(addSuccess).toHaveBeenCalledWith({
      title: `Updated "${basicCase.title}"`,
    });
  });

  it('shows a success toast notifying of synced alerts when sync is on', async () => {
    await act(async () => {
      const updateCase = {
        updateKey: 'status' as UpdateKey,
        updateValue: 'open',
        caseId: caseWithAlerts.id,
        refetchCasesStatus: jest.fn(),
        version: '99999',
      };
      const { result, waitForNextUpdate } = renderHook<string, UseGetCases>(() => useGetCases(), {
        wrapper: ({ children }) => <TestProviders>{children}</TestProviders>,
      });
      await waitForNextUpdate();
      result.current.dispatchUpdateCaseProperty(updateCase);
    });
    expect(addSuccess).toHaveBeenCalledWith({
      text: 'Updated the statuses of attached alerts.',
      title: 'Updated "Another horrible breach!!"',
    });
  });

  it('shows a success toast without notifying of synced alerts when sync is off', async () => {
    await act(async () => {
      const updateCase = {
        updateKey: 'status' as UpdateKey,
        updateValue: 'open',
        caseId: caseWithAlertsSyncOff.id,
        refetchCasesStatus: jest.fn(),
        version: '99999',
      };
      const { result, waitForNextUpdate } = renderHook<string, UseGetCases>(() => useGetCases(), {
        wrapper: ({ children }) => <TestProviders>{children}</TestProviders>,
      });
      await waitForNextUpdate();
      result.current.dispatchUpdateCaseProperty(updateCase);
    });
    expect(addSuccess).toHaveBeenCalledWith({
      title: 'Updated "Another horrible breach!!"',
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
        dispatchUpdateCaseProperty: result.current.dispatchUpdateCaseProperty,
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
