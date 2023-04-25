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
  PDF_JOB_TYPE as jobType,
} from '@kbn/reporting-common/constants';
import { CreateJobFn, RunTaskFn } from '@kbn/reporting-plugin/server/types';
import { JobParamsPDFDeprecated } from '../../../common';
import { TaskPayloadPDF } from '../../../common/types/printable_pdf';
import { ExportTypeDefinition } from '../types';
import { createJobFnFactory } from './create_job';
import { runTaskFnFactory } from './execute_job';
import { metadata } from './metadata';

export const getExportType = (): ExportTypeDefinition<
  CreateJobFn<JobParamsPDFDeprecated>,
  RunTaskFn<TaskPayloadPDF>
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
