/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import type { PdfScreenshotResult, PngScreenshotResult } from '../../../screenshotting/server';
import type { BaseParams, BaseParamsV2, BasePayload, BasePayloadV2, JobId } from './base';

export type { JobParamsPNGDeprecated } from './export_types/png';
export type { JobParamsPNGV2 } from './export_types/png_v2';
export type { JobAppParamsPDF, JobParamsPDFDeprecated } from './export_types/printable_pdf';
export type { JobAppParamsPDFV2, JobParamsPDFV2 } from './export_types/printable_pdf_v2';
export type {
  DownloadReportFn,
  IlmPolicyMigrationStatus,
  IlmPolicyStatusResponse,
  LocatorParams,
  ManagementLinkFn,
  UrlOrUrlLocatorTuple,
} from './url';
export type { JobId, BaseParams, BaseParamsV2, BasePayload, BasePayloadV2 };

export interface ReportDocumentHead {
  _id: string;
  _index: string;
  _seq_no: number;
  _primary_term: number;
}

export interface ReportOutput extends TaskRunResult {
  content: string | null;
  size: number;
}

export interface CsvMetrics {
  rows: number;
}

export type PngMetrics = PngScreenshotResult['metrics'];

export type PdfMetrics = PdfScreenshotResult['metrics'];

export interface TaskRunMetrics {
  csv?: CsvMetrics;
  png?: PngMetrics;
  pdf?: PdfMetrics;
}

export interface TaskRunResult {
  content_type: string | null;
  csv_contains_formulas?: boolean;
  max_size_reached?: boolean;
  warnings?: string[];
  metrics?: TaskRunMetrics;

  /**
   * When running a report task we may finish with warnings that were triggered
   * by an error. We can pass the error code via the task run result to the
   * task runner so that it can be recorded for telemetry.
   *
   * Alternatively, this field can be populated in the event that the task does
   * not complete in the task runner's error handler.
   */
  error_code?: string;
}

export interface ReportSource {
  /*
   * Required fields: populated in RequestHandler.enqueueJob when the request comes in to
   * generate the report
   */
  jobtype: string; // refers to `ExportTypeDefinition.jobType`
  created_by: string | false; // username or `false` if security is disabled. Used for ensuring users can only access the reports they've created.
  payload: BasePayload;
  meta: {
    // for telemetry
    objectType: string;
    layout?: string;
    isDeprecated?: boolean;
  };
  migration_version: string; // for reminding the user to update their POST URL
  attempts: number; // initially populated as 0
  created_at: string; // timestamp in UTC
  status: JobStatus;

  /*
   * `output` is only populated if the report job is completed or failed.
   */
  output: ReportOutput | null;

  /*
   * Optional fields: populated when the job is claimed to execute, and after
   * execution has finished
   */
  kibana_name?: string; // for troubleshooting
  kibana_id?: string; // for troubleshooting
  timeout?: number; // for troubleshooting: the actual comparison uses the config setting xpack.reporting.queue.timeout
  max_attempts?: number; // for troubleshooting: the actual comparison uses the config setting xpack.reporting.capture.maxAttempts
  started_at?: string; // timestamp in UTC
  completed_at?: string; // timestamp in UTC
  process_expiration?: string | null; // timestamp in UTC - is overwritten with `null` when the job needs a retry
  metrics?: TaskRunMetrics;
}

/*
 * The document created by Reporting to store in the .reporting index
 */
export interface ReportDocument extends ReportDocumentHead {
  _source: ReportSource;
}

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

/*
 * Info API response: to avoid unnecessary large payloads on a network, the
 * report query results do not include `payload.headers` or `output.content`,
 * which can be long strings of meaningless text
 */
interface ReportSimple extends Omit<ReportSource, 'payload' | 'output'> {
  payload: Omit<ReportSource['payload'], 'headers'>;
  output?: Omit<ReportOutput, 'content'>; // is undefined for report jobs that are not completed
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
