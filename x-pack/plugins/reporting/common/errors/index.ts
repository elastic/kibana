/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable max-classes-per-file */

abstract class ReportingError extends Error {
  constructor(private code: string) {
    super(`ReportingError "${code}"`);
  }
  toString() {
    return this.code;
  }
}

export class KibanaStoppedUnexpectedlyError extends ReportingError {
  constructor() {
    super('kibana_stopped_unexpectedly');
  }
}

export class MissingChromiumDependenciesError extends ReportingError {
  constructor() {
    super('missing_chromium_dependencies');
  }
}

export class CannotStartChromiumError extends ReportingError {
  constructor() {
    super('cannot_start_chromium');
  }
}

export class PDFWorkerOutOfMemoryError extends ReportingError {
  constructor() {
    super('pdf_worker_out_of_memory');
  }
}

export class AuthenticationExpiredError extends ReportingError {
  constructor() {
    super('authentication_expired');
  }
}
