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
import { getAsyncInitialState, handleAsyncAction } from './utils';
import { AsyncInitialState } from './types';
import { MlCapabilitiesResponse } from '../../../../../plugins/ml/common/types/capabilities';
import { CreateMLJobSuccess, DeleteJobResults } from '../actions/types';
import { JobExistResult } from '../../../../../plugins/ml/common/types/data_recognizer';

export interface MLJobState {
  mlJob: AsyncInitialState<JobExistResult>;
  createJob: AsyncInitialState<CreateMLJobSuccess>;
  deleteJob: AsyncInitialState<DeleteJobResults>;
  anomalies: AsyncInitialState<AnomalyRecords>;
  mlCapabilities: AsyncInitialState<MlCapabilitiesResponse>;
}

const initialState: MLJobState = {
  mlJob: getAsyncInitialState(),
  createJob: getAsyncInitialState(),
  deleteJob: getAsyncInitialState(),
  anomalies: getAsyncInitialState(),
  mlCapabilities: getAsyncInitialState(),
};

export const mlJobsReducer = handleActions<MLJobState>(
  {
    ...handleAsyncAction<MLJobState>('mlJob', getExistingMLJobAction),
    ...handleAsyncAction<MLJobState>('mlCapabilities', getMLCapabilitiesAction),
    ...handleAsyncAction<MLJobState>('createJob', createMLJobAction),
    ...handleAsyncAction<MLJobState>('deleteJob', deleteMLJobAction),
    ...handleAsyncAction<MLJobState>('anomalies', getAnomalyRecordsAction),
    ...{
      [String(resetMLState)]: state => ({
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
