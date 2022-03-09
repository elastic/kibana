/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { renderHook, act } from '@testing-library/react-hooks';
import { useGetReporters, UseGetReporters } from './use_get_reporters';
import { reporters, respReporters } from './mock';
import * as api from './api';
import { TestProviders } from '../common/mock';
import { SECURITY_SOLUTION_OWNER } from '../../common/constants';

jest.mock('./api');
jest.mock('../common/lib/kibana');

describe('useGetReporters', () => {
  const abortCtrl = new AbortController();
  beforeEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  it('init', async () => {
    const { result } = renderHook<string, UseGetReporters>(() => useGetReporters(), {
      wrapper: ({ children }) => <TestProviders>{children}</TestProviders>,
    });

    await act(async () => {
      expect(result.current).toEqual({
        reporters: [],
        respReporters: [],
        isLoading: true,
        isError: false,
        fetchReporters: result.current.fetchReporters,
      });
    });
  });

  it('calls getReporters api', async () => {
    const spyOnGetReporters = jest.spyOn(api, 'getReporters');
    await act(async () => {
      const { waitForNextUpdate } = renderHook<string, UseGetReporters>(() => useGetReporters(), {
        wrapper: ({ children }) => <TestProviders>{children}</TestProviders>,
      });
      await waitForNextUpdate();
      expect(spyOnGetReporters).toBeCalledWith(abortCtrl.signal, [SECURITY_SOLUTION_OWNER]);
    });
  });

  it('fetch reporters', async () => {
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<string, UseGetReporters>(
        () => useGetReporters(),
        {
          wrapper: ({ children }) => <TestProviders>{children}</TestProviders>,
        }
      );
      await waitForNextUpdate();
      expect(result.current).toEqual({
        reporters,
        respReporters,
        isLoading: false,
        isError: false,
        fetchReporters: result.current.fetchReporters,
      });
    });
  });

  it('refetch reporters', async () => {
    const spyOnGetReporters = jest.spyOn(api, 'getReporters');
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<string, UseGetReporters>(
        () => useGetReporters(),
        {
          wrapper: ({ children }) => <TestProviders>{children}</TestProviders>,
        }
      );
      await waitForNextUpdate();
      result.current.fetchReporters();
      expect(spyOnGetReporters).toHaveBeenCalledTimes(2);
    });
  });

  it('unhappy path', async () => {
    const spyOnGetReporters = jest.spyOn(api, 'getReporters');
    spyOnGetReporters.mockImplementation(() => {
      throw new Error('Something went wrong');
    });

    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<string, UseGetReporters>(
        () => useGetReporters(),
        {
          wrapper: ({ children }) => <TestProviders>{children}</TestProviders>,
        }
      );
      await waitForNextUpdate();

      expect(result.current).toEqual({
        reporters: [],
        respReporters: [],
        isLoading: false,
        isError: true,
        fetchReporters: result.current.fetchReporters,
      });
    });
  });
});
