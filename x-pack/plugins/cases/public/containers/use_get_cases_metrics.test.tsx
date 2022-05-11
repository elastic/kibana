/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { renderHook, act } from '@testing-library/react-hooks';
import * as api from '../api';
import { TestProviders } from '../common/mock';
import { useGetCasesMetrics, UseGetCasesMetrics } from './use_get_cases_metrics';
import { SECURITY_SOLUTION_OWNER } from '../../common/constants';

jest.mock('../api');
jest.mock('../common/lib/kibana');

describe('useGetReporters', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  it('init', async () => {
    const { result } = renderHook<string, UseGetCasesMetrics>(() => useGetCasesMetrics(), {
      wrapper: ({ children }) => <TestProviders>{children}</TestProviders>,
    });

    await act(async () => {
      expect(result.current).toEqual({
        mttr: 0,
        isLoading: true,
        isError: false,
        fetchCasesMetrics: result.current.fetchCasesMetrics,
      });
    });
  });

  it('calls getCasesMetrics api', async () => {
    const spy = jest.spyOn(api, 'getCasesMetrics');
    await act(async () => {
      const { waitForNextUpdate } = renderHook<string, UseGetCasesMetrics>(
        () => useGetCasesMetrics(),
        {
          wrapper: ({ children }) => <TestProviders>{children}</TestProviders>,
        }
      );

      await waitForNextUpdate();
      expect(spy).toBeCalledWith({
        http: expect.anything(),
        signal: expect.anything(),
        query: {
          features: ['mttr'],
          owner: [SECURITY_SOLUTION_OWNER],
        },
      });
    });
  });

  it('fetch cases metrics', async () => {
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<string, UseGetCasesMetrics>(
        () => useGetCasesMetrics(),
        {
          wrapper: ({ children }) => <TestProviders>{children}</TestProviders>,
        }
      );

      await waitForNextUpdate();
      expect(result.current).toEqual({
        mttr: 12,
        isLoading: false,
        isError: false,
        fetchCasesMetrics: result.current.fetchCasesMetrics,
      });
    });
  });

  it('fetches metrics when fetchCasesMetrics is invoked', async () => {
    const spy = jest.spyOn(api, 'getCasesMetrics');
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<string, UseGetCasesMetrics>(
        () => useGetCasesMetrics(),
        {
          wrapper: ({ children }) => <TestProviders>{children}</TestProviders>,
        }
      );

      await waitForNextUpdate();
      expect(spy).toBeCalledWith({
        http: expect.anything(),
        signal: expect.anything(),
        query: {
          features: ['mttr'],
          owner: [SECURITY_SOLUTION_OWNER],
        },
      });
      result.current.fetchCasesMetrics();
      await waitForNextUpdate();
      expect(spy).toHaveBeenCalledTimes(2);
    });
  });

  it('unhappy path', async () => {
    const spy = jest.spyOn(api, 'getCasesMetrics');
    spy.mockImplementation(() => {
      throw new Error('Oh on. this is impossible');
    });

    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<string, UseGetCasesMetrics>(
        () => useGetCasesMetrics(),
        {
          wrapper: ({ children }) => <TestProviders>{children}</TestProviders>,
        }
      );
      await waitForNextUpdate();

      expect(result.current).toEqual({
        mttr: 0,
        isLoading: false,
        isError: true,
        fetchCasesMetrics: result.current.fetchCasesMetrics,
      });
    });
  });
});
