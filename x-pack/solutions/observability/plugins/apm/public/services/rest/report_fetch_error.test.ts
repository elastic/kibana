/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { apm } from '@elastic/apm-rum';
import { isAbortError, reportFetchError } from './report_fetch_error';

jest.mock('@elastic/apm-rum', () => ({
  apm: {
    captureError: jest.fn(),
  },
}));

describe('report_fetch_error', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('isAbortError', () => {
    it('returns true for an Error whose name is AbortError', () => {
      const error = new Error('aborted');
      error.name = 'AbortError';

      expect(isAbortError(error)).toBe(true);
    });

    it('returns false for a regular Error', () => {
      expect(isAbortError(new Error('boom'))).toBe(false);
    });

    it('returns false for non-Error values', () => {
      expect(isAbortError('AbortError')).toBe(false);
      expect(isAbortError(undefined)).toBe(false);
      expect(isAbortError(null)).toBe(false);
    });
  });

  describe('reportFetchError', () => {
    it('captures the error with the operation id label', () => {
      const error = new Error('boom');

      reportFetchError({ error, operationId: 'op-1' });

      expect(apm.captureError).toHaveBeenCalledWith(error, {
        labels: {
          kibana_meta_operation_id: 'op-1',
        },
      });
    });

    it('skips AbortError', () => {
      const error = new Error('aborted');
      error.name = 'AbortError';

      reportFetchError({ error, operationId: 'op-1' });

      expect(apm.captureError).not.toHaveBeenCalled();
    });

    it('skips non-Error values', () => {
      reportFetchError({ error: 'boom', operationId: 'op-1' });

      expect(apm.captureError).not.toHaveBeenCalled();
    });
  });
});
