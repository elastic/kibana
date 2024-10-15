/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  CSV_JOB_TYPE_DEPRECATED as jobType,
  LICENSE_TYPE_BASIC,
  LICENSE_TYPE_ENTERPRISE,
  LICENSE_TYPE_GOLD,
  LICENSE_TYPE_PLATINUM,
  LICENSE_TYPE_CLOUD_STANDARD,
  LICENSE_TYPE_TRIAL,
} from '../../../common/constants';
import { CreateJobFn, ExportTypeDefinition, RunTaskFn } from '../../types';
import { createJobFnFactory } from './create_job';
import { runTaskFnFactory } from './execute_job';
import { metadata } from './metadata';
import { JobParamsDeprecatedCSV, TaskPayloadDeprecatedCSV } from './types';

export const getExportType = (): ExportTypeDefinition<
  CreateJobFn<JobParamsDeprecatedCSV>,
  RunTaskFn<TaskPayloadDeprecatedCSV>
> => ({
  ...metadata,
  jobType,
  jobContentExtension: 'csv',
  createJobFnFactory,
  runTaskFnFactory,
  validLicenses: [
    LICENSE_TYPE_TRIAL,
    LICENSE_TYPE_BASIC,
    LICENSE_TYPE_CLOUD_STANDARD,
    LICENSE_TYPE_GOLD,
    LICENSE_TYPE_PLATINUM,
    LICENSE_TYPE_ENTERPRISE,
  ],
});
