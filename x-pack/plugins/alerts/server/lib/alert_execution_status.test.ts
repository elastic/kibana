/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AlertExecutionStatusErrorReasons } from '../types';
import {
  executionStatusFromState,
  executionStatusFromError,
  alertExecutionStatusToRaw,
  alertExecutionStatusFromRaw,
} from './alert_execution_status';
import { ErrorWithReason } from './error_with_reason';

describe('AlertExecutionStatus', () => {
  describe('executionStatusFromState()', () => {
    test('empty task state', () => {
      const status = executionStatusFromState({});
      checkDateIsNearNow(status.date);
      expect(status.status).toBe('ok');
      expect(status.error).toBe(undefined);
    });

    test('task state with no instances', () => {
      const status = executionStatusFromState({ alertInstances: {} });
      checkDateIsNearNow(status.date);
      expect(status.status).toBe('ok');
      expect(status.error).toBe(undefined);
    });

    test('task state with one instance', () => {
      const status = executionStatusFromState({ alertInstances: { a: {} } });
      checkDateIsNearNow(status.date);
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
      const status = executionStatusFromError(new ErrorWithReason('execute', new Error('hoo!')));
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
    const reason: AlertExecutionStatusErrorReasons = 'decrypt';
    const error = { reason, message: 'wops' };

    test('status without an error', () => {
      expect(alertExecutionStatusToRaw({ date, status })).toMatchInlineSnapshot(`
        Object {
          "date": "2020-09-03T16:26:58.000Z",
          "error": null,
          "status": "ok",
        }
      `);
    });

    test('status with an error', () => {
      expect(alertExecutionStatusToRaw({ date, status, error })).toMatchInlineSnapshot(`
        Object {
          "date": "2020-09-03T16:26:58.000Z",
          "error": Object {
            "message": "wops",
            "reason": "decrypt",
          },
          "status": "ok",
        }
      `);
    });
  });

  describe('alertExecutionStatusFromRaw()', () => {
    const date = new Date('2020-09-03T16:26:58Z').toISOString();
    const status = 'active';
    const reason: AlertExecutionStatusErrorReasons = 'execute';
    const error = { reason, message: 'wops' };

    test('no input', () => {
      const result = alertExecutionStatusFromRaw();
      expect(result).toBe(undefined);
    });

    test('undefined input', () => {
      const result = alertExecutionStatusFromRaw(undefined);
      expect(result).toBe(undefined);
    });

    test('null input', () => {
      const result = alertExecutionStatusFromRaw(null);
      expect(result).toBe(undefined);
    });

    test('invalid date', () => {
      const result = alertExecutionStatusFromRaw({ date: 'an invalid date' })!;
      checkDateIsNearNow(result.date);
      expect(result.status).toBe('unknown');
      expect(result.error).toBe(undefined);
    });

    test('valid date', () => {
      const result = alertExecutionStatusFromRaw({ date });
      expect(result).toMatchInlineSnapshot(`
        Object {
          "date": 2020-09-03T16:26:58.000Z,
          "status": "unknown",
        }
      `);
    });

    test('valid status and date', () => {
      const result = alertExecutionStatusFromRaw({ status, date });
      expect(result).toMatchInlineSnapshot(`
        Object {
          "date": 2020-09-03T16:26:58.000Z,
          "status": "active",
        }
      `);
    });

    test('valid status, date and error', () => {
      const result = alertExecutionStatusFromRaw({ status, date, error });
      expect(result).toMatchInlineSnapshot(`
        Object {
          "date": 2020-09-03T16:26:58.000Z,
          "error": Object {
            "message": "wops",
            "reason": "execute",
          },
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
