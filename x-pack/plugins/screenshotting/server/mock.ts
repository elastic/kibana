/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mergeMap } from 'rxjs/operators';
import { loggingSystemMock } from '../../../../src/core/server/mocks';
import { createMockBrowserDriverFactory } from './browsers/mock';
import { createMockScreenshots } from './screenshots/mock';
import type { ScreenshottingStart } from '.';
import { toPdf, toPng } from './formats';

export function createMockScreenshottingStart(): jest.Mocked<ScreenshottingStart> {
  const driver = createMockBrowserDriverFactory();
  const { getScreenshots } = createMockScreenshots();
  const { diagnose } = driver;

  return {
    diagnose,
    getScreenshotsPdf: jest.fn((options) =>
      getScreenshots(options).pipe(mergeMap(toPdf({ logger: loggingSystemMock.createLogger() })))
    ),
    getScreenshotsPng: jest.fn((options) => getScreenshots(options).pipe(mergeMap(toPng))),
  };
}
