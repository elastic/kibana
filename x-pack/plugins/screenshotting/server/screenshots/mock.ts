/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { of } from 'rxjs';
import { createMockLayout } from '../layouts/mock';
import type { Screenshots, ScreenshotResult } from '.';

export function createMockScreenshots(): jest.Mocked<Screenshots> {
  return {
    getScreenshots: jest.fn((options) =>
      of({
        layout: createMockLayout(),
        results: options.urls.map(() => ({
          timeRange: null,
          screenshots: [
            {
              data: Buffer.from('screenshot'),
              description: null,
              title: null,
            },
          ],
        })),
      } as ScreenshotResult)
    ),
  } as unknown as jest.Mocked<Screenshots>;
}
