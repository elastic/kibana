/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { JobParamsCSV } from '@kbn/reporting-export-types/common';
import { TaskPayloadCSV } from '@kbn/reporting-export-types/common/csv_searchsource';
import type { CreateJobFn, CreateJobFnFactory } from '@kbn/reporting-plugin/server/types';

export const createJobFnFactory: CreateJobFnFactory<CreateJobFn<JobParamsCSV, TaskPayloadCSV>> =
  function createJobFactoryFn() {
    return async function createJob(jobParams) {
      return jobParams;
    };
  };
