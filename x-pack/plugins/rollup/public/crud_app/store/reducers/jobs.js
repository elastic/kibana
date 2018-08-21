/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { combineReducers } from 'redux';
import { handleActions } from 'redux-actions';
import {
  loadJobsSuccess,
} from '../actions';

const byId = handleActions({
  [loadJobsSuccess](state, action) {
    const { jobs } = action.payload;
    const newState = {};
    jobs.forEach(job => {
      newState[job.id] = job;
    });
    return newState;
  },
}, {});

const allIds = handleActions({
  [loadJobsSuccess](state, action) {
    const { jobs } = action.payload;
    return jobs.map(job => job.id);
  },
}, []);

export const jobs = combineReducers({
  byId,
  allIds,
});
