/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { registerTestBed } from '../../../../../../test_utils';
import { registerRouter } from '../../../crud_app/services';
import { createRollupJobsStore } from '../../../crud_app/store';
import { JobList } from '../../../crud_app/sections/job_list';

import { wrapComponent } from './setup_context';

const testBedConfig = {
  store: createRollupJobsStore,
  memoryRouter: {
    onRouter: (router) => {
      // register our react memory router
      registerRouter(router);
    },
  },
};

export const setup = registerTestBed(wrapComponent(JobList), testBedConfig);
