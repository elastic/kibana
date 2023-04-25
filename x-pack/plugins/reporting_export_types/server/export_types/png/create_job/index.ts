/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CreateJobFn, CreateJobFnFactory } from '@kbn/reporting-plugin/server/types';
import { JobParamsPNGDeprecated, TaskPayloadPNG } from '../../../../common/types/png';
import { validateUrls } from '../../common';

export const createJobFnFactory: CreateJobFnFactory<
  CreateJobFn<JobParamsPNGDeprecated, TaskPayloadPNG>
> = function createJobFactoryFn() {
  return async function createJob(jobParams) {
    validateUrls([jobParams.relativeUrl]);

    return {
      ...jobParams,
      isDeprecated: true,
      forceNow: new Date().toISOString(),
    };
  };
};
