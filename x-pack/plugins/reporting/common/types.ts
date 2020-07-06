/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// eslint-disable-next-line @kbn/eslint/no-restricted-paths
export { ReportingConfigType } from '../server/config';

export type JobId = string;
export type JobStatus =
  | 'completed'
  | 'completed_with_warnings'
  | 'pending'
  | 'processing'
  | 'failed';

export interface SourceJob {
  _id: JobId;
  _source: {
    status: JobStatus;
    output: {
      max_size_reached: boolean;
      csv_contains_formulas: boolean;
    };
    payload: {
      type: string;
      title: string;
    };
  };
}

export interface JobContent {
  content: string;
}

export interface JobSummary {
  id: JobId;
  status: JobStatus;
  title: string;
  type: string;
  maxSizeReached: boolean;
  csvContainsFormulas: boolean;
}

export interface JobStatusBuckets {
  completed: JobSummary[];
  failed: JobSummary[];
}

type DownloadLink = string;
export type DownloadReportFn = (jobId: JobId) => DownloadLink;

type ManagementLink = string;
export type ManagementLinkFn = () => ManagementLink;

export interface PollerOptions {
  functionToPoll: () => Promise<any>;
  pollFrequencyInMillis: number;
  trailing?: boolean;
  continuePollingOnError?: boolean;
  pollFrequencyErrorMultiplier?: number;
  successFunction?: (...args: any) => any;
  errorFunction?: (error: Error) => any;
}

export interface LicenseCheckResults {
  enableLinks: boolean;
  showLinks: boolean;
  message: string;
}
