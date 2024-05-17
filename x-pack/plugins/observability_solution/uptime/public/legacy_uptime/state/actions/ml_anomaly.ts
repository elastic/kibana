/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MlAnomaliesTableRecord } from '@kbn/ml-anomaly-utils';
import type { JobExistResult, MlCapabilitiesResponse } from '@kbn/ml-plugin/public';
import { createAction } from 'redux-actions';
import {
  CreateMLJobSuccess,
  DeleteJobResults,
  HeartbeatIndicesParam,
  MonitorIdParam,
} from './types';
import { createAsyncAction } from './utils';

export const resetMLState = createAction('RESET_ML_STATE');

export const getExistingMLJobAction = createAsyncAction<MonitorIdParam, JobExistResult>(
  'GET_EXISTING_ML_JOB'
);

export const createMLJobAction = createAsyncAction<
  MonitorIdParam & HeartbeatIndicesParam,
  CreateMLJobSuccess | null
>('CREATE_ML_JOB');

export const getMLCapabilitiesAction = createAsyncAction<any, MlCapabilitiesResponse>(
  'GET_ML_CAPABILITIES'
);

export const deleteMLJobAction = createAsyncAction<MonitorIdParam, DeleteJobResults>(
  'DELETE_ML_JOB'
);

export interface AnomalyRecordsParams {
  dateStart: number;
  dateEnd: number;
  listOfMonitorIds: string[];
  anomalyThreshold?: number;
}

export interface AnomalyRecords {
  anomalies: MlAnomaliesTableRecord[];
  interval: string;
}

export const getAnomalyRecordsAction = createAsyncAction<AnomalyRecordsParams, AnomalyRecords>(
  'GET_ANOMALY_RECORDS'
);
