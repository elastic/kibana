/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreSetup, CoreStart, KibanaRequest, Logger } from '@kbn/core/server';
import { CreateJobFn, RunTaskFn } from '../../types';

export { decryptJobHeaders } from './decrypt_job_headers';
export { getFullUrls } from './get_full_urls';
export { validateUrls } from './validate_urls';
export { generatePngObservable } from './generate_png';
export { getCustomLogo } from './get_custom_logo';

export interface TimeRangeParams {
  min?: Date | string | number | null;
  max?: Date | string | number | null;
}

export interface ExportType {
  jobContentExtension: any;
  name: any;
  jobType: any;
  validLicenses: any;
  id: string;
  setup: (core: CoreSetup<object, unknown>, setupDeps: any) => void;
  start: (core: CoreStart, startDeps: any) => void;
  createJob: CreateJobFn;
  runTask: RunTaskFn;
  jobContentEncoding: string;
  getSpaceId(
    req: KibanaRequest<unknown, unknown, unknown, any>,
    logger: Logger
  ): Promise<string | undefined>;
}
