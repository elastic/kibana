/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import {
  ActionsCompletion,
  RuleExecutionStatusErrorReasons,
  RuleExecutionStatusWarningReasons,
  EMPTY_RULE_EXECUTION_METRICS,
  EMPTY_RULE_EXECUTION_STATE,
  RuleExecutionMetrics,
} from '../types';
import {
  executionStatusFromState,
  executionStatusFromError,
  ruleExecutionStatusToRaw,
  ruleExecutionStatusFromRaw,
} from './rule_execution_status';
import { ErrorWithReason } from './error_with_reason';
import { translations } from '../constants/translations';

const MockLogger = loggingSystemMock.create().get();
const executionMetrics = {
  numSearches: 1,
  esSearchDurationMs: 10,
  totalSearchDurationMs: 20,
  numberOfTriggeredActions: 32,
  numberOfScheduledActions: 11,
  numberOfActiveAlerts: 2,
  numberOfNewAlerts: 3,
  numberOfRecoveredAlerts: 13,
  triggeredActionsStatus: ActionsCompletion.COMPLETE,
};

describe('RuleExecutionStatus', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  function testExpectedMetrics(received: RuleExecutionMetrics, expected: RuleExecutionMetrics) {
    expect(received.numSearches).toEqual(expected.numSearches);
    expect(received.totalSearchDurationMs).toEqual(expected.totalSearchDurationMs);
    expect(received.esSearchDurationMs).toEqual(expected.esSearchDurationMs);
    expect(received.numberOfTriggeredActions).toEqual(expected.numberOfTriggeredActions);
    expect(received.numberOfScheduledActions).toEqual(expected.numberOfScheduledActions);
    expect(received.numberOfActiveAlerts).toEqual(expected.numberOfActiveAlerts);
    expect(received.numberOfRecoveredAlerts).toEqual(expected.numberOfRecoveredAlerts);
    expect(received.numberOfNewAlerts).toEqual(expected.numberOfNewAlerts);
    expect(received.triggeredActionsStatus).toEqual(expected.triggeredActionsStatus);
  }

  describe('executionStatusFromState()', () => {
    test('empty task state', () => {
      const { status, metrics } = executionStatusFromState(EMPTY_RULE_EXECUTION_STATE);
      checkDateIsNearNow(status.lastExecutionDate);
      expect(status.status).toBe('ok');
      expect(status.error).toBe(undefined);
      expect(status.warning).toBe(undefined);

      testExpectedMetrics(metrics, EMPTY_RULE_EXECUTION_METRICS);
    });

    test('task state with no instances', () => {
      const { status, metrics } = executionStatusFromState({
        alertInstances: {},
        metrics: executionMetrics,
      });
      checkDateIsNearNow(status.lastExecutionDate);
      expect(status.status).toBe('ok');
      expect(status.error).toBe(undefined);
      expect(status.warning).toBe(undefined);

      testExpectedMetrics(metrics, executionMetrics);
    });

    test('task state with one instance', () => {
      const { status, metrics } = executionStatusFromState({
        alertInstances: { a: {} },
        metrics: executionMetrics,
      });
      checkDateIsNearNow(status.lastExecutionDate);
      expect(status.status).toBe('active');
      expect(status.error).toBe(undefined);
      expect(status.warning).toBe(undefined);

      testExpectedMetrics(metrics, executionMetrics);
    });

    test('task state with warning', () => {
      const { status, metrics } = executionStatusFromState({
        alertInstances: { a: {} },
        metrics: { ...executionMetrics, triggeredActionsStatus: ActionsCompletion.PARTIAL },
      });
      checkDateIsNearNow(status.lastExecutionDate);
      expect(status.warning).toEqual({
        message: translations.taskRunner.warning.maxExecutableActions,
        reason: RuleExecutionStatusWarningReasons.MAX_EXECUTABLE_ACTIONS,
      });
      expect(status.status).toBe('warning');
      expect(status.error).toBe(undefined);

      testExpectedMetrics(metrics, {
        ...executionMetrics,
        triggeredActionsStatus: ActionsCompletion.PARTIAL,
      });
    });
  });

  describe('executionStatusFromError()', () => {
    test('error with no reason', () => {
      const { status, metrics } = executionStatusFromError(new Error('boo!'));
      expect(status.status).toBe('error');
      expect(status.error).toMatchInlineSnapshot(`
        Object {
          "message": "boo!",
          "reason": "unknown",
        }
      `);

      testExpectedMetrics(metrics, EMPTY_RULE_EXECUTION_METRICS);
    });

    test('error with a reason', () => {
      const { status, metrics } = executionStatusFromError(
        new ErrorWithReason(RuleExecutionStatusErrorReasons.Execute, new Error('hoo!'))
      );
      expect(status.status).toBe('error');
      expect(status.error).toMatchInlineSnapshot(`
        Object {
          "message": "hoo!",
          "reason": "execute",
        }
      `);

      testExpectedMetrics(metrics, EMPTY_RULE_EXECUTION_METRICS);
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

    test('status with a alerts and actions counts', () => {
      expect(
        ruleExecutionStatusToRaw({
          lastExecutionDate: date,
          status,
        })
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
