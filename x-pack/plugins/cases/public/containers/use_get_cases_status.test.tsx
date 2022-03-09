/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { renderHook, act } from '@testing-library/react-hooks';
import { useGetCasesStatus, UseGetCasesStatus } from './use_get_cases_status';
import { casesStatus } from './mock';
import * as api from './api';
import { TestProviders } from '../common/mock';
import { SECURITY_SOLUTION_OWNER } from '../../common/constants';

jest.mock('./api');
jest.mock('../common/lib/kibana');

describe('useGetCasesStatus', () => {
  const abortCtrl = new AbortController();
  beforeEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  it('init', async () => {
    const { result } = renderHook<string, UseGetCasesStatus>(() => useGetCasesStatus(), {
      wrapper: ({ children }) => <TestProviders>{children}</TestProviders>,
    });

    await act(async () => {
      expect(result.current).toEqual({
        countClosedCases: null,
        countOpenCases: null,
        countInProgressCases: null,
        isLoading: true,
        isError: false,
        fetchCasesStatus: result.current.fetchCasesStatus,
      });
    });
  });

  it('calls getCasesStatus api', async () => {
    const spyOnGetCasesStatus = jest.spyOn(api, 'getCasesStatus');
    await act(async () => {
      const { waitForNextUpdate } = renderHook<string, UseGetCasesStatus>(
        () => useGetCasesStatus(),
        {
          wrapper: ({ children }) => <TestProviders>{children}</TestProviders>,
        }
      );
      await waitForNextUpdate();
      expect(spyOnGetCasesStatus).toBeCalledWith(abortCtrl.signal, [SECURITY_SOLUTION_OWNER]);
    });
  });

  it('fetch reporters', async () => {
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<string, UseGetCasesStatus>(
        () => useGetCasesStatus(),
        {
          wrapper: ({ children }) => <TestProviders>{children}</TestProviders>,
        }
      );
      await waitForNextUpdate();
      expect(result.current).toEqual({
        countClosedCases: casesStatus.countClosedCases,
        countOpenCases: casesStatus.countOpenCases,
        countInProgressCases: casesStatus.countInProgressCases,
        isLoading: false,
        isError: false,
        fetchCasesStatus: result.current.fetchCasesStatus,
      });
    });
  });

  it('unhappy path', async () => {
    const spyOnGetCasesStatus = jest.spyOn(api, 'getCasesStatus');
    spyOnGetCasesStatus.mockImplementation(() => {
      throw new Error('Something went wrong');
    });

    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<string, UseGetCasesStatus>(
        () => useGetCasesStatus(),
        {
          wrapper: ({ children }) => <TestProviders>{children}</TestProviders>,
        }
      );
      await waitForNextUpdate();

      expect(result.current).toEqual({
        countClosedCases: 0,
        countOpenCases: 0,
        countInProgressCases: 0,
        isLoading: false,
        isError: true,
        fetchCasesStatus: result.current.fetchCasesStatus,
      });
    });
  });
});
