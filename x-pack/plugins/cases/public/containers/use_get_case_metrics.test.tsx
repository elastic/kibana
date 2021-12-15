/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act } from '@testing-library/react-hooks';
import { CaseMetricsFeature } from '../../common/ui';
import { useGetCaseMetrics, UseGetCaseMetrics } from './use_get_case_metrics';
import { basicCase, basicCaseMetrics } from './mock';
import * as api from './api';

jest.mock('./api');
jest.mock('../common/lib/kibana');

describe('useGetCaseMetrics', () => {
  const abortCtrl = new AbortController();
  const features: CaseMetricsFeature[] = ['alerts.count'];

  beforeEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  it('init', async () => {
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<string, UseGetCaseMetrics>(() =>
        useGetCaseMetrics(basicCase.id, features)
      );
      await waitForNextUpdate();
      expect(result.current).toEqual({
        metrics: null,
        isLoading: false,
        isError: false,
        fetchCaseMetrics: result.current.fetchCaseMetrics,
      });
    });
  });

  it('calls getCaseMetrics with correct arguments', async () => {
    const spyOnGetCaseMetrics = jest.spyOn(api, 'getCaseMetrics');
    await act(async () => {
      const { waitForNextUpdate } = renderHook<string, UseGetCaseMetrics>(() =>
        useGetCaseMetrics(basicCase.id, features)
      );
      await waitForNextUpdate();
      await waitForNextUpdate();
      expect(spyOnGetCaseMetrics).toBeCalledWith(basicCase.id, features, abortCtrl.signal);
    });
  });

  it('does not call getCaseMetrics if empty feature parameter passed', async () => {
    const spyOnGetCaseMetrics = jest.spyOn(api, 'getCaseMetrics');
    await act(async () => {
      const { waitForNextUpdate } = renderHook<string, UseGetCaseMetrics>(() =>
        useGetCaseMetrics(basicCase.id, [])
      );
      await waitForNextUpdate();
      expect(spyOnGetCaseMetrics).not.toBeCalled();
    });
  });

  it('fetch case metrics', async () => {
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<string, UseGetCaseMetrics>(() =>
        useGetCaseMetrics(basicCase.id, features)
      );
      await waitForNextUpdate();
      await waitForNextUpdate();
      expect(result.current).toEqual({
        metrics: basicCaseMetrics,
        isLoading: false,
        isError: false,
        fetchCaseMetrics: result.current.fetchCaseMetrics,
      });
    });
  });

  it('refetch case metrics', async () => {
    const spyOnGetCaseMetrics = jest.spyOn(api, 'getCaseMetrics');
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<string, UseGetCaseMetrics>(() =>
        useGetCaseMetrics(basicCase.id, features)
      );
      await waitForNextUpdate();
      await waitForNextUpdate();
      result.current.fetchCaseMetrics();
      expect(spyOnGetCaseMetrics).toHaveBeenCalledTimes(2);
    });
  });

  it('set isLoading to true when refetching case metrics', async () => {
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<string, UseGetCaseMetrics>(() =>
        useGetCaseMetrics(basicCase.id, features)
      );
      await waitForNextUpdate();
      await waitForNextUpdate();
      result.current.fetchCaseMetrics();

      expect(result.current.isLoading).toBe(true);
    });
  });

  it('set isLoading to false when refetching case metrics "silent"ly', async () => {
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<string, UseGetCaseMetrics>(() =>
        useGetCaseMetrics(basicCase.id, features)
      );
      await waitForNextUpdate();
      await waitForNextUpdate();
      result.current.fetchCaseMetrics(true);

      expect(result.current.isLoading).toBe(false);
    });
  });

  it('returns an error when getCaseMetrics throws', async () => {
    const spyOnGetCaseMetrics = jest.spyOn(api, 'getCaseMetrics');
    spyOnGetCaseMetrics.mockImplementation(() => {
      throw new Error('Something went wrong');
    });

    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<string, UseGetCaseMetrics>(() =>
        useGetCaseMetrics(basicCase.id, features)
      );
      await waitForNextUpdate();
      await waitForNextUpdate();

      expect(result.current).toEqual({
        metrics: null,
        isLoading: false,
        isError: true,
        fetchCaseMetrics: result.current.fetchCaseMetrics,
      });
    });
  });
});
