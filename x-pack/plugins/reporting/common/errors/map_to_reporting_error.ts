/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors } from '@kbn/screenshotting-plugin/common';
import {
  BrowserCouldNotLaunchError,
  BrowserScreenshotError,
  BrowserUnexpectedlyClosedError,
  DisallowedOutgoingUrl,
  InvalidLayoutParametersError,
  PdfWorkerOutOfMemoryError,
  ReportingError,
  UnknownError,
  VisualReportingSoftDisabledError,
} from '@kbn/reporting-common';
import { ExecutionError } from '@kbn/reporting-common/types';

export function isExecutionError(error: ExecutionError | unknown): error is ExecutionError {
  if (typeof error !== 'object' || error === null) {
    return false;
  }
  return ['name', 'message', 'stack'].every((k) => k in error);
}

function getErrorName(error: ExecutionError | unknown): string | undefined {
  if (isExecutionError(error)) {
    return error.name;
  }
  return undefined;
}

/**
 * Map an error object from the Screenshotting plugin into an error type of the Reporting domain.
 *
 * NOTE: each type of ReportingError code must be referenced in each applicable `errorCodesSchema*` object in
 * x-pack/plugins/reporting/server/usage/schema.ts
 *
 * @param {unknown} error - a kind of error object
 * @returns {ReportingError} - the converted error object
 */
export function mapToReportingError(error: ExecutionError | unknown): ReportingError {
  if (error instanceof ReportingError) {
    return error;
  }
  const errorName = getErrorName(error);
  switch (true) {
    case error instanceof errors.InvalidLayoutParametersError ||
      errorName === 'InvalidLayoutParametersError':
      return new InvalidLayoutParametersError((error as Error).message);
    case error instanceof errors.DisallowedOutgoingUrl || errorName === 'DisallowedOutgoingUrl':
      return new DisallowedOutgoingUrl((error as Error).message);
    case error instanceof errors.BrowserClosedUnexpectedly ||
      errorName === 'BrowserClosedUnexpectedly':
      return new BrowserUnexpectedlyClosedError((error as Error).message);
    case error instanceof errors.FailedToCaptureScreenshot ||
      errorName === 'FailedToCaptureScreenshot':
      return new BrowserScreenshotError((error as Error).message);
    case error instanceof errors.FailedToSpawnBrowserError ||
      errorName === 'FailedToSpawnBrowserError':
      return new BrowserCouldNotLaunchError();
    case error instanceof errors.PdfWorkerOutOfMemoryError ||
      errorName === 'PdfWorkerOutOfMemoryError':
      return new PdfWorkerOutOfMemoryError();
    case error instanceof errors.InsufficientMemoryAvailableOnCloudError:
      return new VisualReportingSoftDisabledError();
  }
  return new UnknownError((error as Error)?.message);
}
