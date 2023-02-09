/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { renderHook, act } from '@testing-library/react-hooks';
import { useEnableDataFeed } from './use_enable_data_feed';
import {
  createSecuritySolutionStorageMock,
  kibanaObservable,
  mockGlobalState,
  SUB_PLUGINS_REDUCER,
  TestProviders,
} from '../../../mock';
import { createStore } from '../../../store';
import type { State } from '../../../store';

import type { SecurityJob } from '../types';

const state: State = mockGlobalState;
const { storage } = createSecuritySolutionStorageMock();
const store = createStore(state, SUB_PLUGINS_REDUCER, kibanaObservable, storage);

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <TestProviders store={store}>{children}</TestProviders>
);

const TIMESTAMP = 99999999;
const JOB = {
  isInstalled: false,
  datafeedState: 'failed',
  jobState: 'failed',
  isCompatible: true,
} as SecurityJob;

const mockSetupMlJob = jest.fn().mockReturnValue(Promise.resolve());
const mockStartDatafeeds = jest.fn().mockReturnValue(Promise.resolve());
const mockStopDatafeeds = jest.fn().mockReturnValue(Promise.resolve());

jest.mock('../api', () => ({
  setupMlJob: () => mockSetupMlJob(),
  startDatafeeds: (...params: unknown[]) => mockStartDatafeeds(...params),
  stopDatafeeds: () => mockStopDatafeeds(),
}));

describe('useSecurityJobsHelpers', () => {
  afterEach(() => {
    mockSetupMlJob.mockReset();
    mockStartDatafeeds.mockReset();
    mockStopDatafeeds.mockReset();
  });

  it('renders isLoading=true when installing job', async () => {
    let resolvePromiseCb: (value: unknown) => void;
    mockSetupMlJob.mockReturnValue(
      new Promise((resolve) => {
        resolvePromiseCb = resolve;
      })
    );
    const { result, waitForNextUpdate } = renderHook(() => useEnableDataFeed(), {
      wrapper,
    });
    expect(result.current.isLoading).toBe(false);

    await act(async () => {
      const enableDataFeedPromise = result.current.enableDatafeed(JOB, TIMESTAMP, false);

      await waitForNextUpdate();
      expect(result.current.isLoading).toBe(true);

      resolvePromiseCb({});
      await enableDataFeedPromise;
      expect(result.current.isLoading).toBe(false);
    });
  });

  it('does not call setupMlJob if job is already installed', async () => {
    mockSetupMlJob.mockReturnValue(Promise.resolve());
    const { result } = renderHook(() => useEnableDataFeed(), {
      wrapper,
    });

    await act(async () => {
      await result.current.enableDatafeed({ ...JOB, isInstalled: true }, TIMESTAMP, false);
    });

    expect(mockSetupMlJob).not.toBeCalled();
  });

  it('calls setupMlJob if job is uninstalled', async () => {
    mockSetupMlJob.mockReturnValue(Promise.resolve());
    const { result } = renderHook(() => useEnableDataFeed(), {
      wrapper,
    });
    await act(async () => {
      await result.current.enableDatafeed({ ...JOB, isInstalled: false }, TIMESTAMP, false);
    });
    expect(mockSetupMlJob).toBeCalled();
  });

  it('calls startDatafeeds if enable param is true', async () => {
    const { result } = renderHook(() => useEnableDataFeed(), {
      wrapper,
    });
    await act(async () => {
      await result.current.enableDatafeed(JOB, TIMESTAMP, true);
    });
    expect(mockStartDatafeeds).toBeCalled();
    expect(mockStopDatafeeds).not.toBeCalled();
  });

  it('calls stopDatafeeds if enable param is false', async () => {
    const { result } = renderHook(() => useEnableDataFeed(), {
      wrapper,
    });
    await act(async () => {
      await result.current.enableDatafeed(JOB, TIMESTAMP, false);
    });
    expect(mockStartDatafeeds).not.toBeCalled();
    expect(mockStopDatafeeds).toBeCalled();
  });

  it('calls startDatafeeds with 2 weeks old start date', async () => {
    jest.useFakeTimers().setSystemTime(new Date('1989-03-07'));

    const { result } = renderHook(() => useEnableDataFeed(), {
      wrapper,
    });
    await act(async () => {
      await result.current.enableDatafeed(JOB, TIMESTAMP, true);
    });
    expect(mockStartDatafeeds).toBeCalledWith({
      datafeedIds: [`datafeed-undefined`],
      start: new Date('1989-02-21').getTime(),
    });
  });
});
