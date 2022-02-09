/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createReducer, PayloadAction } from '@reduxjs/toolkit';
import { WritableDraft } from 'immer/dist/types/types-external';
import { clearTestNowMonitorAction, testNowMonitorAction } from '../actions';
import { TestNowResponse } from '../api';
import { AppState } from '../index';

export enum TestRunStats {
  LOADING = 'loading',
  IN_PROGRESS = 'in-progress',
  COMPLETED = 'completed',
}

interface TestNowRun {
  monitorId: string;
  testRunId?: string;
  status: TestRunStats;
}

export interface TestNowRunsState {
  testNowRuns: TestNowRun[];
}

export const initialState: TestNowRunsState = {
  testNowRuns: [],
};

export const testNowRunsReducer = createReducer(initialState, (builder) => {
  builder
    .addCase(
      String(testNowMonitorAction.get),
      (state: WritableDraft<TestNowRunsState>, action: PayloadAction<string>) => ({
        ...state,
        testNowRuns: [
          ...state.testNowRuns,
          { monitorId: action.payload, status: TestRunStats.LOADING },
        ],
      })
    )
    .addCase(
      String(testNowMonitorAction.success),
      (state: WritableDraft<TestNowRunsState>, { payload }: PayloadAction<TestNowResponse>) => ({
        ...state,
        testNowRuns: state.testNowRuns.map((tRun) =>
          tRun.monitorId === payload.monitorId
            ? {
                monitorId: payload.monitorId,
                testRunId: payload.testRunId,
                status: TestRunStats.IN_PROGRESS,
              }
            : tRun
        ),
      })
    )
    .addCase(
      String(testNowMonitorAction.fail),
      (state: WritableDraft<TestNowRunsState>, action: PayloadAction<TestNowResponse>) => ({
        ...state,
        testNowRuns: [...(state.testNowRuns ?? [])],
      })
    )
    .addCase(
      String(clearTestNowMonitorAction),
      (state: WritableDraft<TestNowRunsState>, action: PayloadAction<string>) => ({
        ...state,
        testNowRuns: state.testNowRuns.filter((tRun) => tRun.monitorId !== action.payload),
      })
    );
});

export const testNowRunsSelector = ({ testNowRuns }: AppState) => testNowRuns.testNowRuns;

export const testNowRunSelector =
  (monitorId?: string) =>
  ({ testNowRuns }: AppState) =>
    testNowRuns.testNowRuns.find((tRun) => monitorId && monitorId === tRun.monitorId);
