/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { shouldRedirect } from './use_mapping_check';

describe('useMappingCheck', () => {
  describe('should redirect', () => {
    it('returns true for appropriate error', () => {
      const error = {
        request: {},
        response: {},
        body: {
          statusCode: 400,
          error: 'Bad Request',
          message:
            '[search_phase_execution_exception: [illegal_argument_exception] Reason: Text fields are not optimised for operations that require per-document field data like aggregations and sorting, so these operations are disabled by default. Please use a keyword field instead. Alternatively, set fielddata=true on [monitor.id] in order to load field data by uninverting the inverted index. Note that this can use significant memory.]: all shards failed',
        },
        name: 'Error',
        req: {},
        res: {},
      };
      expect(shouldRedirect(error)).toBe(true);
    });

    it('returns false for undefined', () => {
      expect(shouldRedirect(undefined)).toBe(false);
    });

    it('returns false for missing body', () => {
      expect(shouldRedirect({})).toBe(false);
    });

    it('returns false for incorrect error string', () => {
      expect(shouldRedirect({ body: { error: 'not the right type' } })).toBe(false);
    });

    it('returns false for missing body message', () => {
      expect(shouldRedirect({ body: { error: 'Bad Request' } })).toBe(false);
    });

    it('returns false for incorrect error message', () => {
      expect(
        shouldRedirect({
          body: { error: 'Bad Request', message: 'Not the correct kind of error message' },
        })
      );
    });
  });
});
