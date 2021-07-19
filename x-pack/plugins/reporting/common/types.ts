/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SerializableState } from 'src/plugins/kibana_utils/common';

export interface PageSizeParams {
  pageMarginTop: number;
  pageMarginBottom: number;
  pageMarginWidth: number;
  tableBorderWidth: number;
  headingHeight: number;
  subheadingHeight: number;
}

export interface LayoutSelectorDictionary {
  screenshot: string;
  renderComplete: string;
  itemsCountAttribute: string;
  timefilterDurationAttribute: string;
}

export interface PdfImageSize {
  width: number;
  height?: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface LayoutParams {
  id: string;
  dimensions?: Size;
  selectors?: LayoutSelectorDictionary;
}

export interface ReportDocumentHead {
  _id: string;
  _index: string;
  _seq_no: number;
  _primary_term: number;
}

export interface TaskRunResult {
  content_type: string | null;
  content: string | null;
  size: number;
  csv_contains_formulas?: boolean;
  max_size_reached?: boolean;
  needs_sorting?: boolean;
  warnings?: string[];
}

export interface ReportSource {
  /*
   * Required fields: populated in enqueue_job when the request comes in to
   * generate the report
   */
  jobtype: string; // refers to `ExportTypeDefinition.jobType`
  created_by: string | false; // username or `false` if security is disabled. Used for ensuring users can only access the reports they've created.
  payload: {
    headers: string; // encrypted headers
    /**
     * PDF V2 reports will contain locators parameters (see {@link LocatorPublic}) that will be converted to {@link KibanaLocation}s when
     * generating a report
     */
    locatorParams?: LocatorParams[];
    isDeprecated?: boolean; // set to true when the export type is being phased out
  } & BaseParams;
  meta: { objectType: string; layout?: string }; // for telemetry
  migration_version: string; // for reminding the user to update their POST URL
  attempts: number; // initially populated as 0
  created_at: string; // timestamp in UTC
  status: JobStatus;

  /*
   * `output` is only populated if the report job is completed or failed.
   */
  output: TaskRunResult | null;

  /*
   * Optional fields: populated when the job is claimed to execute, and after
   * execution has finished
   */
  kibana_name?: string; // for troubleshooting
  kibana_id?: string; // for troubleshooting
  browser_type?: string; // no longer used since chromium is the only option (used to allow phantomjs)
  timeout?: number; // for troubleshooting: the actual comparison uses the config setting xpack.reporting.queue.timeout
  max_attempts?: number; // for troubleshooting: the actual comparison uses the config setting xpack.reporting.capture.maxAttempts
  started_at?: string; // timestamp in UTC
  completed_at?: string; // timestamp in UTC
  process_expiration?: string | null; // timestamp in UTC - is overwritten with `null` when the job needs a retry
}

/*
 * The document created by Reporting to store in the .reporting index
 */
export interface ReportDocument extends ReportDocumentHead {
  _source: ReportSource;
}

export interface BaseParams {
  browserTimezone?: string; // browserTimezone is optional: it is not in old POST URLs that were generated prior to being added to this interface

  layout?: LayoutParams;
  objectType: string;
  title: string;
}

export type JobId = string;

/*
 * JobStatus:
 *  - Begins as 'pending'
 *  - Changes to 'processing` when the job is claimed
 *  - Then 'completed' | 'failed' when execution is done
 * If the job needs a retry, it reverts back to 'pending'.
 */
export type JobStatus =
  | 'completed' // Report was successful
  | 'completed_with_warnings' // The download available for troubleshooting - it **should** show a meaningful error
  | 'pending' // Report job is waiting to be claimed
  | 'processing' // Report job has been claimed and is executing
  | 'failed'; // Report was not successful, and all retries are done. Nothing to download.

export interface JobContent {
  content: string;
}

/*
 * Info API response: to avoid unnecessary large payloads on a network, the
 * report query results do not include `payload.headers` or `output.content`,
 * which can be long strings of meaningless text
 */
interface ReportSimple extends Omit<ReportSource, 'payload' | 'output'> {
  payload: Omit<ReportSource['payload'], 'headers'>;
  output?: Omit<TaskRunResult, 'content'>; // is undefined for report jobs that are not completed
}

/*
 * The response format for all of the report job APIs
 */
export interface ReportApiJSON extends ReportSimple {
  id: string;
  index: string;
}

export interface LicenseCheckResults {
  enableLinks: boolean;
  showLinks: boolean;
  message: string;
}

/* Notifier Toasts */
export interface JobSummary {
  id: JobId;
  status: JobStatus;
  jobtype: ReportSource['jobtype'];
  title: ReportSource['payload']['title'];
  maxSizeReached: TaskRunResult['max_size_reached'];
  csvContainsFormulas: TaskRunResult['csv_contains_formulas'];
}

export interface JobSummarySet {
  completed: JobSummary[];
  failed: JobSummary[];
}

type DownloadLink = string;
export type DownloadReportFn = (jobId: JobId) => DownloadLink;

type ManagementLink = string;
export type ManagementLinkFn = () => ManagementLink;

export interface LocatorParams<P extends SerializableState = SerializableState> {
  id: string;
  version: string;
  params: P;
}

export type IlmPolicyMigrationStatus = 'policy-not-found' | 'indices-not-managed-by-policy' | 'ok';

export interface IlmPolicyStatusResponse {
  status: IlmPolicyMigrationStatus;
}
