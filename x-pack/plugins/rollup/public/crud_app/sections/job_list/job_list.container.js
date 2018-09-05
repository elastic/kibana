/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { connect } from 'react-redux';
import { JobList as JobListView } from './job_list';

import {
  loadJobs,
  openDetailPanel,
  closeDetailPanel,
} from '../../store/actions';

const mapDispatchToProps = (dispatch) => {
  return {
    loadJobs: () => {
      dispatch(loadJobs());
    },
    openDetailPanel: (jobId) => {
      dispatch(openDetailPanel({ jobId: jobId }));
    },
    closeDetailPanel: () => {
      dispatch(closeDetailPanel());
    },
  };
};

export const JobList = connect(null, mapDispatchToProps)(JobListView);
