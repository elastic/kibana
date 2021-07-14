/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

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
  jobtype: string;
  created_by: string | false;
  payload: {
    headers: string; // encrypted headers
    browserTimezone?: string; // may use timezone from advanced settings
    objectType: string;
    title: string;
    layout?: LayoutParams;
    isDeprecated?: boolean;
  };
  meta: { objectType: string; layout?: string };
  migration_version: string;
  status: JobStatus;
  attempts: number;
  output: TaskRunResult | null;
  created_at: string;

  // fields with undefined values exist in report jobs that have not been claimed
  kibana_name?: string;
  kibana_id?: string;
  browser_type?: string;
  timeout?: number;
  max_attempts?: number;
  started_at?: string;
  completed_at?: string;
  process_expiration?: string | null; // must be set to null to clear the expiration
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
export type JobStatus =
  | 'completed'
  | 'completed_with_warnings'
  | 'pending'
  | 'processing'
  | 'failed';

export interface JobContent {
  content: string;
}

/* Info API response: report query results do not need to include the
 * payload.headers or output.content
 */
type ReportSimple = Omit<ReportSource, 'payload' | 'output'> & {
  payload: Omit<ReportSource['payload'], 'headers'>;
} & {
  output?: Omit<Partial<TaskRunResult>, 'content'>; // is undefined for report jobs that are not completed
};

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

export type IlmPolicyMigrationStatus = 'policy-not-found' | 'indices-not-managed-by-policy' | 'ok';

export interface IlmPolicyStatusResponse {
  status: IlmPolicyMigrationStatus;
}
