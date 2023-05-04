/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { CreateJobFn, RunTaskFn } from '@kbn/reporting-plugin/server/types';
import {
  LICENSE_TYPE_CLOUD_STANDARD,
  LICENSE_TYPE_ENTERPRISE,
  LICENSE_TYPE_GOLD,
  LICENSE_TYPE_PLATINUM,
  LICENSE_TYPE_TRIAL,
  LICENSE_TYPE_BASIC,
  CSV_JOB_TYPE as jobType,
} from '@kbn/reporting-plugin/common/constants';
import type { ExportTypeDefinition } from '@kbn/reporting-plugin/server/types';
import { JobParamsCSV } from '../../../common';
import { TaskPayloadCSV } from '../../../common/csv_searchsource';
import { createJobFnFactory } from './create_job';
import { runTaskFnFactory } from './execute_job';
import { metadata } from './metadata';

export const getExportType = (): ExportTypeDefinition<
  CreateJobFn<JobParamsCSV>,
  RunTaskFn<TaskPayloadCSV>
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
