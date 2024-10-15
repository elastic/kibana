/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act } from '@testing-library/react-hooks';
import { useGetCase, UseGetCase } from './use_get_case';
import { basicCase, basicResolvedCase } from './mock';
import * as api from './api';

jest.mock('./api');
jest.mock('../common/lib/kibana');

describe('useGetCase', () => {
  const abortCtrl = new AbortController();
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('init', async () => {
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<string, UseGetCase>(() =>
        useGetCase(basicCase.id)
      );
      await waitForNextUpdate();
      expect(result.current).toEqual({
        data: null,
        resolveOutcome: null,
        isLoading: false,
        isError: false,
        fetchCase: result.current.fetchCase,
        updateCase: result.current.updateCase,
      });
    });
  });

  it('calls resolveCase with correct arguments', async () => {
    const spyOnResolveCase = jest.spyOn(api, 'resolveCase');
    await act(async () => {
      const { waitForNextUpdate } = renderHook<string, UseGetCase>(() => useGetCase(basicCase.id));
      await waitForNextUpdate();
      await waitForNextUpdate();
      expect(spyOnResolveCase).toBeCalledWith(basicCase.id, true, abortCtrl.signal);
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
        resolveOutcome: basicResolvedCase.outcome,
        resolveAliasId: basicResolvedCase.aliasTargetId,
        isLoading: false,
        isError: false,
        fetchCase: result.current.fetchCase,
        updateCase: result.current.updateCase,
      });
    });
  });

  it('refetch case', async () => {
    const spyOnResolveCase = jest.spyOn(api, 'resolveCase');
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<string, UseGetCase>(() =>
        useGetCase(basicCase.id)
      );
      await waitForNextUpdate();
      await waitForNextUpdate();
      result.current.fetchCase();
      expect(spyOnResolveCase).toHaveBeenCalledTimes(2);
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

  it('set isLoading to false when refetching case "silent"ly', async () => {
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<string, UseGetCase>(() =>
        useGetCase(basicCase.id)
      );
      await waitForNextUpdate();
      await waitForNextUpdate();
      result.current.fetchCase(true);

      expect(result.current.isLoading).toBe(false);
    });
  });

  it('unhappy path', async () => {
    const spyOnResolveCase = jest.spyOn(api, 'resolveCase');
    spyOnResolveCase.mockImplementation(() => {
      throw new Error('Something went wrong');
    });

    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<string, UseGetCase>(() =>
        useGetCase(basicCase.id)
      );
      await waitForNextUpdate();
      await waitForNextUpdate();

      expect(result.current).toEqual({
        data: null,
        resolveOutcome: null,
        isLoading: false,
        isError: true,
        fetchCase: result.current.fetchCase,
        updateCase: result.current.updateCase,
      });
    });
  });
});
