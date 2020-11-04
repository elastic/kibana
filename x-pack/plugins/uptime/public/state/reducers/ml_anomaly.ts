/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { handleActions } from 'redux-actions';
import {
  getExistingMLJobAction,
  createMLJobAction,
  getAnomalyRecordsAction,
  deleteMLJobAction,
  resetMLState,
  AnomalyRecords,
  getMLCapabilitiesAction,
} from '../actions';
import { asyncInitState, handleAsyncAction } from './utils';
import { AsyncInitState } from './types';
import { MlCapabilitiesResponse, JobExistResult } from '../../../../../plugins/ml/public';
import { CreateMLJobSuccess, DeleteJobResults } from '../actions/types';

export interface MLJobState {
  mlJob: AsyncInitState<JobExistResult>;
  createJob: AsyncInitState<CreateMLJobSuccess>;
  deleteJob: AsyncInitState<DeleteJobResults>;
  anomalies: AsyncInitState<AnomalyRecords>;
  mlCapabilities: AsyncInitState<MlCapabilitiesResponse>;
}

const initialState: MLJobState = {
  mlJob: asyncInitState(),
  createJob: asyncInitState(),
  deleteJob: asyncInitState(),
  anomalies: asyncInitState(),
  mlCapabilities: asyncInitState(),
};

export const mlJobsReducer = handleActions<MLJobState>(
  {
    ...handleAsyncAction<MLJobState>('mlJob', getExistingMLJobAction),
    ...handleAsyncAction<MLJobState>('mlCapabilities', getMLCapabilitiesAction),
    ...handleAsyncAction<MLJobState>('createJob', createMLJobAction),
    ...handleAsyncAction<MLJobState>('deleteJob', deleteMLJobAction),
    ...handleAsyncAction<MLJobState>('anomalies', getAnomalyRecordsAction),
    ...{
      [String(resetMLState)]: (state) => ({
        ...state,
        mlJob: {
          loading: false,
          data: null,
          error: null,
        },
        createJob: {
          data: null,
          error: null,
          loading: false,
        },
        deleteJob: {
          data: null,
          error: null,
          loading: false,
        },
      }),
    },
  },
  initialState
);
