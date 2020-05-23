/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { connect } from 'react-redux';
import { JobCreate as JobCreateView } from './job_create';

import { isSaving, getCreateJobError, getCloneJobConfig } from '../../store/selectors';

import { createJob, clearCreateJobErrors, clearCloneJob } from '../../store/actions';

const mapStateToProps = state => {
  return {
    isSaving: isSaving(state),
    saveError: getCreateJobError(state),
    jobToClone: getCloneJobConfig(state),
  };
};

const mapDispatchToProps = dispatch => {
  return {
    createJob: jobConfig => {
      dispatch(createJob(jobConfig));
    },
    clearCreateJobErrors: () => {
      dispatch(clearCreateJobErrors());
    },
    clearCloneJob: () => {
      dispatch(clearCloneJob());
    },
  };
};

export const JobCreate = connect(mapStateToProps, mapDispatchToProps)(JobCreateView);
