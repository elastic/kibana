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
  LICENSE_TYPE_STANDARD,
  LICENSE_TYPE_TRIAL,
  PNG_JOB_TYPE_V2 as jobType,
} from '../../../common/constants';
import { CreateJobFn, ExportTypeDefinition, RunTaskFn } from '../../types';
import { createJobFnFactory } from './create_job';
import { runTaskFnFactory } from './execute_job';
import { metadata } from './metadata';
import { JobParamsPNGV2, TaskPayloadPNGV2 } from './types';

export const getExportType = (): ExportTypeDefinition<
  CreateJobFn<JobParamsPNGV2>,
  RunTaskFn<TaskPayloadPNGV2>
> => ({
  ...metadata,
  jobType,
  jobContentEncoding: 'base64',
  jobContentExtension: 'PNG',
  createJobFnFactory,
  runTaskFnFactory,
  validLicenses: [
    LICENSE_TYPE_TRIAL,
    LICENSE_TYPE_STANDARD,
    LICENSE_TYPE_GOLD,
    LICENSE_TYPE_PLATINUM,
    LICENSE_TYPE_ENTERPRISE,
  ],
});
