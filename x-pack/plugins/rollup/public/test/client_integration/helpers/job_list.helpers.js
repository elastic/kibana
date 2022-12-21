/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { registerTestBed } from '@kbn/test-jest-helpers';
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
