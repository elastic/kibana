/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  LICENSE_TYPE_ENTERPRISE,
  LICENSE_TYPE_GOLD,
  LICENSE_TYPE_PLATINUM,
  LICENSE_TYPE_CLOUD_STANDARD,
  LICENSE_TYPE_TRIAL,
  PDF_JOB_TYPE_V2 as jobType,
} from '@kbn/reporting-plugin/common/constants';
import type { CreateJobFn, RunTaskFn } from '@kbn/reporting-plugin/server/types';
import { JobParamsPDFV2, TaskPayloadPDFV2 } from '../../../common/types/printable_pdf_v2';
import { ExportTypeDefinition } from '../types';
import { createJobFnFactory } from './create_job';
import { runTaskFnFactory } from './execute_job';
import { metadata } from './metadata';

export const getExportType = (): ExportTypeDefinition<
  CreateJobFn<JobParamsPDFV2>,
  RunTaskFn<TaskPayloadPDFV2>
> => ({
  ...metadata,
  jobType,
  jobContentEncoding: 'base64',
  jobContentExtension: 'pdf',
  createJobFnFactory,
  runTaskFnFactory,
  validLicenses: [
    LICENSE_TYPE_TRIAL,
    LICENSE_TYPE_CLOUD_STANDARD,
    LICENSE_TYPE_GOLD,
    LICENSE_TYPE_PLATINUM,
    LICENSE_TYPE_ENTERPRISE,
  ],
});
