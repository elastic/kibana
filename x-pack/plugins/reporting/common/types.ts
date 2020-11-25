/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
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
  _seq_no: unknown;
  _primary_term: unknown;
}

export interface TaskRunResult {
  content_type: string | null;
  content: string | null;
  csv_contains_formulas?: boolean;
  size: number;
  max_size_reached?: boolean;
  warnings?: string[];
}

export interface ReportSource {
  jobtype: string;
  kibana_name: string;
  kibana_id: string;
  created_by: string | false;
  payload: {
    headers: string; // encrypted headers
    browserTimezone?: string; // may use timezone from advanced settings
    objectType: string;
    title: string;
    layout?: LayoutParams;
  };
  meta: { objectType: string; layout?: string };
  browser_type: string;
  max_attempts: number;
  timeout: number;

  status: JobStatus;
  attempts: number;
  output: TaskRunResult | null;
  started_at?: string;
  completed_at?: string;
  created_at: string;
  priority?: number;
  process_expiration?: string;
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

export interface ReportApiJSON {
  id: string;
  index: string;
  kibana_name: string;
  kibana_id: string;
  browser_type: string | undefined;
  created_at: string;
  priority?: number;
  jobtype: string;
  created_by: string | false;
  timeout?: number;
  output?: {
    content_type: string;
    size: number;
    warnings?: string[];
  };
  process_expiration?: string;
  completed_at: string | undefined;
  payload: {
    layout?: LayoutParams;
    title: string;
    browserTimezone?: string;
  };
  meta: {
    layout?: string;
    objectType: string;
  };
  max_attempts: number;
  started_at: string | undefined;
  attempts: number;
  status: string;
}

export interface LicenseCheckResults {
  enableLinks: boolean;
  showLinks: boolean;
  message: string;
}

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
