/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  LICENSE_TYPE_TRIAL,
  LICENSE_TYPE_BASIC,
  LICENSE_TYPE_CLOUD_STANDARD,
  LICENSE_TYPE_GOLD,
  LICENSE_TYPE_PLATINUM,
  LICENSE_TYPE_ENTERPRISE,
  CSV_SEARCHSOURCE_IMMEDIATE_TYPE,
} from '@kbn/reporting-plugin/common/constants';
import { ExportTypeDefinition } from '@kbn/reporting-plugin/server/types';
import { ImmediateExecuteFn, runTaskFnFactory } from './execute_job';
import { metadata } from './metadata';

/*
 * These functions are exported to share with the API route handler that
 * generates csv from saved object immediately on request.
 */
export { runTaskFnFactory } from './execute_job';

export const getExportType = (): ExportTypeDefinition<null, ImmediateExecuteFn> => ({
  ...metadata,
  jobType: CSV_SEARCHSOURCE_IMMEDIATE_TYPE,
  jobContentExtension: 'csv',
  createJobFnFactory: null,
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
