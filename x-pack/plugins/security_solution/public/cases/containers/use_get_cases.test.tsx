/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { renderHook, act } from '@testing-library/react-hooks';
import {
  DEFAULT_FILTER_OPTIONS,
  DEFAULT_QUERY_PARAMS,
  initialData,
  useGetCases,
  UseGetCases,
} from './use_get_cases';
import { UpdateKey } from './use_update_case';
import { allCases, basicCase } from './mock';
import * as api from './api';

jest.mock('./api');

describe('useGetCases', () => {
  const abortCtrl = new AbortController();
  beforeEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  it('init', async () => {
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<string, UseGetCases>(() => useGetCases());
      await waitForNextUpdate();
      expect(result.current).toEqual({
        data: initialData,
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

  it('calls getCases with correct arguments', async () => {
    const spyOnGetCases = jest.spyOn(api, 'getCases');
    await act(async () => {
      const { waitForNextUpdate } = renderHook<string, UseGetCases>(() => useGetCases());
      await waitForNextUpdate();
      await waitForNextUpdate();
      expect(spyOnGetCases).toBeCalledWith({
        filterOptions: DEFAULT_FILTER_OPTIONS,
        queryParams: DEFAULT_QUERY_PARAMS,
        signal: abortCtrl.signal,
      });
    });
  });

  it('fetch cases', async () => {
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<string, UseGetCases>(() => useGetCases());
      await waitForNextUpdate();
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
      const { result, waitForNextUpdate } = renderHook<string, UseGetCases>(() => useGetCases());
      await waitForNextUpdate();
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
  });

  it('refetch cases', async () => {
    const spyOnGetCases = jest.spyOn(api, 'getCases');
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<string, UseGetCases>(() => useGetCases());
      await waitForNextUpdate();
      await waitForNextUpdate();
      result.current.refetchCases();
      expect(spyOnGetCases).toHaveBeenCalledTimes(2);
    });
  });

  it('set isLoading to true when refetching case', async () => {
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<string, UseGetCases>(() => useGetCases());
      await waitForNextUpdate();
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
      const { result, waitForNextUpdate } = renderHook<string, UseGetCases>(() => useGetCases());
      await waitForNextUpdate();
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
        status: 'closed',
      };
      const { result, waitForNextUpdate } = renderHook<string, UseGetCases>(() => useGetCases());
      await waitForNextUpdate();
      await waitForNextUpdate();
      result.current.setFilters(newFilters);
      await waitForNextUpdate();
      expect(spyOnGetCases.mock.calls[1][0]).toEqual({
        filterOptions: { ...DEFAULT_FILTER_OPTIONS, ...newFilters },
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
      const { result, waitForNextUpdate } = renderHook<string, UseGetCases>(() => useGetCases());
      await waitForNextUpdate();
      await waitForNextUpdate();
      result.current.setQueryParams(newQueryParams);
      await waitForNextUpdate();
      expect(spyOnGetCases.mock.calls[1][0]).toEqual({
        filterOptions: DEFAULT_FILTER_OPTIONS,
        queryParams: { ...DEFAULT_QUERY_PARAMS, ...newQueryParams },
        signal: abortCtrl.signal,
      });
    });
  });
  it('set selected cases', async () => {
    await act(async () => {
      const selectedCases = [basicCase];
      const { result, waitForNextUpdate } = renderHook<string, UseGetCases>(() => useGetCases());
      await waitForNextUpdate();
      await waitForNextUpdate();
      result.current.setSelectedCases(selectedCases);
      expect(result.current.selectedCases).toEqual(selectedCases);
    });
  });
});
