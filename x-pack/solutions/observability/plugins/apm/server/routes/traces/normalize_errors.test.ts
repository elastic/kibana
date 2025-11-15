/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { normalizeErrors } from './normalize_errors';
import type { UnifiedTraceErrors } from './get_unified_trace_errors';

describe('normalizeErrors', () => {
  describe('with apmErrors', () => {
    it('should normalize a single apm error with exception array', () => {
      const apmErrors: UnifiedTraceErrors['apmErrors'] = [
        {
          id: 'error-1',
          spanId: 'a',
          eventName: undefined,
          error: {
            exception: { type: 'Error', message: 'First error' },
          },
          timestamp: {
            us: 1234567890,
          },
        },
      ];

      const result = normalizeErrors(apmErrors);

      expect(result).toEqual([
        {
          error: {
            exception: { type: 'Error', message: 'First error' },
          },
          timestamp: { us: 1234567890 },
        },
      ]);
    });

    it('should handle apm error with no exception', () => {
      const apmErrors: UnifiedTraceErrors['apmErrors'] = [
        {
          id: 'error-3',
          spanId: 'a',
          eventName: undefined,
          error: {
            exception: { type: undefined, message: undefined },
          },
          timestamp: {
            us: 1111111111,
          },
        },
      ];

      const result = normalizeErrors(apmErrors);

      expect(result).toEqual([
        {
          error: {
            exception: { type: undefined, message: undefined },
          },
          timestamp: { us: 1111111111 },
        },
      ]);
    });

    it('should handle empty apm errors array', () => {
      const apmErrors: UnifiedTraceErrors['apmErrors'] = [];

      const result = normalizeErrors(apmErrors);

      expect(result).toEqual([]);
    });
  });

  describe('with unprocessedOtelErrors', () => {
    it('should normalize a single otel error', () => {
      const otelErrors: UnifiedTraceErrors['unprocessedOtelErrors'] = [
        {
          eventName: 'error',
          id: 'span-1',
          spanId: 'span-1',
          timestamp: {
            us: 5555555555,
          },
          error: {
            exception: {
              type: 'OtelError',
              message: 'OTEL error message',
            },
          },
        },
      ];

      const result = normalizeErrors(otelErrors);

      expect(result).toEqual([
        {
          eventName: 'error',
          error: {
            exception: {
              type: 'OtelError',
              message: 'OTEL error message',
            },
          },
          timestamp: {
            us: 5555555555,
          },
        },
      ]);
    });

    it('should handle otel error with undefined exception fields', () => {
      const otelErrors: UnifiedTraceErrors['unprocessedOtelErrors'] = [
        {
          eventName: 'exception',
          id: 'span-2',
          spanId: 'span-2',
          timestamp: undefined,
          error: {
            exception: {
              type: undefined,
              message: undefined,
            },
          },
        },
      ];

      const result = normalizeErrors(otelErrors);

      expect(result).toEqual([
        {
          eventName: 'exception',
          error: {
            exception: {
              type: undefined,
              message: undefined,
            },
          },
          timestamp: undefined,
        },
      ]);
    });

    it('should handle empty otel errors array', () => {
      const otelErrors: UnifiedTraceErrors['unprocessedOtelErrors'] = [];

      const result = normalizeErrors(otelErrors);

      expect(result).toEqual([]);
    });
  });
});
