/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { WorkerTimeoutError, UnspecifiedWorkerError } from './errors';

describe('custom errors', function () {
  describe('WorkerTimeoutError', function () {
    it('should be function', () => {
      expect(typeof WorkerTimeoutError).toBe('function');
    });

    it('should have a name', function () {
      const err = new WorkerTimeoutError('timeout error');
      expect(err).toHaveProperty('name', 'WorkerTimeoutError');
    });

    it('should take a jobId property', function () {
      const err = new WorkerTimeoutError('timeout error', { jobId: 'il7hl34rqlo8ro' });
      expect(err).toHaveProperty('jobId', 'il7hl34rqlo8ro');
    });

    it('should take a timeout property', function () {
      const err = new WorkerTimeoutError('timeout error', { timeout: 15000 });
      expect(err).toHaveProperty('timeout', 15000);
    });

    it('should be stringifyable', function () {
      const err = new WorkerTimeoutError('timeout error');
      expect(`${err}`).toEqual('WorkerTimeoutError: timeout error');
    });
  });

  describe('UnspecifiedWorkerError', function () {
    it('should be function', () => {
      expect(typeof UnspecifiedWorkerError).toBe('function');
    });

    it('should have a name', function () {
      const err = new UnspecifiedWorkerError('unspecified error');
      expect(err).toHaveProperty('name', 'UnspecifiedWorkerError');
    });

    it('should take a jobId property', function () {
      const err = new UnspecifiedWorkerError('unspecified error', { jobId: 'il7hl34rqlo8ro' });
      expect(err).toHaveProperty('jobId', 'il7hl34rqlo8ro');
    });

    it('should be stringifyable', function () {
      const err = new UnspecifiedWorkerError('unspecified error');
      expect(`${err}`).toEqual('UnspecifiedWorkerError: unspecified error');
    });
  });
});
