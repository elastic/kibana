/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CreateJobFn, CreateJobFnFactory } from '../../../types';
import { validateUrls } from '../../common';
import { JobParamsPNG, TaskPayloadPNG } from '../types';

export const createJobFnFactory: CreateJobFnFactory<CreateJobFn<JobParamsPNG, TaskPayloadPNG>> =
  function createJobFactoryFn() {
    return async function createJob(jobParams) {
      validateUrls([jobParams.relativeUrl]);

      return {
        ...jobParams,
        forceNow: new Date().toISOString(),
      };
    };
  };
