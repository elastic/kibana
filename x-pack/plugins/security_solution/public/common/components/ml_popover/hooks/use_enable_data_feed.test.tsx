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
import { ML_JOB_TELEMETRY_STATUS } from '../../../lib/telemetry';

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

const mockSetupMlJob = jest.fn();
const mockStartDatafeeds = jest.fn();
const mockStopDatafeeds = jest.fn();

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
    mockStartDatafeeds.mockReset();
    mockStopDatafeeds.mockReset();
    mockSetupMlJob.mockReset();

    mockStartDatafeeds.mockReturnValue(
      Promise.resolve({ [`datafeed-${jobId}`]: { started: true } })
    );
    mockStopDatafeeds.mockReturnValue(
      Promise.resolve([{ [`datafeed-${jobId}`]: { stopped: true } }])
    );
    mockSetupMlJob.mockReturnValue(Promise.resolve());
  });

  describe('enableDatafeed', () => {
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
        const enableDataFeedPromise = result.current.enableDatafeed(JOB, TIMESTAMP);

        await waitForNextUpdate();
        expect(result.current.isLoading).toBe(true);

        resolvePromiseCb({});
        await enableDataFeedPromise;
        expect(result.current.isLoading).toBe(false);
      });
    });

    it('does not call setupMlJob if job is already installed', async () => {
      const { result } = renderHook(() => useEnableDataFeed(), {
        wrapper,
      });

      await act(async () => {
        await result.current.enableDatafeed({ ...JOB, isInstalled: true }, TIMESTAMP);
      });

      expect(mockSetupMlJob).not.toBeCalled();
    });

    it('calls setupMlJob if job is uninstalled', async () => {
      const { result } = renderHook(() => useEnableDataFeed(), {
        wrapper,
      });
      await act(async () => {
        await result.current.enableDatafeed({ ...JOB, isInstalled: false }, TIMESTAMP);
      });
      expect(mockSetupMlJob).toBeCalled();
    });

    it('calls startDatafeeds when enableDatafeed is called', async () => {
      const { result } = renderHook(() => useEnableDataFeed(), {
        wrapper,
      });
      await act(async () => {
        await result.current.enableDatafeed(JOB, TIMESTAMP);
      });
      expect(mockStartDatafeeds).toBeCalled();
      expect(mockStopDatafeeds).not.toBeCalled();
    });

    it('calls startDatafeeds with 2 weeks old start date', async () => {
      jest.useFakeTimers().setSystemTime(new Date('1989-03-07'));

      const { result } = renderHook(() => useEnableDataFeed(), {
        wrapper,
      });
      await act(async () => {
        await result.current.enableDatafeed(JOB, TIMESTAMP);
      });
      expect(mockStartDatafeeds).toBeCalledWith({
        datafeedIds: [`datafeed-test_job_id`],
        start: new Date('1989-02-21').getTime(),
      });
    });

    it('return enabled:true when startDataFeed successfully installed the job', async () => {
      const { result } = renderHook(() => useEnableDataFeed(), {
        wrapper,
      });
      await act(async () => {
        const response = await result.current.enableDatafeed(JOB, TIMESTAMP);
        expect(response.enabled).toBeTruthy();
      });
    });

    it('return enabled:false when startDataFeed promise is rejected while installing a job', async () => {
      mockStartDatafeeds.mockReturnValue(Promise.reject(new Error('test_error')));
      const { result } = renderHook(() => useEnableDataFeed(), {
        wrapper,
      });
      await act(async () => {
        const response = await result.current.enableDatafeed(JOB, TIMESTAMP);
        expect(response.enabled).toBeFalsy();
      });
    });

    it('return enabled:false when startDataFeed failed to install the job', async () => {
      mockStartDatafeeds.mockReturnValue(
        Promise.resolve({ [`datafeed-${jobId}`]: { started: false, error: 'test_error' } })
      );

      const { result } = renderHook(() => useEnableDataFeed(), {
        wrapper,
      });
      await act(async () => {
        const response = await result.current.enableDatafeed(JOB, TIMESTAMP);
        expect(response.enabled).toBeFalsy();
      });
    });

    describe('telemetry', () => {
      it('reports telemetry when installing and enabling a job', async () => {
        const { result } = renderHook(() => useEnableDataFeed(), {
          wrapper,
        });

        await act(async () => {
          await result.current.enableDatafeed(JOB, TIMESTAMP);
        });

        expect(mockedTelemetry.reportMLJobUpdate).toHaveBeenCalledWith({
          status: ML_JOB_TELEMETRY_STATUS.moduleInstalled,
          isElasticJob: true,
          jobId,
          moduleId,
        });

        expect(mockedTelemetry.reportMLJobUpdate).toHaveBeenCalledWith({
          status: ML_JOB_TELEMETRY_STATUS.started,
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
          await result.current.enableDatafeed({ ...JOB, isInstalled: true }, TIMESTAMP);
        });

        expect(mockedTelemetry.reportMLJobUpdate).toHaveBeenCalledWith({
          status: ML_JOB_TELEMETRY_STATUS.startError,
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
          await result.current.enableDatafeed(JOB, TIMESTAMP);
        });

        expect(mockedTelemetry.reportMLJobUpdate).toHaveBeenCalledWith({
          status: ML_JOB_TELEMETRY_STATUS.installationError,
          errorMessage: 'Create job failure - test_error',
          isElasticJob: true,
          jobId,
          moduleId,
        });
      });
    });
  });

  describe('disableDatafeed', () => {
    it('return enabled:false when disableDatafeed successfully uninstalled the job', async () => {
      const { result } = renderHook(() => useEnableDataFeed(), {
        wrapper,
      });
      await act(async () => {
        const response = await result.current.disableDatafeed(JOB);
        expect(response.enabled).toBeFalsy();
      });
    });

    it('return enabled:true when promise is rejected while uninstalling the job', async () => {
      mockStopDatafeeds.mockReturnValue(Promise.reject(new Error('test_error')));
      const { result } = renderHook(() => useEnableDataFeed(), {
        wrapper,
      });
      await act(async () => {
        const response = await result.current.disableDatafeed(JOB);
        expect(response.enabled).toBeTruthy();
      });
    });

    it('return enabled:true when disableDatafeed fails to uninstall the job', async () => {
      mockStopDatafeeds.mockReturnValue(
        Promise.resolve([{ [`datafeed-${jobId}`]: { stopped: false, error: 'test_error' } }])
      );

      const { result } = renderHook(() => useEnableDataFeed(), {
        wrapper,
      });
      await act(async () => {
        const response = await result.current.disableDatafeed(JOB);
        expect(response.enabled).toBeTruthy();
      });
    });

    it('calls stopDatafeeds when disableDatafeed is called', async () => {
      const { result } = renderHook(() => useEnableDataFeed(), {
        wrapper,
      });
      await act(async () => {
        await result.current.disableDatafeed(JOB);
      });
      expect(mockStartDatafeeds).not.toBeCalled();
      expect(mockStopDatafeeds).toBeCalled();
    });

    describe('telemetry', () => {
      it('reports telemetry when stopping a job', async () => {
        const { result } = renderHook(() => useEnableDataFeed(), {
          wrapper,
        });
        await act(async () => {
          await result.current.disableDatafeed({ ...JOB, isInstalled: true });
        });

        expect(mockedTelemetry.reportMLJobUpdate).toHaveBeenCalledWith({
          status: ML_JOB_TELEMETRY_STATUS.stopped,
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
          await result.current.disableDatafeed({ ...JOB, isInstalled: true });
        });

        expect(mockedTelemetry.reportMLJobUpdate).toHaveBeenCalledWith({
          status: ML_JOB_TELEMETRY_STATUS.stopError,
          errorMessage: 'Stop job failure - test_error',
          isElasticJob: true,
          jobId,
        });
      });
    });
  });
});
