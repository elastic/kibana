/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Dictionary } from '../../../../../../common/types/common';

export type JobId = string;

export interface DataFrameJob {
  dest: string;
  id: JobId;
  source: string;
}

export enum DATA_FRAME_RUNNING_STATE {
  STARTED = 'started',
  STOPPED = 'stopped',
}
type RunningState = DATA_FRAME_RUNNING_STATE.STARTED | DATA_FRAME_RUNNING_STATE.STOPPED;

export interface DataFrameJobState {
  checkpoint: number;
  current_position: Dictionary<any>;
  // indexer_state is a backend internal attribute
  // and should not be considered in the UI.
  indexer_state: RunningState;
  // task_state is the attribute to check against if a job
  // is running or not.
  task_state: RunningState;
}

export interface DataFrameJobStats {
  documents_indexed: number;
  documents_processed: number;
  index_failures: number;
  index_time_in_ms: number;
  index_total: number;
  pages_processed: number;
  search_failures: number;
  search_time_in_ms: number;
  search_total: number;
  trigger_count: number;
}

export interface DataFrameJobListRow {
  state: DataFrameJobState;
  stats: DataFrameJobStats;
  config: DataFrameJob;
}

// Used to pass on attribute names to table columns
export enum DataFrameJobListColumn {
  configDestIndex = 'config.dest.index',
  configSourceIndex = 'config.source.index',
  id = 'id',
}

export type ItemIdToExpandedRowMap = Dictionary<JSX.Element>;
