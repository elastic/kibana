/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { connect } from 'react-redux';
import { JobList as JobListView } from './job_list';

import {
  getJobsList,
} from '../../store/selectors';

import {
  clearAndLoadJobs,
  showDeepLinkedJob,
  closeDetailPanel,
} from '../../store/actions';

const mapStateToProps = (state) => {
  return {
    hasJobs: Boolean(getJobsList(state).length),
  };
};

const mapDispatchToProps = (dispatch) => {
  return {
    clearAndLoadJobs: () => {
      dispatch(clearAndLoadJobs());
    },
    showDeepLinkedJob: () => {
      dispatch(showDeepLinkedJob());
    },
    closeDetailPanel: () => {
      dispatch(closeDetailPanel());
    },
  };
};

export const JobList = connect(mapStateToProps, mapDispatchToProps)(JobListView);
