/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KibanaRequest } from '@kbn/core-http-server';
import { LicenseType } from '@kbn/licensing-plugin/common/types';
import { Logger } from '@kbn/core/server';
import { CreateJobFn, RunTaskFn } from '../../types';

export { decryptJobHeaders } from './decrypt_job_headers';
export { getFullUrls } from './get_full_urls';
export { validateUrls } from './validate_urls';
export { generatePngObservable } from './generate_png';
export { getCustomLogo } from './get_custom_logo';
export { ExportType } from './export_type';

export interface TimeRangeParams {
  min?: Date | string | number | null;
  max?: Date | string | number | null;
}

export interface ExportType<
  SetupDeps = any,
  StartDeps = any,
  JobParamsType extends object = any,
  TaskPayloadType extends object = any
> {
  id: string; // ID for exportTypesRegistry.get()
  name: string; // user-facing string
  jobType: string; // for job params

  jobContentEncoding?: 'base64' | 'csv';
  jobContentExtension: 'pdf' | 'png' | 'csv';

  validLicenses: LicenseType[];

  setup: (setupDeps: SetupDeps) => void;
  start: (startDeps: StartDeps) => void;

  createJob: CreateJobFn<JobParamsType>;
  runTask: RunTaskFn<TaskPayloadType>;

  /*
   * This is needed for the request handler and
   * can be specified for each export type rather pulling it from Reporting Core
   */
  getSpaceId: (req: KibanaRequest, logger: Logger) => string | undefined;
}
