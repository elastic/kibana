/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { JobParamsPDFV2 } from '@kbn/reporting-export-types/common';
import { TaskPayloadPDFV2 } from '@kbn/reporting-export-types/common/printable_pdf_v2';
import type { CreateJobFn, CreateJobFnFactory } from '@kbn/reporting-plugin/server/types';

export const createJobFnFactory: CreateJobFnFactory<CreateJobFn<JobParamsPDFV2, TaskPayloadPDFV2>> =
  function createJobFactoryFn() {
    return async function createJob(jobParams) {
      return {
        ...jobParams,
        forceNow: new Date().toISOString(),
      };
    };
  };
