/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CreateJobFn, CreateJobFnFactory } from '@kbn/reporting-plugin/server/types';
import { JobParamsCSV, TaskPayloadCSV } from '../../../common/types/csv_searchsource';

export const createJobFnFactory: CreateJobFnFactory<CreateJobFn<JobParamsCSV, TaskPayloadCSV>> =
  function createJobFactoryFn() {
    return async function createJob(jobParams) {
      return jobParams;
    };
  };
