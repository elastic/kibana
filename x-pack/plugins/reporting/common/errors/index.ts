/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable max-classes-per-file */

import { i18n } from '@kbn/i18n';
export abstract class ReportingError extends Error {
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
  code = 'authentication_expired';
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

  public override get message(): string {
    return this.details;
  }
}

// TODO: Add ReportingError for Kibana stopping unexpectedly
// TODO: Add ReportingError for missing Chromium dependencies
// TODO: Add ReportingError for missing Chromium dependencies
// TODO: Add ReportingError for Chromium not starting for an unknown reason
