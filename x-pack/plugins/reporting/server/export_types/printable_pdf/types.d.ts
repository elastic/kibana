/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ScheduledTaskParams } from '../../../server/types';
import { LayoutInstance, LayoutParams } from '../../lib/layouts';

// Job params: structure of incoming user request data, after being parsed from RISON
export interface JobParamsPDF {
  objectType: string; // visualization, dashboard, etc. Used for job info & telemetry
  title: string;
  relativeUrls: string[];
  browserTimezone: string;
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
