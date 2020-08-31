/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  LICENSE_TYPE_ENTERPRISE,
  LICENSE_TYPE_GOLD,
  LICENSE_TYPE_PLATINUM,
  LICENSE_TYPE_STANDARD,
  LICENSE_TYPE_TRIAL,
  PDF_JOB_TYPE as jobType,
} from '../../../common/constants';
import { CreateJobFn, WorkerExecuteFn, ExportTypeDefinition } from '../../types';
import { scheduleTaskFnFactory } from './create_job';
import { runTaskFnFactory } from './execute_job';
import { metadata } from './metadata';
import { JobParamsPDF, ScheduledTaskParamsPDF } from './types';

export const getExportType = (): ExportTypeDefinition<
  JobParamsPDF,
  CreateJobFn<JobParamsPDF>,
  ScheduledTaskParamsPDF,
  WorkerExecuteFn<ScheduledTaskParamsPDF>
> => ({
  ...metadata,
  jobType,
  jobContentEncoding: 'base64',
  jobContentExtension: 'pdf',
  scheduleTaskFnFactory,
  runTaskFnFactory,
  validLicenses: [
    LICENSE_TYPE_TRIAL,
    LICENSE_TYPE_STANDARD,
    LICENSE_TYPE_GOLD,
    LICENSE_TYPE_PLATINUM,
    LICENSE_TYPE_ENTERPRISE,
  ],
});
