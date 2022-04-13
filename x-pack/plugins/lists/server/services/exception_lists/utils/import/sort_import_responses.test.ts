/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { sortImportResponses } from './sort_import_responses';

describe('sort_import_responses', () => {
  describe('sortImportResponses', () => {
    it('returns defaults if empty array passed in', () => {
      const result = sortImportResponses([]);

      expect(result).toEqual({ errors: [], success: true, success_count: 0 });
    });

    it('returns success false if any errors exist', () => {
      const result = sortImportResponses([
        {
          error: {
            message: 'error occurred',
            status_code: 400,
          },
          id: '123',
        },
      ]);

      expect(result).toEqual({
        errors: [
          {
            error: {
              message: 'error occurred',
              status_code: 400,
            },
            id: '123',
          },
        ],
        success: false,
        success_count: 0,
      });
    });

    it('returns success true if no errors exist', () => {
      const result = sortImportResponses([
        {
          id: '123',
          status_code: 200,
        },
      ]);

      expect(result).toEqual({
        errors: [],
        success: true,
        success_count: 1,
      });
    });

    it('reports successes even when error exists', () => {
      const result = sortImportResponses([
        {
          id: '123',
          status_code: 200,
        },
        {
          error: {
            message: 'error occurred',
            status_code: 400,
          },
          id: '123',
        },
      ]);

      expect(result).toEqual({
        errors: [
          {
            error: {
              message: 'error occurred',
              status_code: 400,
            },
            id: '123',
          },
        ],
        success: false,
        success_count: 1,
      });
    });
  });
});
