/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable max-classes-per-file */

import { i18n } from '@kbn/i18n';
export abstract class ReportingError extends Error {
  /**
   * A string that uniquely brands an error type. This is used to power telemetry
   * about reporting failures.
   *
   * @note Convention for codes: lower-case, snake-case and end in `_error`.
   */
  public abstract code: string;

  constructor(public details?: string) {
    super();
  }

  public get message(): string {
    const prefix = `ReportingError`;
    return this.details
      ? `${prefix}(code: ${this.code}) "${this.details}"`
      : `${prefix}(code: ${this.code})`;
  }

  public toString() {
    return this.message;
  }
}

/**
 * While performing some reporting action, like fetching data from ES, our
 * access token expired.
 */
export class AuthenticationExpiredError extends ReportingError {
  code = 'authentication_expired_error';
}

export class QueueTimeoutError extends ReportingError {
  code = 'queue_timeout_error';
}

/**
 * An unknown error has occurred. See details.
 */
export class UnknownError extends ReportingError {
  code = 'unknown_error';
}

export class PdfWorkerOutOfMemoryError extends ReportingError {
  code = 'pdf_worker_out_of_memory_error';

  details = i18n.translate('xpack.reporting.common.pdfWorkerOutOfMemoryErrorMessage', {
    defaultMessage:
      'Cannot generate PDF due to low memory. Consider making a smaller PDF before retrying this report.',
  });

  /**
   * No need to provide extra details, we know exactly what happened and can provide
   * a nicely formatted message
   */
  public override get message(): string {
    return this.details;
  }
}

export class BrowserCouldNotLaunchError extends ReportingError {
  code = 'browser_could_not_launch_error';

  details = i18n.translate('xpack.reporting.common.browserCouldNotLaunchErrorMessage', {
    defaultMessage: 'Cannot generate screenshots because the browser did not launch.',
  });

  /**
   * For this error message we expect that users will use the diagnostics
   * functionality in reporting to debug further.
   */
  public override get message() {
    return this.details;
  }
}

export class BrowserUnexpectedlyClosedError extends ReportingError {
  code = 'browser_unexpectedly_closed_error';
}

export class BrowserScreenshotError extends ReportingError {
  code = 'browser_screenshot_error';
}

export class KibanaShuttingDownError extends ReportingError {
  code = 'kibana_shutting_down_error';
}

export class VisualReportingSoftDisabledError extends ReportingError {
  code = 'visual_reporting_soft_disabled_error';
}
