/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CreateJobFn, CreateJobFnFactory } from '../../types';
import { JobParamsCsvFromSavedObject, TaskPayloadCsvFromSavedObject } from './types';

type CreateJobFnType = CreateJobFn<JobParamsCsvFromSavedObject, TaskPayloadCsvFromSavedObject>;

export const createJobFnFactory: CreateJobFnFactory<CreateJobFnType> =
  function createJobFactoryFn() {
    return async function createJob(jobParams) {
      // params have been finalized in server/routes/generate_from_savedobject.ts
      return jobParams;
    };
  };
