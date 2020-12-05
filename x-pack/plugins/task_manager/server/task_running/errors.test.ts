/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { isUnrecoverableError, throwUnrecoverableError } from './errors';

describe('Error Types', () => {
  describe('Unrecoverable error', () => {
    it('wraps and throws normal errors', () => {
      expect(() => throwUnrecoverableError(new Error('OMG'))).toThrowError('OMG');
    });

    it('idnentifies wrapped normal errors', async () => {
      let result;
      try {
        throwUnrecoverableError(new Error('OMG'));
      } catch (ex) {
        result = ex;
      }
      expect(isUnrecoverableError(result)).toBeTruthy();
    });

    it('idnentifies normal errors', () => {
      expect(isUnrecoverableError(new Error('OMG'))).toBeFalsy();
    });
  });
});
