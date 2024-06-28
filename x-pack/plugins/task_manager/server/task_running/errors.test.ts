/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  createTaskRunError,
  getErrorSource,
  isUnrecoverableError,
  isUserError,
  TaskErrorSource,
  throwUnrecoverableError,
} from './errors';

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

    it('createTaskRunError', () => {
      expect(isUserError(createTaskRunError(new Error('OMG'), TaskErrorSource.USER))).toBeTruthy();
    });

    it('createTaskRunError without errorSourceParam ', () => {
      expect(getErrorSource(createTaskRunError(new Error('OMG')))).toBe(TaskErrorSource.FRAMEWORK);
    });

    it('getErrorSource', () => {
      expect(getErrorSource(createTaskRunError(new Error('OMG'), TaskErrorSource.USER))).toBe(
        TaskErrorSource.USER
      );
    });

    it('getErrorSource return undefined when there is no source data', () => {
      expect(getErrorSource(new Error('OMG'))).toBeUndefined();
    });
  });
});
