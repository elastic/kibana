/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  CSV_SEARCHSOURCE_IMMEDIATE_TYPE,
  LICENSE_TYPE_BASIC,
  LICENSE_TYPE_ENTERPRISE,
  LICENSE_TYPE_GOLD,
  LICENSE_TYPE_PLATINUM,
  LICENSE_TYPE_STANDARD,
  LICENSE_TYPE_TRIAL,
} from '../../../common/constants';
import { ImmediateExportTypeInstance } from '../../types';
import { runTaskFnFactory } from './execute_job';
import { metadata } from './metadata';
import { JobParamsDownloadCSV } from './types';

/*
 * These functions are exported to share with the API route handler that
 * generates csv from saved object immediately on request.
 */
export { runTaskFnFactory } from './execute_job';

export const getExportType = (): ImmediateExportTypeInstance<JobParamsDownloadCSV> => ({
  ...metadata,
  jobContentExtension: 'csv',
  jobType: CSV_SEARCHSOURCE_IMMEDIATE_TYPE,
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
