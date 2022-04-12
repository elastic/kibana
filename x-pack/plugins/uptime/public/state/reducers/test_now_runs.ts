/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createReducer, PayloadAction } from '@reduxjs/toolkit';
import { WritableDraft } from 'immer/dist/types/types-external';
import { IHttpFetchError } from 'kibana/public';
import {
  Locations,
  ScheduleUnit,
  ServiceLocationErrors,
  SyntheticsMonitorSchedule,
} from '../../../common/runtime_types';
import { clearTestNowMonitorAction, testNowMonitorAction } from '../actions';
import { TestNowResponse } from '../api';
import { AppState } from '..';

export enum TestRunStats {
  LOADING = 'loading',
  IN_PROGRESS = 'in-progress',
  COMPLETED = 'completed',
}

interface TestNowRun {
  monitorId: string;
  testRunId?: string;
  status: TestRunStats;
  schedule: SyntheticsMonitorSchedule;
  locations: Locations;
  errors?: ServiceLocationErrors;
  fetchError?: { name: string; message: string };
}

export interface TestNowRunsState {
  [monitorId: string]: TestNowRun;
}

export const initialState: TestNowRunsState = {};

export const testNowRunsReducer = createReducer(initialState, (builder) => {
  builder
    .addCase(
      String(testNowMonitorAction.get),
      (state: WritableDraft<TestNowRunsState>, action: PayloadAction<string>) => ({
        ...state,
        [action.payload]: {
          monitorId: action.payload,
          status: TestRunStats.LOADING,
          schedule: { unit: ScheduleUnit.MINUTES, number: '3' },
          locations: [],
        },
      })
    )
    .addCase(
      String(testNowMonitorAction.success),
      (state: WritableDraft<TestNowRunsState>, { payload }: PayloadAction<TestNowResponse>) => ({
        ...state,
        [payload.monitorId]: {
          monitorId: payload.monitorId,
          testRunId: payload.testRunId,
          status: TestRunStats.IN_PROGRESS,
          errors: payload.errors,
          schedule: payload.schedule,
          locations: payload.locations,
        },
      })
    )
    .addCase(
      String(testNowMonitorAction.fail),
      (state: WritableDraft<TestNowRunsState>, action: PayloadAction<TestNowResponse>) => {
        const fetchError = action.payload as unknown as IHttpFetchError;
        if (fetchError?.request.url) {
          const { name, message } = fetchError;

          const [, errorMonitor] =
            Object.entries(state).find(
              ([key]) => fetchError.request.url.indexOf(key) > -1 ?? false
            ) ?? [];

          if (errorMonitor) {
            return {
              ...state,
              [errorMonitor.monitorId]: {
                ...state[errorMonitor.monitorId],
                status: TestRunStats.COMPLETED,
                errors: undefined,
                fetchError: { name, message },
              },
            };
          }
        }

        if (action.payload.monitorId) {
          return {
            ...state,
            [action.payload.monitorId]: {
              ...state[action.payload.monitorId],
              status: TestRunStats.COMPLETED,
              errors: action.payload.errors,
              fetchError: undefined,
            },
          };
        }

        return state;
      }
    )
    .addCase(
      String(clearTestNowMonitorAction),
      (state: WritableDraft<TestNowRunsState>, action: PayloadAction<string>) => {
        const { [action.payload]: payloadTestRun, ...rest } = state;

        return rest;
      }
    );
});

export const testNowRunsSelector = ({ testNowRuns }: AppState) => testNowRuns.testNowRuns;

export const testNowRunSelector =
  (monitorId?: string) =>
  ({ testNowRuns }: AppState) =>
    monitorId ? testNowRuns[monitorId] : undefined;
