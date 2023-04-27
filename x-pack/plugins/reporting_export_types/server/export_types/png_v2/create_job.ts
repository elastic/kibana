/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { JobParamsPNGV2 } from '@kbn/reporting-plugin/common/types';
import type { CreateJobFn, CreateJobFnFactory } from '@kbn/reporting-plugin/server/types';
import { TaskPayloadPNGV2 } from '../../../common/png_v2';

export const createJobFnFactory: CreateJobFnFactory<CreateJobFn<JobParamsPNGV2, TaskPayloadPNGV2>> =
  function createJobFactoryFn() {
    return async function createJob({ locatorParams, ...jobParams }) {
      return {
        ...jobParams,
        locatorParams: [locatorParams],
        forceNow: new Date().toISOString(),
      };
    };
  };
