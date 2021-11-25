/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { of } from 'rxjs';
import { createMockLayout } from '../layouts/mock';
import type { getScreenshots, ScreenshotResult } from '.';

export function createMockScreenshots(): jest.Mocked<{ getScreenshots: typeof getScreenshots }> {
  return {
    getScreenshots: jest.fn((driverFactory, logger, options) =>
      of({
        layout: createMockLayout(),
        results: options.urls.map(() => ({
          screenshots: [{ data: Buffer.from('screenshot') }],
        })),
      } as ScreenshotResult)
    ),
  };
}
