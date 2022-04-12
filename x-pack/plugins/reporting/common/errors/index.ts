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
  public abstract get code(): string;

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
  static tcode = 'authentication_expired_error' as const;
  public get code(): string {
    return AuthenticationExpiredError.tcode;
  }
}

export class QueueTimeoutError extends ReportingError {
  static code = 'queue_timeout_error' as const;
  public get code(): string {
    return QueueTimeoutError.code;
  }
}

/**
 * An unknown error has occurred. See details.
 */
export class UnknownError extends ReportingError {
  static code = 'unknown_error' as const;
  public get code(): string {
    return UnknownError.code;
  }
}

export class PdfWorkerOutOfMemoryError extends ReportingError {
  static code = 'pdf_worker_out_of_memory_error' as const;
  public get code(): string {
    return PdfWorkerOutOfMemoryError.code;
  }

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
  static code = 'browser_could_not_launch_error' as const;
  public get code(): string {
    return BrowserCouldNotLaunchError.code;
  }

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
  static code = 'browser_unexpectedly_closed_error' as const;
  public get code(): string {
    return BrowserUnexpectedlyClosedError.code;
  }
}

export class BrowserScreenshotError extends ReportingError {
  static code = 'browser_screenshot_error' as const;
  public get code(): string {
    return BrowserScreenshotError.code;
  }
}

export class KibanaShuttingDownError extends ReportingError {
  static code = 'kibana_shutting_down_error' as const;
  public get code(): string {
    return KibanaShuttingDownError.code;
  }
}

/**
 * Special error case that should only occur on Cloud when trying to generate
 * a report on a Kibana instance that is too small to be running Chromium.
 */
export class VisualReportingSoftDisabledError extends ReportingError {
  static code = 'visual_reporting_soft_disabled_error' as const;
  public get code(): string {
    return VisualReportingSoftDisabledError.code;
  }

  details = i18n.translate('xpack.reporting.common.cloud.insufficientSystemMemoryError', {
    defaultMessage:
      'This report cannot be generated because Kibana does not have sufficient memory.',
  });

  public override get message() {
    return this.details;
  }
}
