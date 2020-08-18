/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CreateJobBaseParams, ScheduledTaskParams } from '../../../server/types';
import { LayoutInstance, LayoutParams } from '../../lib/layouts';

// Job params: structure of incoming user request data, after being parsed from RISON
export interface JobParamsPDF extends CreateJobBaseParams {
  title: string;
  relativeUrls: string[];
  layout: LayoutInstance;
}

// Job payload: structure of stored job data provided by create_job
export interface ScheduledTaskParamsPDF extends ScheduledTaskParams<JobParamsPDF> {
  basePath?: string;
  browserTimezone: string;
  forceNow?: string;
  layout: LayoutParams;
  relativeUrls: string[];
}
