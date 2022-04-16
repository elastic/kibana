/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mapToReportingError } from './map_to_reporting_error';
import { errors } from '@kbn/screenshotting-plugin/common';
import {
  UnknownError,
  BrowserCouldNotLaunchError,
  BrowserUnexpectedlyClosedError,
  BrowserScreenshotError,
} from '.';

describe('mapToReportingError', () => {
  test('Non-Error values', () => {
    [null, undefined, '', 0, false, true, () => {}, {}, []].forEach((v) => {
      expect(mapToReportingError(v)).toBeInstanceOf(UnknownError);
    });
  });

  test('Screenshotting error', () => {
    expect(mapToReportingError(new errors.BrowserClosedUnexpectedly())).toBeInstanceOf(
      BrowserUnexpectedlyClosedError
    );
    expect(mapToReportingError(new errors.FailedToCaptureScreenshot())).toBeInstanceOf(
      BrowserScreenshotError
    );
    expect(mapToReportingError(new errors.FailedToSpawnBrowserError())).toBeInstanceOf(
      BrowserCouldNotLaunchError
    );
  });
});
