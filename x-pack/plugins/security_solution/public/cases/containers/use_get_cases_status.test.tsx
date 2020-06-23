/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { renderHook, act } from '@testing-library/react-hooks';
import { useGetCasesStatus, UseGetCasesStatus } from './use_get_cases_status';
import { casesStatus } from './mock';
import * as api from './api';

jest.mock('./api');

describe('useGetCasesStatus', () => {
  const abortCtrl = new AbortController();
  beforeEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  it('init', async () => {
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<string, UseGetCasesStatus>(() =>
        useGetCasesStatus()
      );
      await waitForNextUpdate();
      expect(result.current).toEqual({
        countClosedCases: null,
        countOpenCases: null,
        isLoading: true,
        isError: false,
        fetchCasesStatus: result.current.fetchCasesStatus,
      });
    });
  });

  it('calls getCasesStatus api', async () => {
    const spyOnGetCasesStatus = jest.spyOn(api, 'getCasesStatus');
    await act(async () => {
      const { waitForNextUpdate } = renderHook<string, UseGetCasesStatus>(() =>
        useGetCasesStatus()
      );
      await waitForNextUpdate();
      await waitForNextUpdate();
      expect(spyOnGetCasesStatus).toBeCalledWith(abortCtrl.signal);
    });
  });

  it('fetch reporters', async () => {
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<string, UseGetCasesStatus>(() =>
        useGetCasesStatus()
      );
      await waitForNextUpdate();
      await waitForNextUpdate();
      expect(result.current).toEqual({
        countClosedCases: casesStatus.countClosedCases,
        countOpenCases: casesStatus.countOpenCases,
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
      const { result, waitForNextUpdate } = renderHook<string, UseGetCasesStatus>(() =>
        useGetCasesStatus()
      );
      await waitForNextUpdate();
      await waitForNextUpdate();

      expect(result.current).toEqual({
        countClosedCases: 0,
        countOpenCases: 0,
        isLoading: false,
        isError: true,
        fetchCasesStatus: result.current.fetchCasesStatus,
      });
    });
  });
});
