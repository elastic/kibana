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
import { createTelemetryServiceMock } from '../../../lib/telemetry/telemetry_service.mock';

const state: State = mockGlobalState;
const { storage } = createSecuritySolutionStorageMock();
const store = createStore(state, SUB_PLUGINS_REDUCER, kibanaObservable, storage);

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <TestProviders store={store}>{children}</TestProviders>
);

const moduleId = 'test_module_id';
const jobId = 'test_job_id';

const TIMESTAMP = 99999999;
const JOB = {
  id: jobId,
  isInstalled: false,
  isElasticJob: true,
  moduleId,
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

const mockedTelemetry = createTelemetryServiceMock();
jest.mock('../../../lib/kibana', () => {
  const original = jest.requireActual('../../../lib/kibana');

  return {
    ...original,
    useKibana: () => ({
      services: {
        telemetry: mockedTelemetry,
      },
    }),
  };
});

describe('useSecurityJobsHelpers', () => {
  afterEach(() => {
    mockSetupMlJob.mockReset();
    mockStartDatafeeds.mockReset();
    mockStopDatafeeds.mockReset();
    mockSetupMlJob.mockReset();
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
      datafeedIds: [`datafeed-test_job_id`],
      start: new Date('1989-02-21').getTime(),
    });
  });

  describe('telemetry', () => {
    it('reports telemetry when installing and enabling a job', async () => {
      mockSetupMlJob.mockReturnValue(new Promise((resolve) => resolve({})));
      const { result } = renderHook(() => useEnableDataFeed(), {
        wrapper,
      });

      await act(async () => {
        await result.current.enableDatafeed(JOB, TIMESTAMP, true);
      });

      expect(mockedTelemetry.reportMLJobUpdate).toHaveBeenCalledWith({
        status: 'module_installed',
        isElasticJob: true,
        jobId,
        moduleId,
      });

      expect(mockedTelemetry.reportMLJobUpdate).toHaveBeenCalledWith({
        status: 'started',
        isElasticJob: true,
        jobId,
      });
    });

    it('reports telemetry when stopping a job', async () => {
      const { result } = renderHook(() => useEnableDataFeed(), {
        wrapper,
      });
      await act(async () => {
        await result.current.enableDatafeed({ ...JOB, isInstalled: true }, TIMESTAMP, false);
      });

      expect(mockedTelemetry.reportMLJobUpdate).toHaveBeenCalledWith({
        status: 'stopped',
        isElasticJob: true,
        jobId,
      });
    });

    it('reports telemetry when stopping a job fails', async () => {
      mockStopDatafeeds.mockReturnValue(Promise.reject(new Error('test_error')));
      const { result } = renderHook(() => useEnableDataFeed(), {
        wrapper,
      });
      await act(async () => {
        await result.current.enableDatafeed({ ...JOB, isInstalled: true }, TIMESTAMP, false);
      });

      expect(mockedTelemetry.reportMLJobUpdate).toHaveBeenCalledWith({
        status: 'stop_error',
        errorMessage: 'Stop job failure - test_error',
        isElasticJob: true,
        jobId,
      });
    });

    it('reports telemetry when starting a job fails', async () => {
      mockStartDatafeeds.mockReturnValue(Promise.reject(new Error('test_error')));
      const { result } = renderHook(() => useEnableDataFeed(), {
        wrapper,
      });
      await act(async () => {
        await result.current.enableDatafeed({ ...JOB, isInstalled: true }, TIMESTAMP, true);
      });

      expect(mockedTelemetry.reportMLJobUpdate).toHaveBeenCalledWith({
        status: 'start_error',
        errorMessage: 'Start job failure - test_error',
        isElasticJob: true,
        jobId,
      });
    });

    it('reports telemetry when installing a module fails', async () => {
      mockSetupMlJob.mockReturnValue(Promise.reject(new Error('test_error')));
      const { result } = renderHook(() => useEnableDataFeed(), {
        wrapper,
      });
      await act(async () => {
        await result.current.enableDatafeed(JOB, TIMESTAMP, true);
      });

      expect(mockedTelemetry.reportMLJobUpdate).toHaveBeenCalledWith({
        status: 'installation_error',
        errorMessage: 'Create job failure - test_error',
        isElasticJob: true,
        jobId,
        moduleId,
      });
    });
  });
});
