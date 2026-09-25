/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { apm } from '@elastic/apm-rum';
import type { IHttpFetchError } from '@kbn/core-http-browser';
import { isAbortError, isExpectedTransportFailure, reportFetchError } from './report_fetch_error';
import { FETCHER_OPERATION_IDS } from '../../hooks/fetcher_operation_ids';

describe('report_fetch_error', () => {
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

  describe('isExpectedTransportFailure', () => {
    it('returns true for AbortError', () => {
      const error = new Error('aborted');
      error.name = 'AbortError';
      expect(isExpectedTransportFailure(error)).toBe(true);
    });

    it('returns true for Failed to fetch', () => {
      expect(isExpectedTransportFailure(new Error('Failed to fetch'))).toBe(true);
    });

    it('returns true for NetworkError name', () => {
      const error = new Error('The network request failed.');
      error.name = 'NetworkError';
      expect(isExpectedTransportFailure(error)).toBe(true);
    });

    it('returns true for TLS handshake timeout messages', () => {
      expect(isExpectedTransportFailure(new Error('TLS handshake timeout'))).toBe(true);
    });

    it('returns true for backend closed connection messages', () => {
      expect(isExpectedTransportFailure(new Error('backend closed connection'))).toBe(true);
    });

    it.each([408, 502, 503, 504])('returns true for HTTP %s', (status) => {
      const error = new Error(`Error (${status})`) as IHttpFetchError;
      Object.assign(error, { response: { status } });
      expect(isExpectedTransportFailure(error)).toBe(true);
    });

    it('returns false for a regular application error', () => {
      expect(isExpectedTransportFailure(new Error('Something went wrong'))).toBe(false);
    });

    it('returns false for HTTP 500', () => {
      const error = new Error('Internal Server Error') as IHttpFetchError;
      Object.assign(error, { response: { status: 500 } });
      expect(isExpectedTransportFailure(error)).toBe(false);
    });

    it('returns false for HTTP 500 even when the message matches a transport pattern', () => {
      const error = new Error('Failed to fetch upstream') as IHttpFetchError;
      Object.assign(error, { response: { status: 500 } });
      expect(isExpectedTransportFailure(error)).toBe(false);
    });

    it('returns false for non-Error values', () => {
      expect(isExpectedTransportFailure('Failed to fetch')).toBe(false);
      expect(isExpectedTransportFailure(undefined)).toBe(false);
    });
  });

  describe('reportFetchError', () => {
    let captureErrorSpy: jest.SpyInstance;

    beforeEach(() => {
      captureErrorSpy = jest.spyOn(apm, 'captureError').mockImplementation(() => {});
    });

    afterEach(() => {
      captureErrorSpy.mockRestore();
    });

    it('captures the error with the operation id label', () => {
      const error = new Error('boom');

      reportFetchError({ error, operationId: FETCHER_OPERATION_IDS.FETCH_SPAN_LINKS });

      expect(captureErrorSpy).toHaveBeenCalledWith(error, {
        labels: {
          kibana_meta_operation_id: FETCHER_OPERATION_IDS.FETCH_SPAN_LINKS,
        },
      });
    });

    it('skips AbortError', () => {
      const error = new Error('aborted');
      error.name = 'AbortError';

      reportFetchError({ error, operationId: FETCHER_OPERATION_IDS.FETCH_SPAN_LINKS });

      expect(captureErrorSpy).not.toHaveBeenCalled();
    });

    it('skips Failed to fetch', () => {
      reportFetchError({
        error: new Error('Failed to fetch'),
        operationId: FETCHER_OPERATION_IDS.FETCH_SPAN_LINKS,
      });

      expect(captureErrorSpy).not.toHaveBeenCalled();
    });

    it('skips HTTP 502', () => {
      const error = new Error('Bad Gateway') as IHttpFetchError;
      Object.assign(error, { response: { status: 502 } });

      reportFetchError({ error, operationId: FETCHER_OPERATION_IDS.FETCH_SPAN_LINKS });

      expect(captureErrorSpy).not.toHaveBeenCalled();
    });

    it('skips non-Error values', () => {
      reportFetchError({ error: 'boom', operationId: FETCHER_OPERATION_IDS.FETCH_SPAN_LINKS });

      expect(captureErrorSpy).not.toHaveBeenCalled();
    });
  });
});
