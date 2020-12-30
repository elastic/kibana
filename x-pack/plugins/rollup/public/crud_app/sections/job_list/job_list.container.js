/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { connect } from 'react-redux';

import { isLoading, jobLoadError, getJobsList } from '../../store/selectors';

import {
  loadJobs,
  refreshJobs,
  openDetailPanel,
  closeDetailPanel,
  cloneJob,
} from '../../store/actions';

import { JobList as JobListView } from './job_list';

const mapStateToProps = (state) => {
  return {
    hasJobs: Boolean(getJobsList(state).length),
    isLoading: isLoading(state),
    jobLoadError: jobLoadError(state),
  };
};

const mapDispatchToProps = (dispatch) => {
  return {
    loadJobs: () => {
      dispatch(loadJobs());
    },
    refreshJobs: () => {
      dispatch(refreshJobs());
    },
    openDetailPanel: (jobId) => {
      dispatch(openDetailPanel({ jobId: jobId }));
    },
    closeDetailPanel: () => {
      dispatch(closeDetailPanel());
    },
    cloneJob: (jobConfig) => {
      dispatch(cloneJob(jobConfig));
    },
  };
};

export const JobList = connect(mapStateToProps, mapDispatchToProps)(JobListView);
