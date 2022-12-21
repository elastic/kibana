/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { of } from 'rxjs';
import type { Screenshots } from '.';

export function createMockScreenshots(): jest.Mocked<Screenshots> {
  return {
    getScreenshots: jest.fn(({ format, urls }) => {
      switch (format) {
        case 'pdf':
          return of({
            metrics: {
              pages: 1,
            },
            data: Buffer.from('screenshot'),
            errors: [],
            renderErrors: [],
          });

        default:
          return of({
            results: urls.map(() => ({
              timeRange: null,
              screenshots: [
                {
                  data: Buffer.from('screenshot'),
                  description: null,
                  title: null,
                },
              ],
            })),
          });
      }
    }),
  } as unknown as jest.Mocked<Screenshots>;
}
