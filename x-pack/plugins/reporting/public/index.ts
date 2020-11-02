/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { PluginInitializerContext } from 'src/core/public';
import { ReportingPublicPlugin } from './plugin';
import * as jobCompletionNotifications from './lib/job_completion_notifications';
import { JobId, JobStatus } from '../common/types';

export function plugin(initializerContext: PluginInitializerContext) {
  return new ReportingPublicPlugin(initializerContext);
}

export { ReportingPublicPlugin as Plugin };
export { jobCompletionNotifications };

export interface JobSummary {
  id: JobId;
  status: JobStatus;
  title: string;
  jobtype: string;
  maxSizeReached?: boolean;
  csvContainsFormulas?: boolean;
}

export interface JobSummarySet {
  completed: JobSummary[];
  failed: JobSummary[];
}

type DownloadLink = string;
export type DownloadReportFn = (jobId: JobId) => DownloadLink;

type ManagementLink = string;
export type ManagementLinkFn = () => ManagementLink;
