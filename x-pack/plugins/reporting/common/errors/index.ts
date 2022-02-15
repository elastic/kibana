/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable max-classes-per-file */

abstract class ReportingError extends Error {
  protected abstract code: string;

  constructor(private details?: string) {
    super();
  }

  public get message(): string {
    return `ReportingError "${this.code}"`;
  }

  public getDetails(): undefined | string {
    return this.details;
  }

  public toString() {
    return this.code;
  }
}

/**
 * When system/user unexpectedly interrupts a reporting job by stopping Kibana.
 */
export class KibanaStoppedUnexpectedlyError extends ReportingError {
  code = 'kibana_stopped_unexpectedly';
}

/**
 * We detected that some Chromium dependency is missing and therefore cannot
 * launch.
 */
export class MissingChromiumDependenciesError extends ReportingError {
  code = 'missing_chromium_dependencies';
}

/**
 * For some unspecified reason we cannot launch the browser. See details.
 */
export class CannotStartChromiumError extends ReportingError {
  code = 'cannot_start_chromium';
}

/**
 * The PDF worker ran out of memory while generating a PDF.
 */
export class PDFWorkerOutOfMemoryError extends ReportingError {
  code = 'pdf_worker_out_of_memory';
}

/**
 * While performing some reporting action, like fetching data from ES, our
 * access token expired.
 */
export class AuthenticationExpiredError extends ReportingError {
  code = 'authentication_expired';
}

/**
 * An unknown error has occurred. See details.
 */
export class UnknownError extends ReportingError {
  code = 'unknown_error';
}
