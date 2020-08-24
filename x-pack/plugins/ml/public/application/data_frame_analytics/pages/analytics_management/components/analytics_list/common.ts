/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiTableActionsColumnType, Query, Ast } from '@elastic/eui';

import { DATA_FRAME_TASK_STATE } from './data_frame_task_state';
export { DATA_FRAME_TASK_STATE };

import {
  DataFrameAnalyticsId,
  DataFrameAnalyticsConfig,
  ANALYSIS_CONFIG_TYPE,
} from '../../../../common';

export enum DATA_FRAME_MODE {
  BATCH = 'batch',
  CONTINUOUS = 'continuous',
}

export { Query };
export type Clause = Parameters<typeof Query['isMust']>[0];

type ExtractClauseType<T> = T extends (x: any) => x is infer Type ? Type : never;
export type TermClause = ExtractClauseType<typeof Ast['Term']['isInstance']>;
export type FieldClause = ExtractClauseType<typeof Ast['Field']['isInstance']>;

interface ProgressSection {
  phase: string;
  progress_percent: number;
}

export interface DataFrameAnalyticsStats {
  assignment_explanation?: string;
  id: DataFrameAnalyticsId;
  memory_usage?: {
    timestamp?: string;
    peak_usage_bytes: number;
    status: string;
  };
  node?: {
    attributes: Record<string, any>;
    ephemeral_id: string;
    id: string;
    name: string;
    transport_address: string;
  };
  progress: ProgressSection[];
  failure_reason?: string;
  state: DATA_FRAME_TASK_STATE;
}

export function isDataFrameAnalyticsFailed(state: DATA_FRAME_TASK_STATE) {
  return state === DATA_FRAME_TASK_STATE.FAILED;
}

export function isDataFrameAnalyticsRunning(state: DATA_FRAME_TASK_STATE) {
  return (
    state === DATA_FRAME_TASK_STATE.ANALYZING ||
    state === DATA_FRAME_TASK_STATE.REINDEXING ||
    state === DATA_FRAME_TASK_STATE.STARTED ||
    state === DATA_FRAME_TASK_STATE.STARTING
  );
}

export function isDataFrameAnalyticsStopped(state: DATA_FRAME_TASK_STATE) {
  return state === DATA_FRAME_TASK_STATE.STOPPED;
}

export function isDataFrameAnalyticsStats(arg: any): arg is DataFrameAnalyticsStats {
  return (
    typeof arg === 'object' &&
    arg !== null &&
    {}.hasOwnProperty.call(arg, 'state') &&
    Object.values(DATA_FRAME_TASK_STATE).includes(arg.state) &&
    {}.hasOwnProperty.call(arg, 'progress') &&
    Array.isArray(arg.progress)
  );
}

export function getDataFrameAnalyticsProgress(stats: DataFrameAnalyticsStats) {
  if (isDataFrameAnalyticsStats(stats)) {
    return Math.round(
      stats.progress.reduce((p, c) => p + c.progress_percent, 0) / stats.progress.length
    );
  }

  return undefined;
}

export function getDataFrameAnalyticsProgressPhase(
  stats: DataFrameAnalyticsStats
): { currentPhase: number; progress: number; totalPhases: number } {
  let phase = 0;
  let progress = 0;

  for (const progressPhase of stats.progress) {
    phase++;
    progress = progressPhase.progress_percent;
    if (progressPhase.progress_percent < 100) {
      break;
    }
  }
  return { currentPhase: phase, progress, totalPhases: stats.progress.length };
}

export interface DataFrameAnalyticsListRow {
  checkpointing: object;
  config: DataFrameAnalyticsConfig;
  id: DataFrameAnalyticsId;
  job_type:
    | ANALYSIS_CONFIG_TYPE.CLASSIFICATION
    | ANALYSIS_CONFIG_TYPE.OUTLIER_DETECTION
    | ANALYSIS_CONFIG_TYPE.REGRESSION;
  mode: string;
  state: DataFrameAnalyticsStats['state'];
  stats: DataFrameAnalyticsStats;
}

// Used to pass on attribute names to table columns
export enum DataFrameAnalyticsListColumn {
  configDestIndex = 'config.dest.index',
  configSourceIndex = 'config.source.index',
  configCreateTime = 'config.create_time',
  description = 'config.description',
  id = 'id',
  memoryStatus = 'stats.memory_usage.status',
}

export type ItemIdToExpandedRowMap = Record<string, JSX.Element>;

export function isCompletedAnalyticsJob(stats: DataFrameAnalyticsStats) {
  const progress = getDataFrameAnalyticsProgress(stats);
  return stats.state === DATA_FRAME_TASK_STATE.STOPPED && progress === 100;
}

export function getResultsUrl(jobId: string, analysisType: ANALYSIS_CONFIG_TYPE | string) {
  return `#/data_frame_analytics/exploration?_g=(ml:(jobId:${jobId},analysisType:${analysisType}))`;
}

// The single Action type is not exported as is
// from EUI so we use that code to get the single
// Action type from the array of actions.
type ArrayElement<ArrayType extends readonly unknown[]> = ArrayType[number];
export type DataFrameAnalyticsListAction = ArrayElement<
  EuiTableActionsColumnType<DataFrameAnalyticsListRow>['actions']
>;
