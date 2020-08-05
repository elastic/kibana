/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { connect } from 'react-redux';

import { isUpdating } from '../../../store/selectors';

import { startJobs, stopJobs, deleteJobs, cloneJob } from '../../../store/actions';

import { JobActionMenu as JobActionMenuComponent } from './job_action_menu';

const mapStateToProps = (state) => {
  return {
    isUpdating: isUpdating(state),
  };
};

const mapDispatchToProps = (dispatch, { jobs }) => {
  const jobIds = jobs.map((job) => job.id);
  return {
    startJobs: () => {
      dispatch(startJobs(jobIds));
    },
    stopJobs: () => {
      dispatch(stopJobs(jobIds));
    },
    deleteJobs: () => {
      dispatch(deleteJobs(jobIds));
    },
    cloneJob: (jobConfig) => {
      dispatch(cloneJob(jobConfig));
    },
  };
};

export const JobActionMenu = connect(mapStateToProps, mapDispatchToProps)(JobActionMenuComponent);
