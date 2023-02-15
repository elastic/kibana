/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  CSV_SAVED_OBJECT_JOB_TYPE as CSV_JOB_TYPE,
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
import { JobParamsCsvFromSavedObject, TaskPayloadCsvFromSavedObject } from './types';

export const getExportType = (): ExportTypeDefinition<
  CreateJobFn<JobParamsCsvFromSavedObject>,
  RunTaskFn<TaskPayloadCsvFromSavedObject>
> => ({
  id: CSV_JOB_TYPE,
  name: CSV_JOB_TYPE,
  jobType: CSV_JOB_TYPE,
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
