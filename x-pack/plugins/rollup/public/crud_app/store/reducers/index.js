/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { combineReducers } from 'redux';
import { jobs } from './jobs';
import { tableState } from './table_state';
import { detailPanel } from './detail_panel';
import { cloneJob } from './clone_job';
import { createJob } from './create_job';
import { updateJob } from './update_job';

export const rollupJobs = combineReducers({
  jobs,
  cloneJob,
  tableState,
  detailPanel,
  createJob,
  updateJob,
});
