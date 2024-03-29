/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createReducer, PayloadAction } from '@reduxjs/toolkit';

import { WritableDraft } from 'immer/dist/types/types-external';
import { IHttpFetchError } from '@kbn/core-http-browser';

import { ActionPayload } from '../utils/actions';
import { TestNowResponse } from '../../../../../common/types';
import {
  clearTestNowMonitorAction,
  hideTestNowFlyoutAction,
  manualTestMonitorAction,
  manualTestRunUpdateAction,
  TestNowPayload,
  toggleTestNowFlyoutAction,
} from './actions';
import {
  MonitorFields,
  ScheduleUnit,
  ServiceLocationErrors,
  SyntheticsMonitorSchedule,
} from '../../../../../common/runtime_types';

export enum TestRunStatus {
  LOADING = 'loading',
  IN_PROGRESS = 'in-progress',
  COMPLETED = 'completed',
}

export const isTestRunning = (testRun?: ManualTestRun) =>
  testRun?.status === TestRunStatus.IN_PROGRESS || testRun?.status === TestRunStatus.LOADING;

export interface ManualTestRun {
  configId: string;
  name: string;
  testRunId?: string;
  status: TestRunStatus;
  schedule: SyntheticsMonitorSchedule;
  locations: MonitorFields['locations'];
  errors?: ServiceLocationErrors;
  fetchError?: { name: string; message: string };
  isTestNowFlyoutOpen: boolean;
  monitor?: TestNowResponse['monitor'];
}

export interface ManualTestRunsState {
  [configId: string]: ManualTestRun;
}

const initialState: ManualTestRunsState = {};

export const manualTestRunsReducer = createReducer(initialState, (builder) => {
  builder
    .addCase(
      String(manualTestMonitorAction.get),
      (state: WritableDraft<ManualTestRunsState>, action: PayloadAction<TestNowPayload>) => {
        state = Object.values(state).reduce((acc, curr) => {
          acc[curr.configId] = {
            ...curr,
            isTestNowFlyoutOpen: false,
          };

          return acc;
        }, state);

        state[action.payload.configId] = {
          configId: action.payload.configId,
          name: action.payload.name,
          status: TestRunStatus.LOADING,
          schedule: { unit: ScheduleUnit.MINUTES, number: '3' },
          locations: [],
          isTestNowFlyoutOpen: true,
        };
      }
    )
    .addCase(
      String(manualTestMonitorAction.success),
      (state: WritableDraft<ManualTestRunsState>, { payload }: PayloadAction<TestNowResponse>) => {
        state[payload.configId] = {
          configId: payload.configId,
          testRunId: payload.testRunId,
          status: TestRunStatus.IN_PROGRESS,
          errors: payload.errors,
          schedule: payload.schedule,
          locations: payload.locations,
          isTestNowFlyoutOpen: true,
          monitor: payload.monitor,
          name: payload.monitor.name,
        };
      }
    )
    .addCase(
      String(manualTestMonitorAction.fail),
      (
        state: WritableDraft<ManualTestRunsState>,
        action: ActionPayload<TestNowResponse, TestNowPayload>
      ) => {
        const fetchError = action.payload as unknown as IHttpFetchError;
        if (fetchError?.request?.url) {
          const { name, message } = fetchError;

          const [, errorMonitor] =
            Object.entries(state).find(
              ([key]) => fetchError.request.url.indexOf(key) > -1 ?? false
            ) ?? [];

          if (errorMonitor) {
            state[errorMonitor.configId] = {
              ...state[errorMonitor.configId],
              status: TestRunStatus.COMPLETED,
              errors: undefined,
              fetchError: { name, message },
            };
          }
        }
        const configId = action.payload.configId ?? action.payload.getPayload?.configId;
        if (configId) {
          state[configId] = {
            ...state[configId],
            status: TestRunStatus.COMPLETED,
            errors: action.payload.errors,
            fetchError: undefined,
          };
        }

        return state;
      }
    )
    .addCase(manualTestRunUpdateAction, (state: WritableDraft<ManualTestRunsState>, action) => {
      const { testRunId, ...rest } = action.payload;
      const configId = Object.keys(state).find((key) => state[key].testRunId === testRunId);
      if (configId) {
        state[configId] = {
          ...state[configId],
          ...rest,
        };
      }
    })
    .addCase(toggleTestNowFlyoutAction, (state: WritableDraft<ManualTestRunsState>, action) => {
      state = Object.values(state).reduce((acc, curr) => {
        acc[curr.configId] = {
          ...curr,
          isTestNowFlyoutOpen: false,
        };

        return acc;
      }, state);

      state[action.payload] = {
        ...state[action.payload],
        isTestNowFlyoutOpen: !state[action.payload].isTestNowFlyoutOpen,
      };
    })
    .addCase(hideTestNowFlyoutAction, (state: WritableDraft<ManualTestRunsState>) => {
      state = Object.values(state).reduce((acc, curr) => {
        acc[curr.configId] = {
          ...curr,
          isTestNowFlyoutOpen: false,
        };

        return acc;
      }, state);
      return state;
    })
    .addCase(
      String(clearTestNowMonitorAction),
      (state: WritableDraft<ManualTestRunsState>, action: PayloadAction<string>) => {
        delete state[action.payload];
      }
    );
});

export * from './actions';
export * from './selectors';
