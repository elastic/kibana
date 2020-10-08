/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { loggingSystemMock } from '../../../../../src/core/server/mocks';
import { AlertExecutionStatusErrorReasons } from '../types';
import {
  executionStatusFromState,
  executionStatusFromError,
  alertExecutionStatusToRaw,
  alertExecutionStatusFromRaw,
} from './alert_execution_status';
import { ErrorWithReason } from './error_with_reason';

const MockLogger = loggingSystemMock.create().get();

describe('AlertExecutionStatus', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  describe('executionStatusFromState()', () => {
    test('empty task state', () => {
      const status = executionStatusFromState({});
      checkDateIsNearNow(status.lastExecutionDate);
      expect(status.status).toBe('ok');
      expect(status.error).toBe(undefined);
    });

    test('task state with no instances', () => {
      const status = executionStatusFromState({ alertInstances: {} });
      checkDateIsNearNow(status.lastExecutionDate);
      expect(status.status).toBe('ok');
      expect(status.error).toBe(undefined);
    });

    test('task state with one instance', () => {
      const status = executionStatusFromState({ alertInstances: { a: {} } });
      checkDateIsNearNow(status.lastExecutionDate);
      expect(status.status).toBe('active');
      expect(status.error).toBe(undefined);
    });
  });

  describe('executionStatusFromError()', () => {
    test('error with no reason', () => {
      const status = executionStatusFromError(new Error('boo!'));
      expect(status.status).toBe('error');
      expect(status.error).toMatchInlineSnapshot(`
        Object {
          "message": "boo!",
          "reason": "unknown",
        }
      `);
    });

    test('error with a reason', () => {
      const status = executionStatusFromError(
        new ErrorWithReason(AlertExecutionStatusErrorReasons.Execute, new Error('hoo!'))
      );
      expect(status.status).toBe('error');
      expect(status.error).toMatchInlineSnapshot(`
        Object {
          "message": "hoo!",
          "reason": "execute",
        }
      `);
    });
  });

  describe('alertExecutionStatusToRaw()', () => {
    const date = new Date('2020-09-03T16:26:58Z');
    const status = 'ok';
    const reason = AlertExecutionStatusErrorReasons.Decrypt;
    const error = { reason, message: 'wops' };

    test('status without an error', () => {
      expect(alertExecutionStatusToRaw({ lastExecutionDate: date, status })).toMatchInlineSnapshot(`
        Object {
          "error": null,
          "lastExecutionDate": "2020-09-03T16:26:58.000Z",
          "status": "ok",
        }
      `);
    });

    test('status with an error', () => {
      expect(alertExecutionStatusToRaw({ lastExecutionDate: date, status, error }))
        .toMatchInlineSnapshot(`
        Object {
          "error": Object {
            "message": "wops",
            "reason": "decrypt",
          },
          "lastExecutionDate": "2020-09-03T16:26:58.000Z",
          "status": "ok",
        }
      `);
    });
  });

  describe('alertExecutionStatusFromRaw()', () => {
    const date = new Date('2020-09-03T16:26:58Z').toISOString();
    const status = 'active';
    const reason = AlertExecutionStatusErrorReasons.Execute;
    const error = { reason, message: 'wops' };

    test('no input', () => {
      const result = alertExecutionStatusFromRaw(MockLogger, 'alert-id');
      expect(result).toBe(undefined);
    });

    test('undefined input', () => {
      const result = alertExecutionStatusFromRaw(MockLogger, 'alert-id', undefined);
      expect(result).toBe(undefined);
    });

    test('null input', () => {
      const result = alertExecutionStatusFromRaw(MockLogger, 'alert-id', null);
      expect(result).toBe(undefined);
    });

    test('invalid date', () => {
      const result = alertExecutionStatusFromRaw(MockLogger, 'alert-id', {
        lastExecutionDate: 'an invalid date',
      })!;
      checkDateIsNearNow(result.lastExecutionDate);
      expect(result.status).toBe('unknown');
      expect(result.error).toBe(undefined);
      expect(MockLogger.debug).toBeCalledWith(
        'invalid alertExecutionStatus lastExecutionDate "an invalid date" in raw alert alert-id'
      );
    });

    test('valid date', () => {
      const result = alertExecutionStatusFromRaw(MockLogger, 'alert-id', {
        lastExecutionDate: date,
      });
      expect(result).toMatchInlineSnapshot(`
        Object {
          "lastExecutionDate": 2020-09-03T16:26:58.000Z,
          "status": "unknown",
        }
      `);
    });

    test('valid status and date', () => {
      const result = alertExecutionStatusFromRaw(MockLogger, 'alert-id', {
        status,
        lastExecutionDate: date,
      });
      expect(result).toMatchInlineSnapshot(`
        Object {
          "lastExecutionDate": 2020-09-03T16:26:58.000Z,
          "status": "active",
        }
      `);
    });

    test('valid status, date and error', () => {
      const result = alertExecutionStatusFromRaw(MockLogger, 'alert-id', {
        status,
        lastExecutionDate: date,
        error,
      });
      expect(result).toMatchInlineSnapshot(`
        Object {
          "error": Object {
            "message": "wops",
            "reason": "execute",
          },
          "lastExecutionDate": 2020-09-03T16:26:58.000Z,
          "status": "active",
        }
      `);
    });
  });
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function checkDateIsNearNow(date: any) {
  expect(date instanceof Date).toBe(true);
  // allow for lots of slop in the time difference
  expect(Date.now() - date.valueOf()).toBeLessThanOrEqual(10000);
}
