/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { renderHook, act } from '@testing-library/react-hooks';
import { initialData, useGetCase, UseGetCase } from './use_get_case';
import { basicCase } from './mock';
import * as api from './api';

jest.mock('./api');

describe('useGetCase', () => {
  const abortCtrl = new AbortController();
  beforeEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  it('init', async () => {
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<string, UseGetCase>(() =>
        useGetCase(basicCase.id)
      );
      await waitForNextUpdate();
      expect(result.current).toEqual({
        data: initialData,
        isLoading: true,
        isError: false,
        fetchCase: result.current.fetchCase,
        updateCase: result.current.updateCase,
      });
    });
  });

  it('calls getCase with correct arguments', async () => {
    const spyOnGetCase = jest.spyOn(api, 'getCase');
    await act(async () => {
      const { waitForNextUpdate } = renderHook<string, UseGetCase>(() => useGetCase(basicCase.id));
      await waitForNextUpdate();
      await waitForNextUpdate();
      expect(spyOnGetCase).toBeCalledWith(basicCase.id, true, abortCtrl.signal);
    });
  });

  it('fetch case', async () => {
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<string, UseGetCase>(() =>
        useGetCase(basicCase.id)
      );
      await waitForNextUpdate();
      await waitForNextUpdate();
      expect(result.current).toEqual({
        data: basicCase,
        isLoading: false,
        isError: false,
        fetchCase: result.current.fetchCase,
        updateCase: result.current.updateCase,
      });
    });
  });

  it('refetch case', async () => {
    const spyOnGetCase = jest.spyOn(api, 'getCase');
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<string, UseGetCase>(() =>
        useGetCase(basicCase.id)
      );
      await waitForNextUpdate();
      await waitForNextUpdate();
      result.current.fetchCase();
      expect(spyOnGetCase).toHaveBeenCalledTimes(2);
    });
  });

  it('set isLoading to true when refetching case', async () => {
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<string, UseGetCase>(() =>
        useGetCase(basicCase.id)
      );
      await waitForNextUpdate();
      await waitForNextUpdate();
      result.current.fetchCase();

      expect(result.current.isLoading).toBe(true);
    });
  });

  it('unhappy path', async () => {
    const spyOnGetCase = jest.spyOn(api, 'getCase');
    spyOnGetCase.mockImplementation(() => {
      throw new Error('Something went wrong');
    });

    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<string, UseGetCase>(() =>
        useGetCase(basicCase.id)
      );
      await waitForNextUpdate();
      await waitForNextUpdate();

      expect(result.current).toEqual({
        data: initialData,
        isLoading: false,
        isError: true,
        fetchCase: result.current.fetchCase,
        updateCase: result.current.updateCase,
      });
    });
  });
});
