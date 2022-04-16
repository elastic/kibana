/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import {
  RuleExecutionStatusErrorReasons,
  RuleExecutionStatusWarningReasons,
  RuleExecutionState,
} from '../types';
import {
  executionStatusFromState,
  executionStatusFromError,
  ruleExecutionStatusToRaw,
  ruleExecutionStatusFromRaw,
} from './rule_execution_status';
import { ErrorWithReason } from './error_with_reason';
import { translations } from '../constants/translations';
import { ActionsCompletion } from '../task_runner/types';

const MockLogger = loggingSystemMock.create().get();
const metrics = { numSearches: 1, esSearchDurationMs: 10, totalSearchDurationMs: 20 };

describe('RuleExecutionStatus', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  describe('executionStatusFromState()', () => {
    test('empty task state', () => {
      const status = executionStatusFromState({
        alertExecutionStore: {
          numberOfTriggeredActions: 0,
          numberOfScheduledActions: 0,
          triggeredActionsStatus: ActionsCompletion.COMPLETE,
        },
      } as RuleExecutionState);
      checkDateIsNearNow(status.lastExecutionDate);
      expect(status.numberOfTriggeredActions).toBe(0);
      expect(status.numberOfScheduledActions).toBe(0);
      expect(status.status).toBe('ok');
      expect(status.error).toBe(undefined);
      expect(status.warning).toBe(undefined);
    });

    test('task state with no instances', () => {
      const status = executionStatusFromState({
        alertInstances: {},
        alertExecutionStore: {
          numberOfTriggeredActions: 0,
          numberOfScheduledActions: 0,
          triggeredActionsStatus: ActionsCompletion.COMPLETE,
        },
        metrics,
      });
      checkDateIsNearNow(status.lastExecutionDate);
      expect(status.numberOfTriggeredActions).toBe(0);
      expect(status.numberOfScheduledActions).toBe(0);
      expect(status.status).toBe('ok');
      expect(status.error).toBe(undefined);
      expect(status.warning).toBe(undefined);
      expect(status.metrics).toBe(metrics);
    });

    test('task state with one instance', () => {
      const status = executionStatusFromState({
        alertInstances: { a: {} },
        alertExecutionStore: {
          numberOfTriggeredActions: 0,
          numberOfScheduledActions: 0,
          triggeredActionsStatus: ActionsCompletion.COMPLETE,
        },
        metrics,
      });
      checkDateIsNearNow(status.lastExecutionDate);
      expect(status.numberOfTriggeredActions).toBe(0);
      expect(status.numberOfScheduledActions).toBe(0);
      expect(status.status).toBe('active');
      expect(status.error).toBe(undefined);
      expect(status.warning).toBe(undefined);
      expect(status.metrics).toBe(metrics);
    });

    test('task state with numberOfTriggeredActions', () => {
      const status = executionStatusFromState({
        alertExecutionStore: {
          numberOfTriggeredActions: 1,
          numberOfScheduledActions: 2,
          triggeredActionsStatus: ActionsCompletion.COMPLETE,
        },
        alertInstances: { a: {} },
        metrics,
      });
      checkDateIsNearNow(status.lastExecutionDate);
      expect(status.numberOfTriggeredActions).toBe(1);
      expect(status.numberOfScheduledActions).toBe(2);
      expect(status.status).toBe('active');
      expect(status.error).toBe(undefined);
      expect(status.warning).toBe(undefined);
      expect(status.metrics).toBe(metrics);
    });

    test('task state with warning', () => {
      const status = executionStatusFromState({
        alertInstances: { a: {} },
        alertExecutionStore: {
          numberOfTriggeredActions: 3,
          triggeredActionsStatus: ActionsCompletion.PARTIAL,
        },
        metrics,
      });
      checkDateIsNearNow(status.lastExecutionDate);
      expect(status.warning).toEqual({
        message: translations.taskRunner.warning.maxExecutableActions,
        reason: RuleExecutionStatusWarningReasons.MAX_EXECUTABLE_ACTIONS,
      });
      expect(status.status).toBe('warning');
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
        new ErrorWithReason(RuleExecutionStatusErrorReasons.Execute, new Error('hoo!'))
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

  describe('ruleExecutionStatusToRaw()', () => {
    const date = new Date('2020-09-03T16:26:58Z');
    const status = 'ok';
    const reason = RuleExecutionStatusErrorReasons.Decrypt;
    const error = { reason, message: 'wops' };

    test('status without an error', () => {
      expect(ruleExecutionStatusToRaw({ lastExecutionDate: date, status })).toMatchInlineSnapshot(`
        Object {
          "error": null,
          "lastDuration": 0,
          "lastExecutionDate": "2020-09-03T16:26:58.000Z",
          "status": "ok",
          "warning": null,
        }
      `);
    });

    test('status with an error', () => {
      expect(ruleExecutionStatusToRaw({ lastExecutionDate: date, status, error }))
        .toMatchInlineSnapshot(`
        Object {
          "error": Object {
            "message": "wops",
            "reason": "decrypt",
          },
          "lastDuration": 0,
          "lastExecutionDate": "2020-09-03T16:26:58.000Z",
          "status": "ok",
          "warning": null,
        }
      `);
    });

    test('status with a duration', () => {
      expect(ruleExecutionStatusToRaw({ lastExecutionDate: date, status, lastDuration: 1234 }))
        .toMatchInlineSnapshot(`
      Object {
        "error": null,
        "lastDuration": 1234,
        "lastExecutionDate": "2020-09-03T16:26:58.000Z",
        "status": "ok",
        "warning": null,
      }
    `);
    });

    test('status with a numberOfTriggeredActions', () => {
      expect(
        ruleExecutionStatusToRaw({ lastExecutionDate: date, status, numberOfTriggeredActions: 5 })
      ).toMatchInlineSnapshot(`
      Object {
        "error": null,
        "lastDuration": 0,
        "lastExecutionDate": "2020-09-03T16:26:58.000Z",
        "status": "ok",
        "warning": null,
      }
    `);
    });
  });

  describe('ruleExecutionStatusFromRaw()', () => {
    const date = new Date('2020-09-03T16:26:58Z').toISOString();
    const status = 'active';
    const reason = RuleExecutionStatusErrorReasons.Execute;
    const error = { reason, message: 'wops' };

    test('no input', () => {
      const result = ruleExecutionStatusFromRaw(MockLogger, 'rule-id');
      expect(result).toBe(undefined);
    });

    test('undefined input', () => {
      const result = ruleExecutionStatusFromRaw(MockLogger, 'rule-id', undefined);
      expect(result).toBe(undefined);
    });

    test('null input', () => {
      const result = ruleExecutionStatusFromRaw(MockLogger, 'rule-id', null);
      expect(result).toBe(undefined);
    });

    test('invalid date', () => {
      const result = ruleExecutionStatusFromRaw(MockLogger, 'rule-id', {
        lastExecutionDate: 'an invalid date',
      })!;
      checkDateIsNearNow(result.lastExecutionDate);
      expect(result.status).toBe('unknown');
      expect(result.error).toBe(undefined);
      expect(result.warning).toBe(undefined);
      expect(MockLogger.debug).toBeCalledWith(
        'invalid ruleExecutionStatus lastExecutionDate "an invalid date" in raw rule rule-id'
      );
    });

    test('valid date', () => {
      const result = ruleExecutionStatusFromRaw(MockLogger, 'rule-id', {
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
      const result = ruleExecutionStatusFromRaw(MockLogger, 'rule-id', {
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
      const result = ruleExecutionStatusFromRaw(MockLogger, 'rule-id', {
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

    test('valid status, date and duration', () => {
      const result = ruleExecutionStatusFromRaw(MockLogger, 'rule-id', {
        status,
        lastExecutionDate: date,
        lastDuration: 1234,
      });
      expect(result).toMatchInlineSnapshot(`
        Object {
          "lastDuration": 1234,
          "lastExecutionDate": 2020-09-03T16:26:58.000Z,
          "status": "active",
        }
      `);
    });

    test('valid status, date, error and duration', () => {
      const result = ruleExecutionStatusFromRaw(MockLogger, 'rule-id', {
        status,
        lastExecutionDate: date,
        error,
        lastDuration: 1234,
      });
      expect(result).toMatchInlineSnapshot(`
        Object {
          "error": Object {
            "message": "wops",
            "reason": "execute",
          },
          "lastDuration": 1234,
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
