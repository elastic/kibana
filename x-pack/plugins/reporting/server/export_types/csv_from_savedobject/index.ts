/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  LICENSE_TYPE_BASIC,
  LICENSE_TYPE_ENTERPRISE,
  LICENSE_TYPE_GOLD,
  LICENSE_TYPE_PLATINUM,
  LICENSE_TYPE_STANDARD,
  LICENSE_TYPE_TRIAL,
} from '../../../common/constants';
import { CSV_FROM_SAVEDOBJECT_JOB_TYPE } from '../../../constants';
import { ExportTypeDefinition } from '../../types';
import { metadata } from './metadata';
import { ImmediateCreateJobFn, scheduleTaskFnFactory } from './create_job';
import { ImmediateExecuteFn, runTaskFnFactory } from './execute_job';
import { JobParamsPanelCsv } from './types';

/*
 * These functions are exported to share with the API route handler that
 * generates csv from saved object immediately on request.
 */
export { scheduleTaskFnFactory } from './create_job';
export { runTaskFnFactory } from './execute_job';

export const getExportType = (): ExportTypeDefinition<
  JobParamsPanelCsv,
  ImmediateCreateJobFn,
  JobParamsPanelCsv,
  ImmediateExecuteFn
> => ({
  ...metadata,
  jobType: CSV_FROM_SAVEDOBJECT_JOB_TYPE,
  jobContentExtension: 'csv',
  scheduleTaskFnFactory,
  runTaskFnFactory,
  validLicenses: [
    LICENSE_TYPE_TRIAL,
    LICENSE_TYPE_BASIC,
    LICENSE_TYPE_STANDARD,
    LICENSE_TYPE_GOLD,
    LICENSE_TYPE_PLATINUM,
    LICENSE_TYPE_ENTERPRISE,
  ],
});
