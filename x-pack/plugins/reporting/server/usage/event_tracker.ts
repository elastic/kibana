/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AnalyticsServiceStart } from '@kbn/core/server';
import { EventType, FieldType } from './types';

interface CompletionOpts {
  byteSize: number;
  timeSinceClaimed?: number;
}

interface CompletionOptsScreenshot {
  numPages?: number;
  screenshotPixels?: number;
  screenshotLayout?: string;
}

interface CompletionOptsScreenshotCsv {
  csvRows?: number;
  csvColumns?: number;
}

interface FailureOpts {
  timeSinceClaimed?: number;
  errorCode?: string;
  errorMessage?: string;
}

export class EventTracker {
  private reportEvent: AnalyticsServiceStart['reportEvent'];

  constructor(
    analytics: AnalyticsServiceStart,
    private reportId: string,
    private exportType: string,
    private objectType: string
  ) {
    this.reportEvent = analytics.reportEvent;
  }

  /*
   * When a request is made to generate a report,
   * track if the request came to the public API
   * (scripts / Watcher) and if the export type is
   * deprecated
   */
  public createReport({
    isDeprecated,
    isPublicApi,
  }: {
    isDeprecated: boolean;
    isPublicApi: boolean;
  }) {
    this.reportEvent(EventType.REPORT_CREATION, {
      [FieldType.REPORT_ID]: this.reportId,
      [FieldType.EXPORT_TYPE]: this.exportType,
      [FieldType.OBJECT_TYPE]: this.objectType,
      [FieldType.IS_DEPRECATED]: isDeprecated,
      [FieldType.IS_PUBLIC_API]: isPublicApi,
    });
  }

  /*
   * When a report job is claimed, the time since
   * creation equals the time spent waiting in the
   * queue.
   */
  public claimJob(opts: { timeSinceCreation: number }) {
    const { timeSinceCreation } = opts;
    this.reportEvent(EventType.REPORT_CLAIM, {
      [FieldType.REPORT_ID]: this.reportId,
      [FieldType.EXPORT_TYPE]: this.exportType,
      [FieldType.OBJECT_TYPE]: this.objectType,
      [FieldType.DURATION]: timeSinceCreation,
    });
  }

  /*
   * When a report job is completed, the time
   * since claimed equals the time spent executing
   * the report.
   */
  public completeJobScreenshot(opts: CompletionOpts & CompletionOptsScreenshot) {
    const { byteSize, timeSinceClaimed, numPages, screenshotPixels, screenshotLayout } = opts;
    this.reportEvent(EventType.REPORT_COMPLETION_SCREENSHOT, {
      [FieldType.REPORT_ID]: this.reportId,
      [FieldType.EXPORT_TYPE]: this.exportType,
      [FieldType.OBJECT_TYPE]: this.objectType,
      [FieldType.DURATION]: timeSinceClaimed,
      [FieldType.BYTE_SIZE]: byteSize,
      ...(numPages ? { [FieldType.NUM_PAGES]: numPages } : {}),
      ...(screenshotPixels ? { [FieldType.SCREENSHOT_PIXELS]: screenshotPixels } : {}),
      ...(screenshotLayout ? { [FieldType.SCREENSHOT_LAYOUT]: screenshotLayout } : {}),
    });
  }

  /*
   * When a report job is completed, the time
   * since claimed equals the time spent executing
   * the report.
   */
  public completeJobCsv(opts: CompletionOpts & CompletionOptsScreenshotCsv) {
    const { byteSize, timeSinceClaimed, csvRows, csvColumns } = opts;
    this.reportEvent(EventType.REPORT_COMPLETION_CSV, {
      [FieldType.REPORT_ID]: this.reportId,
      [FieldType.EXPORT_TYPE]: this.exportType,
      [FieldType.OBJECT_TYPE]: this.objectType,
      [FieldType.DURATION]: timeSinceClaimed,
      [FieldType.BYTE_SIZE]: byteSize,
      ...(csvRows ? { [FieldType.CSV_ROWS]: csvRows } : {}),
      ...(csvColumns ? { [FieldType.CSV_COLUMNS]: csvColumns } : {}),
    });
  }

  /*
   * When a report job failes, the time since
   * claimed equals the time took to hit the
   * error.
   */
  public failJob(opts: FailureOpts) {
    const { timeSinceClaimed, errorMessage } = opts;
    this.reportEvent(EventType.REPORT_ERROR, {
      [FieldType.REPORT_ID]: this.reportId,
      [FieldType.EXPORT_TYPE]: this.exportType,
      [FieldType.OBJECT_TYPE]: this.objectType,
      [FieldType.DURATION]: timeSinceClaimed,
      [FieldType.ERROR_MESSAGE]: errorMessage,
    });
  }

  /*
   * When a report job is downloaded, we want to
   * know how old the job is
   */
  public downloadReport(opts: { timeSinceCompleted?: number }) {
    const { timeSinceCompleted } = opts;
    this.reportEvent(EventType.REPORT_DOWNLOAD, {
      [FieldType.REPORT_ID]: this.reportId,
      [FieldType.EXPORT_TYPE]: this.exportType,
      [FieldType.OBJECT_TYPE]: this.objectType,
      [FieldType.DURATION]: timeSinceCompleted,
    });
  }

  /*
   * When a report job is deleted, we want to know
   * how old the job is, and what type of error it
   * may have had
   */
  public deleteReport(opts: { timeSinceCompleted?: number }) {
    const { timeSinceCompleted } = opts;
    this.reportEvent(EventType.REPORT_DELETION, {
      [FieldType.REPORT_ID]: this.reportId,
      [FieldType.EXPORT_TYPE]: this.exportType,
      [FieldType.OBJECT_TYPE]: this.objectType,
      [FieldType.DURATION]: timeSinceCompleted,
    });
  }
}
