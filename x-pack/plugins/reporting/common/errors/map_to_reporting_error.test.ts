/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  BrowserCouldNotLaunchError,
  BrowserScreenshotError,
  BrowserUnexpectedlyClosedError,
  InvalidLayoutParametersError,
  UnknownError,
  VisualReportingSoftDisabledError,
} from '@kbn/reporting-common';
import { mapToReportingError } from './map_to_reporting_error';
import { errors } from '@kbn/screenshotting-plugin/common';

describe('mapToReportingError', () => {
  test('Non-Error values', () => {
    [null, undefined, '', 0, false, true, () => {}, {}, []].forEach((v) => {
      expect(mapToReportingError(v)).toBeInstanceOf(UnknownError);
    });
  });

  test('Screenshotting error', () => {
    expect(mapToReportingError(new errors.InvalidLayoutParametersError())).toBeInstanceOf(
      InvalidLayoutParametersError
    );
    expect(mapToReportingError(new errors.BrowserClosedUnexpectedly())).toBeInstanceOf(
      BrowserUnexpectedlyClosedError
    );
    expect(mapToReportingError(new errors.FailedToCaptureScreenshot())).toBeInstanceOf(
      BrowserScreenshotError
    );
    expect(mapToReportingError(new errors.FailedToSpawnBrowserError())).toBeInstanceOf(
      BrowserCouldNotLaunchError
    );
    expect(
      mapToReportingError(new errors.InsufficientMemoryAvailableOnCloudError())
    ).toBeInstanceOf(VisualReportingSoftDisabledError);
  });

  test("Screenshoting errors shouldn't rely on instanceof", () => {
    const createCustomError = (name: string) => {
      const e = new Error('Test error msg');
      e.name = name;
      return e;
    };

    expect(mapToReportingError(createCustomError('InvalidLayoutParametersError'))).toBeInstanceOf(
      InvalidLayoutParametersError
    );
    expect(mapToReportingError(createCustomError('BrowserClosedUnexpectedly'))).toBeInstanceOf(
      BrowserUnexpectedlyClosedError
    );
    expect(mapToReportingError(createCustomError('FailedToCaptureScreenshot'))).toBeInstanceOf(
      BrowserScreenshotError
    );
    expect(mapToReportingError(createCustomError('FailedToSpawnBrowserError'))).toBeInstanceOf(
      BrowserCouldNotLaunchError
    );
    expect(
      mapToReportingError(createCustomError('InsufficientMemoryAvailableOnCloudError'))
    ).toBeInstanceOf(VisualReportingSoftDisabledError);
  });

  test('unknown error', () => {
    const error = mapToReportingError(new Error('Test error msg'));
    expect(error).toBeInstanceOf(UnknownError);
    expect(error.message).toBe('ReportingError(code: unknown_error) "Test error msg"');
  });
});
