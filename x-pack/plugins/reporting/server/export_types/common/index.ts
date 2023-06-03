/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LicenseType } from '@kbn/licensing-plugin/common/types';
import { BaseParams, BasePayload, CreateJobFn, RunTaskFn } from '../../types';

export { decryptJobHeaders } from './decrypt_job_headers';
export { getFullUrls } from './get_full_urls';
export { validateUrls } from './validate_urls';
export { generatePngObservable } from './generate_png';
export { getCustomLogo } from './get_custom_logo';

export interface TimeRangeParams {
  min?: Date | string | number | null;
  max?: Date | string | number | null;
}

export interface ExportType<
  SetupDeps = object,
  StartDeps = object,
  JobParamsType = BaseParams,
  TaskPayloadType = BasePayload
> {
  id: string; // ID for exportTypesRegistry.get()
  name: string; // user-facing string
  jobType: string; // jobType for job params

  jobContentEncoding?: 'base64' | 'csv';
  jobContentExtension: 'pdf' | 'png' | 'csv';

  validLicenses: LicenseType[];

  setup: (setupDeps: SetupDeps) => void;
  start: (startDeps: StartDeps) => void;

  createJob: CreateJobFn<JobParamsType>;
  runTask: RunTaskFn<TaskPayloadType>;
}
