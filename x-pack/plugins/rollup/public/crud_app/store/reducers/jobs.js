/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

const initialState = {
  isLoading: false,
  byId: {},
  allIds: [],
};

export function jobs(state = initialState, action) {
  const { type, payload } = action;

  switch (type) {
    case 'LOAD_JOBS_START':
      return {
        ...state,
        isLoading: true,
      };

    case 'LOAD_JOBS_SUCCESS':
      const { jobs } = payload;

      const newById = {};
      jobs.forEach(job => {
        newById[job.id] = job;
      });

      return {
        byId: newById,
        allIds: jobs.map(job => job.id),
        isLoading: false,
      };

    case 'LOAD_JOBS_FAILURE':
      return {
        ...state,
        isLoading: false,
      };

    case 'CREATE_JOB_SUCCESS':
      const { job } = payload;

      return {
        byId: {
          ...state.byId,
          [job.id]: job,
        },
        allIds: state.allIds.concat(job.id),
      };

    case 'CLEAR_JOBS':
      return {
        byId: {},
        allIds: [],
      };

    default:
      return state;
  }
}
