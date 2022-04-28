/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors } from '@kbn/screenshotting-plugin/common';
import {
  UnknownError,
  ReportingError,
  BrowserCouldNotLaunchError,
  BrowserUnexpectedlyClosedError,
  BrowserScreenshotError,
  PdfWorkerOutOfMemoryError,
  VisualReportingSoftDisabledError,
} from '.';

export function mapToReportingError(error: unknown): ReportingError {
  if (error instanceof ReportingError) {
    return error;
  }
  switch (true) {
    case error instanceof errors.BrowserClosedUnexpectedly:
      return new BrowserUnexpectedlyClosedError((error as Error).message);
    case error instanceof errors.FailedToCaptureScreenshot:
      return new BrowserScreenshotError((error as Error).message);
    case error instanceof errors.FailedToSpawnBrowserError:
      return new BrowserCouldNotLaunchError();
    case error instanceof errors.PdfWorkerOutOfMemoryError:
      return new PdfWorkerOutOfMemoryError();
    case error instanceof errors.InsufficientMemoryAvailableOnCloudError:
      return new VisualReportingSoftDisabledError();
  }
  return new UnknownError();
}
