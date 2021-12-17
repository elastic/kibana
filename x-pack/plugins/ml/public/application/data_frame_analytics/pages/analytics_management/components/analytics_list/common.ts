/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiTableActionsColumnType, Query, Ast } from '@elastic/eui';

import { DATA_FRAME_TASK_STATE } from '../../../../../../../common/constants/data_frame_analytics';
import { DataFrameTaskStateType } from '../../../../../../../common/types/data_frame_analytics';
export { DATA_FRAME_TASK_STATE };
export type { DataFrameTaskStateType };

import { DataFrameAnalyticsId, DataFrameAnalyticsConfig } from '../../../../common';
import {
  DataFrameAnalysisConfigType,
  DataFrameAnalyticsStats,
} from '../../../../../../../common/types/data_frame_analytics';

export type { DataFrameAnalyticsStats } from '../../../../../../../common/types/data_frame_analytics';

export enum DATA_FRAME_MODE {
  BATCH = 'batch',
  CONTINUOUS = 'continuous',
}

export { Query };
export type Clause = Parameters<typeof Query['isMust']>[0];

type ExtractClauseType<T> = T extends (x: any) => x is infer Type ? Type : never;
export type TermClause = ExtractClauseType<typeof Ast['Term']['isInstance']>;
export type FieldClause = ExtractClauseType<typeof Ast['Field']['isInstance']>;
export type Value = Parameters<typeof Ast['Term']['must']>[0];

export function isDataFrameAnalyticsFailed(state: DataFrameTaskStateType) {
  return state === DATA_FRAME_TASK_STATE.FAILED;
}

export function isDataFrameAnalyticsRunning(state: DataFrameTaskStateType) {
  return (
    state === DATA_FRAME_TASK_STATE.ANALYZING ||
    state === DATA_FRAME_TASK_STATE.REINDEXING ||
    state === DATA_FRAME_TASK_STATE.STARTED ||
    state === DATA_FRAME_TASK_STATE.STARTING
  );
}

export function isDataFrameAnalyticsStopped(state: DataFrameTaskStateType) {
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

export function getDataFrameAnalyticsProgressPhase(stats: DataFrameAnalyticsStats): {
  currentPhase: number;
  progress: number;
  totalPhases: number;
} {
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
  job_type: DataFrameAnalysisConfigType;
  mode: string;
  state: DataFrameAnalyticsStats['state'];
  stats: DataFrameAnalyticsStats;
  spaceIds?: string[];
}

// Used to pass on attribute names to table columns
export const DataFrameAnalyticsListColumn = {
  configDestIndex: 'config.dest.index',
  configSourceIndex: 'config.source.index',
  configCreateTime: 'config.create_time',
  description: 'config.description',
  id: 'id',
  memoryStatus: 'stats.memory_usage.status',
} as const;

export type ItemIdToExpandedRowMap = Record<string, JSX.Element>;

export function isCompletedAnalyticsJob(stats: DataFrameAnalyticsStats) {
  const progress = getDataFrameAnalyticsProgress(stats);
  return stats.state === DATA_FRAME_TASK_STATE.STOPPED && progress === 100;
}

// The single Action type is not exported as is
// from EUI so we use that code to get the single
// Action type from the array of actions.
type ArrayElement<ArrayType extends readonly unknown[]> = ArrayType[number];
export type DataFrameAnalyticsListAction = ArrayElement<
  EuiTableActionsColumnType<DataFrameAnalyticsListRow>['actions']
>;
