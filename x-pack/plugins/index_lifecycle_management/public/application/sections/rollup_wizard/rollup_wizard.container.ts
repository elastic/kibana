/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { connect } from 'react-redux';
import { RollupWizard as RollupWizardView } from './rollup_wizard';

// @ts-ignore
import { isSaving, getCreateJobError, getCloneJobConfig } from './store/selectors';

// @ts-ignore
import { createJob, clearCreateJobErrors, clearCloneJob } from './store/actions';

const mapStateToProps = (state: any) => {
  return {
    isSaving: isSaving(state),
    saveError: getCreateJobError(state),
    jobToClone: getCloneJobConfig(state),
  };
};

const mapDispatchToProps = (dispatch: any) => {
  return {
    createJob: (jobConfig: any) => {
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

export const RollupWizard = connect(mapStateToProps, mapDispatchToProps)(RollupWizardView);
