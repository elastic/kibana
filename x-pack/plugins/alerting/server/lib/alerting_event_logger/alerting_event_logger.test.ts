/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { eventLoggerMock } from '@kbn/event-log-plugin/server/event_logger.mock';
import { IEvent, SAVED_OBJECT_REL_PRIMARY } from '@kbn/event-log-plugin/server';
import {
  AlertingEventLogger,
  RuleContextOpts,
  initializeExecuteRecord,
  createExecuteStartRecord,
  createExecuteTimeoutRecord,
  createAlertRecord,
  createActionExecuteRecord,
  updateEvent,
} from './alerting_event_logger';
import { UntypedNormalizedRuleType } from '../../rule_type_registry';
import {
  ActionsCompletion,
  RecoveredActionGroup,
  RuleExecutionStatusErrorReasons,
  RuleExecutionStatusWarningReasons,
} from '../../types';
import { RuleRunMetrics } from '../rule_run_metrics_store';
import { EVENT_LOG_ACTIONS } from '../../plugin';
import { TaskRunnerTimerSpan } from '../../task_runner/task_runner_timer';

const mockNow = '2020-01-01T02:00:00.000Z';
const eventLogger = eventLoggerMock.create();

const ruleType: jest.Mocked<UntypedNormalizedRuleType> = {
  id: 'test',
  name: 'My test rule',
  actionGroups: [{ id: 'default', name: 'Default' }, RecoveredActionGroup],
  defaultActionGroupId: 'default',
  minimumLicenseRequired: 'basic',
  isExportable: true,
  recoveryActionGroup: RecoveredActionGroup,
  executor: jest.fn(),
  producer: 'alerts',
  ruleTaskTimeout: '1m',
};

const context: RuleContextOpts = {
  ruleId: '123',
  ruleType,
  consumer: 'test-consumer',
  spaceId: 'test-space',
  executionId: 'abcd-efgh-ijklmnop',
  taskScheduledAt: new Date('2020-01-01T00:00:00.000Z'),
};

const contextWithScheduleDelay = { ...context, taskScheduleDelay: 7200000 };
const contextWithName = { ...contextWithScheduleDelay, ruleName: 'my-super-cool-rule' };

const alert = {
  action: EVENT_LOG_ACTIONS.activeInstance,
  id: 'aaabbb',
  message: `.test-rule-type:123: 'my rule' active alert: 'aaabbb' in actionGroup: 'aGroup';`,
  group: 'aGroup',
  state: {
    start: '2020-01-01T02:00:00.000Z',
    end: '2020-01-01T03:00:00.000Z',
    duration: '2343252346',
  },
  flapping: false,
};

const action = {
  id: 'abc',
  typeId: '.email',
  alertId: '123',
  alertGroup: 'aGroup',
};

describe('AlertingEventLogger', () => {
  let alertingEventLogger: AlertingEventLogger;

  beforeAll(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(mockNow));
  });

  beforeEach(() => {
    jest.resetAllMocks();
    alertingEventLogger = new AlertingEventLogger(eventLogger);
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  describe('initialize()', () => {
    test('initialization should succeed if alertingEventLogger has not been initialized', () => {
      expect(() => alertingEventLogger.initialize(context)).not.toThrow();
    });

    test('initialization should fail if alertingEventLogger has already been initialized', () => {
      alertingEventLogger.initialize(context);
      expect(() => alertingEventLogger.initialize(context)).toThrowErrorMatchingInlineSnapshot(
        `"AlertingEventLogger already initialized"`
      );
    });
  });

  describe('start()', () => {
    test('should throw error if alertingEventLogger has not been initialized', () => {
      expect(() => alertingEventLogger.start()).toThrowErrorMatchingInlineSnapshot(
        `"AlertingEventLogger not initialized"`
      );
    });

    test('should throw error if alertingEventLogger rule context is null', () => {
      alertingEventLogger.initialize(null as unknown as RuleContextOpts);
      expect(() => alertingEventLogger.start()).toThrowErrorMatchingInlineSnapshot(
        `"AlertingEventLogger not initialized"`
      );
    });

    test('should throw error if alertingEventLogger rule context is undefined', () => {
      alertingEventLogger.initialize(undefined as unknown as RuleContextOpts);
      expect(() => alertingEventLogger.start()).toThrowErrorMatchingInlineSnapshot(
        `"AlertingEventLogger not initialized"`
      );
    });

    test('should call eventLogger "startTiming" and "logEvent"', () => {
      alertingEventLogger.initialize(context);
      alertingEventLogger.start();

      expect(eventLogger.startTiming).toHaveBeenCalledTimes(1);
      expect(eventLogger.logEvent).toHaveBeenCalledTimes(1);

      expect(eventLogger.startTiming).toHaveBeenCalledWith(
        initializeExecuteRecord(contextWithScheduleDelay),
        new Date(mockNow)
      );
      expect(eventLogger.logEvent).toHaveBeenCalledWith(
        createExecuteStartRecord(contextWithScheduleDelay, new Date(mockNow))
      );
    });

    test('should initialize the "execute" event', () => {
      mockEventLoggerStartTiming();

      alertingEventLogger.initialize(context);
      alertingEventLogger.start();

      const event = initializeExecuteRecord(contextWithScheduleDelay);
      expect(alertingEventLogger.getEvent()).toEqual({
        ...event,
        event: {
          ...event.event,
          start: new Date(mockNow).toISOString(),
        },
      });
    });
  });

  describe('setRuleName()', () => {
    test('should throw error if alertingEventLogger has not been initialized', () => {
      expect(() => alertingEventLogger.setRuleName('')).toThrowErrorMatchingInlineSnapshot(
        `"AlertingEventLogger not initialized"`
      );
    });

    test('should throw error if event is null', () => {
      alertingEventLogger.initialize(context);
      expect(() => alertingEventLogger.setRuleName('')).toThrowErrorMatchingInlineSnapshot(
        `"AlertingEventLogger not initialized"`
      );
    });

    test('should update event with rule name correctly', () => {
      alertingEventLogger.initialize(context);
      alertingEventLogger.start();
      alertingEventLogger.setRuleName('my-super-cool-rule');

      const event = initializeExecuteRecord(contextWithScheduleDelay);
      expect(alertingEventLogger.getEvent()).toEqual({
        ...event,
        rule: {
          ...event.rule,
          name: 'my-super-cool-rule',
        },
      });
    });
  });

  describe('setExecutionSucceeded()', () => {
    test('should throw error if alertingEventLogger has not been initialized', () => {
      expect(() =>
        alertingEventLogger.setExecutionSucceeded('')
      ).toThrowErrorMatchingInlineSnapshot(`"AlertingEventLogger not initialized"`);
    });

    test('should throw error if event is null', () => {
      alertingEventLogger.initialize(context);
      expect(() =>
        alertingEventLogger.setExecutionSucceeded('')
      ).toThrowErrorMatchingInlineSnapshot(`"AlertingEventLogger not initialized"`);
    });

    test('should update execute event correctly', () => {
      mockEventLoggerStartTiming();

      alertingEventLogger.initialize(context);
      alertingEventLogger.start();
      alertingEventLogger.setRuleName('my-super-cool-rule');
      alertingEventLogger.setExecutionSucceeded('success!');

      const event = initializeExecuteRecord(contextWithScheduleDelay);
      expect(alertingEventLogger.getEvent()).toEqual({
        ...event,
        event: {
          ...event.event,
          start: new Date(mockNow).toISOString(),
          outcome: 'success',
        },
        rule: {
          ...event.rule,
          name: 'my-super-cool-rule',
        },
        kibana: {
          ...event.kibana,
          alerting: {
            outcome: 'success',
          },
        },
        message: 'success!',
      });
    });
  });

  describe('setExecutionFailed()', () => {
    test('should throw error if alertingEventLogger has not been initialized', () => {
      expect(() =>
        alertingEventLogger.setExecutionFailed('', '')
      ).toThrowErrorMatchingInlineSnapshot(`"AlertingEventLogger not initialized"`);
    });

    test('should throw error if event is null', () => {
      alertingEventLogger.initialize(context);
      expect(() =>
        alertingEventLogger.setExecutionFailed('', '')
      ).toThrowErrorMatchingInlineSnapshot(`"AlertingEventLogger not initialized"`);
    });

    test('should update execute event correctly', () => {
      mockEventLoggerStartTiming();

      alertingEventLogger.initialize(context);
      alertingEventLogger.start();
      alertingEventLogger.setExecutionFailed('rule failed!', 'something went wrong!');

      const event = initializeExecuteRecord(contextWithScheduleDelay);
      expect(alertingEventLogger.getEvent()).toEqual({
        ...event,
        event: {
          ...event.event,
          start: new Date(mockNow).toISOString(),
          outcome: 'failure',
        },
        error: {
          message: 'something went wrong!',
        },
        kibana: {
          ...event.kibana,
          alerting: {
            outcome: 'failure',
          },
        },
        message: 'rule failed!',
      });
    });
  });

  describe('logTimeout()', () => {
    test('should throw error if alertingEventLogger has not been initialized', () => {
      expect(() => alertingEventLogger.logTimeout()).toThrowErrorMatchingInlineSnapshot(
        `"AlertingEventLogger not initialized"`
      );
    });

    test('should throw error if alertingEventLogger rule context is null', () => {
      alertingEventLogger.initialize(null as unknown as RuleContextOpts);
      expect(() => alertingEventLogger.logTimeout()).toThrowErrorMatchingInlineSnapshot(
        `"AlertingEventLogger not initialized"`
      );
    });

    test('should throw error if alertingEventLogger rule context is undefined', () => {
      alertingEventLogger.initialize(undefined as unknown as RuleContextOpts);
      expect(() => alertingEventLogger.logTimeout()).toThrowErrorMatchingInlineSnapshot(
        `"AlertingEventLogger not initialized"`
      );
    });

    test('should log timeout event', () => {
      alertingEventLogger.initialize(context);
      alertingEventLogger.logTimeout();

      const event = createExecuteTimeoutRecord(contextWithName);

      expect(eventLogger.logEvent).toHaveBeenCalledWith(event);
    });
  });

  describe('logAlert()', () => {
    test('should throw error if alertingEventLogger has not been initialized', () => {
      expect(() => alertingEventLogger.logAlert(alert)).toThrowErrorMatchingInlineSnapshot(
        `"AlertingEventLogger not initialized"`
      );
    });

    test('should throw error if alertingEventLogger rule context is null', () => {
      alertingEventLogger.initialize(null as unknown as RuleContextOpts);
      expect(() => alertingEventLogger.logAlert(alert)).toThrowErrorMatchingInlineSnapshot(
        `"AlertingEventLogger not initialized"`
      );
    });

    test('should throw error if alertingEventLogger rule context is undefined', () => {
      alertingEventLogger.initialize(undefined as unknown as RuleContextOpts);
      expect(() => alertingEventLogger.logAlert(alert)).toThrowErrorMatchingInlineSnapshot(
        `"AlertingEventLogger not initialized"`
      );
    });

    test('should log timeout event', () => {
      alertingEventLogger.initialize(context);
      alertingEventLogger.logAlert(alert);

      const event = createAlertRecord(contextWithName, alert);

      expect(eventLogger.logEvent).toHaveBeenCalledWith(event);
    });
  });

  describe('logAction()', () => {
    test('should throw error if alertingEventLogger has not been initialized', () => {
      expect(() => alertingEventLogger.logAction(action)).toThrowErrorMatchingInlineSnapshot(
        `"AlertingEventLogger not initialized"`
      );
    });

    test('should throw error if alertingEventLogger rule context is null', () => {
      alertingEventLogger.initialize(null as unknown as RuleContextOpts);
      expect(() => alertingEventLogger.logAction(action)).toThrowErrorMatchingInlineSnapshot(
        `"AlertingEventLogger not initialized"`
      );
    });

    test('should throw error if alertingEventLogger rule context is undefined', () => {
      alertingEventLogger.initialize(undefined as unknown as RuleContextOpts);
      expect(() => alertingEventLogger.logAction(action)).toThrowErrorMatchingInlineSnapshot(
        `"AlertingEventLogger not initialized"`
      );
    });

    test('should log timeout event', () => {
      alertingEventLogger.initialize(context);
      alertingEventLogger.logAction(action);

      const event = createActionExecuteRecord(contextWithName, action);

      expect(eventLogger.logEvent).toHaveBeenCalledWith(event);
    });
  });

  describe('done()', () => {
    test('should throw error if alertingEventLogger has not been initialized', () => {
      expect(() => alertingEventLogger.done({})).toThrowErrorMatchingInlineSnapshot(
        `"AlertingEventLogger not initialized"`
      );
    });

    test('should throw error if alertingEventLogger rule context is null', () => {
      alertingEventLogger.initialize(null as unknown as RuleContextOpts);
      expect(() => alertingEventLogger.done({})).toThrowErrorMatchingInlineSnapshot(
        `"AlertingEventLogger not initialized"`
      );
    });

    test('should throw error if alertingEventLogger rule context is undefined', () => {
      alertingEventLogger.initialize(undefined as unknown as RuleContextOpts);
      expect(() => alertingEventLogger.done({})).toThrowErrorMatchingInlineSnapshot(
        `"AlertingEventLogger not initialized"`
      );
    });

    test('should throw error if event is null', () => {
      alertingEventLogger.initialize(context);
      expect(() => alertingEventLogger.done({})).toThrowErrorMatchingInlineSnapshot(
        `"AlertingEventLogger not initialized"`
      );
    });

    test('should log event if no status or metrics are provided', () => {
      alertingEventLogger.initialize(context);
      alertingEventLogger.start();
      alertingEventLogger.done({});

      const event = initializeExecuteRecord(contextWithScheduleDelay);

      expect(eventLogger.logEvent).toHaveBeenCalledWith(event);
    });

    test('should set fields from execution status if provided', () => {
      alertingEventLogger.initialize(context);
      alertingEventLogger.start();
      alertingEventLogger.done({
        status: { lastExecutionDate: new Date('2022-05-05T15:59:54.480Z'), status: 'active' },
      });

      const event = initializeExecuteRecord(contextWithScheduleDelay);
      const loggedEvent = {
        ...event,
        kibana: {
          ...event?.kibana,
          alerting: {
            status: 'active',
          },
        },
      };
      expect(alertingEventLogger.getEvent()).toEqual(loggedEvent);
      expect(eventLogger.logEvent).toHaveBeenCalledWith(loggedEvent);
    });

    test('should set fields from execution status if execution status is error', () => {
      alertingEventLogger.initialize(context);
      alertingEventLogger.start();
      alertingEventLogger.done({
        status: {
          lastExecutionDate: new Date('2022-05-05T15:59:54.480Z'),
          status: 'error',
          error: {
            reason: RuleExecutionStatusErrorReasons.Execute,
            message: 'something went wrong',
          },
        },
      });

      const event = initializeExecuteRecord(contextWithScheduleDelay);
      const loggedEvent = {
        ...event,
        event: {
          ...event?.event,
          outcome: 'failure',
          reason: RuleExecutionStatusErrorReasons.Execute,
        },
        error: {
          message: 'something went wrong',
        },
        kibana: {
          ...event?.kibana,
          alerting: {
            status: 'error',
            outcome: 'failure',
          },
        },
        message: 'test:123: execution failed',
      };

      expect(alertingEventLogger.getEvent()).toEqual(loggedEvent);
      expect(eventLogger.logEvent).toHaveBeenCalledWith(loggedEvent);
    });

    test('should set fields from execution status if execution status is error and uses "unknown" if no reason is provided', () => {
      alertingEventLogger.initialize(context);
      alertingEventLogger.start();
      alertingEventLogger.done({
        status: {
          lastExecutionDate: new Date('2022-05-05T15:59:54.480Z'),
          status: 'error',
          error: {
            reason: undefined as unknown as RuleExecutionStatusErrorReasons,
            message: 'something went wrong',
          },
        },
      });

      const event = initializeExecuteRecord(contextWithScheduleDelay);
      const loggedEvent = {
        ...event,
        event: {
          ...event?.event,
          outcome: 'failure',
          reason: 'unknown',
        },
        error: {
          message: 'something went wrong',
        },
        kibana: {
          ...event?.kibana,
          alerting: {
            status: 'error',
            outcome: 'failure',
          },
        },
        message: 'test:123: execution failed',
      };

      expect(alertingEventLogger.getEvent()).toEqual(loggedEvent);
      expect(eventLogger.logEvent).toHaveBeenCalledWith(loggedEvent);
    });

    test('should set fields from execution status if execution status is error and does not overwrite existing error message', () => {
      alertingEventLogger.initialize(context);
      alertingEventLogger.start();
      alertingEventLogger.done({
        status: {
          lastExecutionDate: new Date('2022-05-05T15:59:54.480Z'),
          status: 'error',
          error: {
            reason: undefined as unknown as RuleExecutionStatusErrorReasons,
            message: 'something went wrong',
          },
        },
      });

      const event = initializeExecuteRecord(contextWithScheduleDelay);
      alertingEventLogger.setExecutionFailed(
        'i am an existing error message',
        'i am an existing error message!'
      );
      const loggedEvent = {
        ...event,
        event: {
          ...event?.event,
          outcome: 'failure',
          reason: 'unknown',
        },
        error: {
          message: 'i am an existing error message!',
        },
        kibana: {
          ...event?.kibana,
          alerting: {
            status: 'error',
            outcome: 'failure',
          },
        },
        message: 'i am an existing error message',
      };

      expect(alertingEventLogger.getEvent()).toEqual(loggedEvent);
      expect(eventLogger.logEvent).toHaveBeenCalledWith(loggedEvent);
    });

    test('should set fields from execution status if execution status is warning', () => {
      alertingEventLogger.initialize(context);
      alertingEventLogger.start();
      alertingEventLogger.done({
        status: {
          lastExecutionDate: new Date('2022-05-05T15:59:54.480Z'),
          status: 'warning',
          warning: {
            reason: RuleExecutionStatusWarningReasons.MAX_EXECUTABLE_ACTIONS,
            message: 'something funky happened',
          },
        },
      });

      const event = initializeExecuteRecord(contextWithScheduleDelay);
      const loggedEvent = {
        ...event,
        event: {
          ...event?.event,
          reason: RuleExecutionStatusWarningReasons.MAX_EXECUTABLE_ACTIONS,
        },
        kibana: {
          ...event?.kibana,
          alerting: {
            status: 'warning',
            outcome: 'warning',
          },
        },
        message: 'something funky happened',
      };

      expect(alertingEventLogger.getEvent()).toEqual(loggedEvent);
      expect(eventLogger.logEvent).toHaveBeenCalledWith(loggedEvent);
    });

    test('should set fields from execution status if execution status is warning and uses "unknown" if no reason is provided', () => {
      alertingEventLogger.initialize(context);
      alertingEventLogger.start();
      alertingEventLogger.done({
        status: {
          lastExecutionDate: new Date('2022-05-05T15:59:54.480Z'),
          status: 'warning',
          warning: {
            reason: undefined as unknown as RuleExecutionStatusWarningReasons,
            message: 'something funky happened',
          },
        },
      });

      const event = initializeExecuteRecord(contextWithScheduleDelay);
      const loggedEvent = {
        ...event,
        event: {
          ...event?.event,
          reason: 'unknown',
        },
        kibana: {
          ...event?.kibana,
          alerting: {
            status: 'warning',
            outcome: 'warning',
          },
        },
        message: 'something funky happened',
      };

      expect(alertingEventLogger.getEvent()).toEqual(loggedEvent);
      expect(eventLogger.logEvent).toHaveBeenCalledWith(loggedEvent);
    });

    test('should set fields from execution status if execution status is warning and uses existing message if no message is provided', () => {
      alertingEventLogger.initialize(context);
      alertingEventLogger.start();
      alertingEventLogger.done({
        status: {
          lastExecutionDate: new Date('2022-05-05T15:59:54.480Z'),
          status: 'warning',
          warning: {
            reason: RuleExecutionStatusWarningReasons.MAX_EXECUTABLE_ACTIONS,
            message: undefined as unknown as string,
          },
        },
      });

      const event = initializeExecuteRecord(contextWithScheduleDelay);
      alertingEventLogger.setExecutionSucceeded('success!');
      const loggedEvent = {
        ...event,
        event: {
          ...event?.event,
          reason: 'maxExecutableActions',
          outcome: 'success',
        },
        kibana: {
          ...event?.kibana,
          alerting: {
            status: 'warning',
            outcome: 'success',
          },
        },
        message: 'success!',
      };

      expect(alertingEventLogger.getEvent()).toEqual(loggedEvent);
      expect(eventLogger.logEvent).toHaveBeenCalledWith(loggedEvent);
    });

    test('should set fields from execution metrics if provided', () => {
      alertingEventLogger.initialize(context);
      alertingEventLogger.start();
      alertingEventLogger.done({
        metrics: {
          numberOfTriggeredActions: 1,
          numberOfGeneratedActions: 2,
          numberOfActiveAlerts: 3,
          numberOfNewAlerts: 4,
          numberOfRecoveredAlerts: 5,
          numSearches: 6,
          esSearchDurationMs: 3300,
          totalSearchDurationMs: 10333,
          hasReachedAlertLimit: false,
          triggeredActionsStatus: ActionsCompletion.COMPLETE,
        },
      });

      const event = initializeExecuteRecord(contextWithScheduleDelay);
      const loggedEvent = {
        ...event,
        kibana: {
          ...event.kibana,
          alert: {
            ...event.kibana?.alert,
            rule: {
              ...event.kibana?.alert?.rule,
              execution: {
                ...event.kibana?.alert?.rule?.execution,
                metrics: {
                  number_of_triggered_actions: 1,
                  number_of_generated_actions: 2,
                  alert_counts: {
                    active: 3,
                    new: 4,
                    recovered: 5,
                  },
                  number_of_searches: 6,
                  es_search_duration_ms: 3300,
                  total_search_duration_ms: 10333,
                },
              },
            },
          },
        },
      };

      expect(alertingEventLogger.getEvent()).toEqual(loggedEvent);
      expect(eventLogger.logEvent).toHaveBeenCalledWith(loggedEvent);
    });

    test('should set fields from execution timings if provided', () => {
      alertingEventLogger.initialize(context);
      alertingEventLogger.start();
      alertingEventLogger.done({
        timings: {
          [TaskRunnerTimerSpan.StartTaskRun]: 10,
          [TaskRunnerTimerSpan.TotalRunDuration]: 20,
          [TaskRunnerTimerSpan.PrepareRule]: 30,
          [TaskRunnerTimerSpan.RuleTypeRun]: 40,
          [TaskRunnerTimerSpan.ProcessAlerts]: 50,
          [TaskRunnerTimerSpan.TriggerActions]: 60,
          [TaskRunnerTimerSpan.ProcessRuleRun]: 70,
        },
      });

      const event = initializeExecuteRecord(contextWithScheduleDelay);
      const loggedEvent = {
        ...event,
        kibana: {
          ...event.kibana,
          alert: {
            ...event.kibana?.alert,
            rule: {
              ...event.kibana?.alert?.rule,
              execution: {
                ...event.kibana?.alert?.rule?.execution,
                metrics: {
                  claim_to_start_duration_ms: 10,
                  total_run_duration_ms: 20,
                  prepare_rule_duration_ms: 30,
                  rule_type_run_duration_ms: 40,
                  process_alerts_duration_ms: 50,
                  trigger_actions_duration_ms: 60,
                  process_rule_duration_ms: 70,
                },
              },
            },
          },
        },
      };

      expect(alertingEventLogger.getEvent()).toEqual(loggedEvent);
      expect(eventLogger.logEvent).toHaveBeenCalledWith(loggedEvent);
    });

    test('should set fields from execution metrics and timings if both provided', () => {
      alertingEventLogger.initialize(context);
      alertingEventLogger.start();
      alertingEventLogger.done({
        metrics: {
          numberOfTriggeredActions: 1,
          numberOfGeneratedActions: 2,
          numberOfActiveAlerts: 3,
          numberOfNewAlerts: 4,
          numberOfRecoveredAlerts: 5,
          numSearches: 6,
          esSearchDurationMs: 3300,
          totalSearchDurationMs: 10333,
          hasReachedAlertLimit: false,
          triggeredActionsStatus: ActionsCompletion.COMPLETE,
        },
        timings: {
          [TaskRunnerTimerSpan.StartTaskRun]: 10,
          [TaskRunnerTimerSpan.TotalRunDuration]: 20,
          [TaskRunnerTimerSpan.PrepareRule]: 30,
          [TaskRunnerTimerSpan.RuleTypeRun]: 40,
          [TaskRunnerTimerSpan.ProcessAlerts]: 50,
          [TaskRunnerTimerSpan.TriggerActions]: 60,
          [TaskRunnerTimerSpan.ProcessRuleRun]: 70,
        },
      });

      const event = initializeExecuteRecord(contextWithScheduleDelay);
      const loggedEvent = {
        ...event,
        kibana: {
          ...event.kibana,
          alert: {
            ...event.kibana?.alert,
            rule: {
              ...event.kibana?.alert?.rule,
              execution: {
                ...event.kibana?.alert?.rule?.execution,
                metrics: {
                  number_of_triggered_actions: 1,
                  number_of_generated_actions: 2,
                  alert_counts: {
                    active: 3,
                    new: 4,
                    recovered: 5,
                  },
                  number_of_searches: 6,
                  es_search_duration_ms: 3300,
                  total_search_duration_ms: 10333,
                  claim_to_start_duration_ms: 10,
                  total_run_duration_ms: 20,
                  prepare_rule_duration_ms: 30,
                  rule_type_run_duration_ms: 40,
                  process_alerts_duration_ms: 50,
                  trigger_actions_duration_ms: 60,
                  process_rule_duration_ms: 70,
                },
              },
            },
          },
        },
      };

      expect(alertingEventLogger.getEvent()).toEqual(loggedEvent);
      expect(eventLogger.logEvent).toHaveBeenCalledWith(loggedEvent);
    });

    test('should set fields to 0 execution metrics are provided but undefined', () => {
      alertingEventLogger.initialize(context);
      alertingEventLogger.start();
      alertingEventLogger.done({
        metrics: {} as unknown as RuleRunMetrics,
      });

      const event = initializeExecuteRecord(contextWithScheduleDelay);
      const loggedEvent = {
        ...event,
        kibana: {
          ...event.kibana,
          alert: {
            ...event.kibana?.alert,
            rule: {
              ...event.kibana?.alert?.rule,
              execution: {
                ...event.kibana?.alert?.rule?.execution,
                metrics: {
                  number_of_triggered_actions: 0,
                  number_of_generated_actions: 0,
                  alert_counts: {
                    active: 0,
                    new: 0,
                    recovered: 0,
                  },
                  number_of_searches: 0,
                  es_search_duration_ms: 0,
                  total_search_duration_ms: 0,
                },
              },
            },
          },
        },
      };

      expect(alertingEventLogger.getEvent()).toEqual(loggedEvent);
      expect(eventLogger.logEvent).toHaveBeenCalledWith(loggedEvent);
    });

    test('overwrites the message when the final status is error', () => {
      alertingEventLogger.initialize(context);
      alertingEventLogger.start();
      alertingEventLogger.setExecutionSucceeded('success message');

      expect(alertingEventLogger.getEvent()!.message).toBe('success message');

      alertingEventLogger.done({
        status: {
          status: 'error',
          lastExecutionDate: new Date(),
          error: { reason: RuleExecutionStatusErrorReasons.Execute, message: 'failed execution' },
        },
      });

      expect(alertingEventLogger.getEvent()!.message).toBe('test:123: execution failed');
    });

    test('does not overwrites the message when there is already a failure message', () => {
      alertingEventLogger.initialize(context);
      alertingEventLogger.start();
      alertingEventLogger.setExecutionFailed('first failure message', 'failure error message');

      expect(alertingEventLogger.getEvent()!.message).toBe('first failure message');

      alertingEventLogger.done({
        status: {
          status: 'error',
          lastExecutionDate: new Date(),
          error: {
            reason: RuleExecutionStatusErrorReasons.Execute,
            message: 'second failure execution',
          },
        },
      });

      expect(alertingEventLogger.getEvent()!.message).toBe('first failure message');
    });
  });
});

describe('createExecuteStartRecord', () => {
  test('should create execute-start record', () => {
    const executeRecord = initializeExecuteRecord(contextWithScheduleDelay);
    const record = createExecuteStartRecord(contextWithScheduleDelay);

    expect(record).toEqual({
      ...executeRecord,
      event: {
        ...executeRecord.event,
        action: 'execute-start',
      },
      message: `rule execution start: "123"`,
    });
  });

  test('should create execute-start record with given start time', () => {
    const executeRecord = initializeExecuteRecord(contextWithScheduleDelay);
    const record = createExecuteStartRecord(
      contextWithScheduleDelay,
      new Date('2022-01-01T02:00:00.000Z')
    );

    expect(record).toEqual({
      ...executeRecord,
      event: {
        ...executeRecord.event,
        action: 'execute-start',
        start: '2022-01-01T02:00:00.000Z',
      },
      message: `rule execution start: "123"`,
    });
  });
});

describe('initializeExecuteRecord', () => {
  test('should populate initial set of fields in event log record', () => {
    const record = initializeExecuteRecord(contextWithScheduleDelay);

    expect(record.event).toBeDefined();
    expect(record.kibana).toBeDefined();
    expect(record.kibana?.alert).toBeDefined();
    expect(record.kibana?.alert?.rule).toBeDefined();
    expect(record.kibana?.alert?.rule?.execution).toBeDefined();
    expect(record.kibana?.saved_objects).toBeDefined();
    expect(record.kibana?.space_ids).toBeDefined();
    expect(record.kibana?.task).toBeDefined();
    expect(record.rule).toBeDefined();

    // these fields should be explicitly set
    expect(record.event?.action).toEqual('execute');
    expect(record.event?.kind).toEqual('alert');
    expect(record.event?.category).toEqual([contextWithScheduleDelay.ruleType.producer]);
    expect(record.kibana?.alert?.rule?.rule_type_id).toEqual(contextWithScheduleDelay.ruleType.id);
    expect(record.kibana?.alert?.rule?.consumer).toEqual(contextWithScheduleDelay.consumer);
    expect(record.kibana?.alert?.rule?.execution?.uuid).toEqual(
      contextWithScheduleDelay.executionId
    );
    expect(record.kibana?.saved_objects).toEqual([
      {
        id: contextWithScheduleDelay.ruleId,
        type: 'alert',
        type_id: contextWithScheduleDelay.ruleType.id,
        rel: SAVED_OBJECT_REL_PRIMARY,
      },
    ]);
    expect(record.kibana?.space_ids).toEqual([contextWithScheduleDelay.spaceId]);
    expect(record.kibana?.task?.scheduled).toEqual(
      contextWithScheduleDelay.taskScheduledAt.toISOString()
    );
    expect(record.kibana?.task?.schedule_delay).toEqual(
      contextWithScheduleDelay.taskScheduleDelay * 1000000
    );
    expect(record?.rule?.id).toEqual(contextWithScheduleDelay.ruleId);
    expect(record?.rule?.license).toEqual(contextWithScheduleDelay.ruleType.minimumLicenseRequired);
    expect(record?.rule?.category).toEqual(contextWithScheduleDelay.ruleType.id);
    expect(record?.rule?.ruleset).toEqual(contextWithScheduleDelay.ruleType.producer);

    // these fields should not be set by this function
    expect(record['@timestamp']).toBeUndefined();
    expect(record.event?.provider).toBeUndefined();
    expect(record.event?.start).toBeUndefined();
    expect(record.event?.outcome).toBeUndefined();
    expect(record.event?.end).toBeUndefined();
    expect(record.event?.duration).toBeUndefined();
    expect(record.kibana?.alert?.rule?.execution?.metrics).toBeUndefined();
    expect(record.kibana?.alerting).toBeUndefined();
    expect(record.kibana?.server_uuid).toBeUndefined();
    expect(record.kibana?.version).toBeUndefined();
    expect(record?.rule?.name).toBeUndefined();
    expect(record?.message).toBeUndefined();
    expect(record?.ecs).toBeUndefined();
  });
});

describe('createExecuteTimeoutRecord', () => {
  test('should populate expected fields in event log record', () => {
    const record = createExecuteTimeoutRecord(contextWithName);

    expect(record.event).toBeDefined();
    expect(record.kibana).toBeDefined();
    expect(record.kibana?.alert).toBeDefined();
    expect(record.kibana?.alert?.rule).toBeDefined();
    expect(record.kibana?.alert?.rule?.execution).toBeDefined();
    expect(record.kibana?.saved_objects).toBeDefined();
    expect(record.kibana?.space_ids).toBeDefined();
    expect(record.rule).toBeDefined();

    // these fields should be explicitly set
    expect(record.event?.action).toEqual('execute-timeout');
    expect(record.event?.kind).toEqual('alert');
    expect(record.message).toEqual(
      `rule: test:123: 'my-super-cool-rule' execution cancelled due to timeout - exceeded rule type timeout of 1m`
    );
    expect(record.event?.category).toEqual([contextWithName.ruleType.producer]);
    expect(record.kibana?.alert?.rule?.rule_type_id).toEqual(contextWithName.ruleType.id);
    expect(record.kibana?.alert?.rule?.consumer).toEqual(contextWithName.consumer);
    expect(record.kibana?.alert?.rule?.execution?.uuid).toEqual(contextWithName.executionId);
    expect(record.kibana?.saved_objects).toEqual([
      {
        id: contextWithName.ruleId,
        type: 'alert',
        type_id: contextWithName.ruleType.id,
        rel: SAVED_OBJECT_REL_PRIMARY,
      },
    ]);
    expect(record.kibana?.space_ids).toEqual([contextWithName.spaceId]);
    expect(record?.rule?.id).toEqual(contextWithName.ruleId);
    expect(record?.rule?.license).toEqual(contextWithName.ruleType.minimumLicenseRequired);
    expect(record?.rule?.category).toEqual(contextWithName.ruleType.id);
    expect(record?.rule?.ruleset).toEqual(contextWithName.ruleType.producer);
    expect(record?.rule?.name).toEqual(contextWithName.ruleName);

    // these fields should not be set by this function
    expect(record['@timestamp']).toBeUndefined();
    expect(record.event?.provider).toBeUndefined();
    expect(record.event?.start).toBeUndefined();
    expect(record.event?.outcome).toBeUndefined();
    expect(record.event?.end).toBeUndefined();
    expect(record.event?.duration).toBeUndefined();
    expect(record.kibana?.alert?.rule?.execution?.metrics).toBeUndefined();
    expect(record.kibana?.alerting).toBeUndefined();
    expect(record.kibana?.server_uuid).toBeUndefined();
    expect(record.kibana?.task).toBeUndefined();
    expect(record.kibana?.version).toBeUndefined();
    expect(record?.ecs).toBeUndefined();
  });
});

describe('createAlertRecord', () => {
  test('should populate expected fields in event log record', () => {
    const record = createAlertRecord(contextWithName, alert);

    // these fields should be explicitly set
    expect(record.event?.action).toEqual('active-instance');
    expect(record.event?.kind).toEqual('alert');
    expect(record.event?.category).toEqual([contextWithName.ruleType.producer]);
    expect(record.event?.start).toEqual(alert.state.start);
    expect(record.event?.end).toEqual(alert.state.end);
    expect(record.event?.duration).toEqual(alert.state.duration);
    expect(record.message).toEqual(
      `.test-rule-type:123: 'my rule' active alert: 'aaabbb' in actionGroup: 'aGroup';`
    );
    expect(record.kibana?.alert?.rule?.rule_type_id).toEqual(contextWithName.ruleType.id);
    expect(record.kibana?.alert?.rule?.consumer).toEqual(contextWithName.consumer);
    expect(record.kibana?.alert?.rule?.execution?.uuid).toEqual(contextWithName.executionId);
    expect(record.kibana?.alerting?.instance_id).toEqual(alert.id);
    expect(record.kibana?.alerting?.action_group_id).toEqual(alert.group);
    expect(record.kibana?.saved_objects).toEqual([
      {
        id: contextWithName.ruleId,
        type: 'alert',
        type_id: contextWithName.ruleType.id,
        rel: SAVED_OBJECT_REL_PRIMARY,
      },
    ]);
    expect(record.kibana?.space_ids).toEqual([contextWithName.spaceId]);
    expect(record?.rule?.id).toEqual(contextWithName.ruleId);
    expect(record?.rule?.license).toEqual(contextWithName.ruleType.minimumLicenseRequired);
    expect(record?.rule?.category).toEqual(contextWithName.ruleType.id);
    expect(record?.rule?.ruleset).toEqual(contextWithName.ruleType.producer);
    expect(record?.rule?.name).toEqual(contextWithName.ruleName);

    // these fields should not be set by this function
    expect(record['@timestamp']).toBeUndefined();
    expect(record.event?.provider).toBeUndefined();
    expect(record.event?.outcome).toBeUndefined();
    expect(record.kibana?.alert?.rule?.execution?.metrics).toBeUndefined();
    expect(record.kibana?.server_uuid).toBeUndefined();
    expect(record.kibana?.task).toBeUndefined();
    expect(record.kibana?.version).toBeUndefined();
    expect(record?.ecs).toBeUndefined();
  });
});

describe('createActionExecuteRecord', () => {
  test('should populate expected fields in event log record', () => {
    const record = createActionExecuteRecord(contextWithName, action);

    expect(record.event).toBeDefined();
    expect(record.kibana).toBeDefined();
    expect(record.kibana?.alert).toBeDefined();
    expect(record.kibana?.alert?.rule).toBeDefined();
    expect(record.kibana?.alert?.rule?.execution).toBeDefined();
    expect(record.kibana?.saved_objects).toBeDefined();
    expect(record.kibana?.space_ids).toBeDefined();
    expect(record.rule).toBeDefined();

    // these fields should be explicitly set
    expect(record.event?.action).toEqual('execute-action');
    expect(record.event?.kind).toEqual('alert');
    expect(record.event?.category).toEqual([contextWithName.ruleType.producer]);
    expect(record.message).toEqual(
      `alert: test:123: 'my-super-cool-rule' instanceId: '123' scheduled actionGroup: 'aGroup' action: .email:abc`
    );
    expect(record.kibana?.alert?.rule?.rule_type_id).toEqual(contextWithName.ruleType.id);
    expect(record.kibana?.alert?.rule?.consumer).toEqual(contextWithName.consumer);
    expect(record.kibana?.alert?.rule?.execution?.uuid).toEqual(contextWithName.executionId);
    expect(record.kibana?.alerting?.instance_id).toEqual(action.alertId);
    expect(record.kibana?.alerting?.action_group_id).toEqual(action.alertGroup);
    expect(record.kibana?.saved_objects).toEqual([
      {
        id: contextWithName.ruleId,
        type: 'alert',
        type_id: contextWithName.ruleType.id,
        rel: SAVED_OBJECT_REL_PRIMARY,
      },
      {
        id: action.id,
        type: 'action',
        type_id: action.typeId,
      },
    ]);
    expect(record.kibana?.space_ids).toEqual([contextWithName.spaceId]);
    expect(record?.rule?.id).toEqual(contextWithName.ruleId);
    expect(record?.rule?.license).toEqual(contextWithName.ruleType.minimumLicenseRequired);
    expect(record?.rule?.category).toEqual(contextWithName.ruleType.id);
    expect(record?.rule?.ruleset).toEqual(contextWithName.ruleType.producer);
    expect(record?.rule?.name).toEqual(contextWithName.ruleName);

    // these fields should not be set by this function
    expect(record['@timestamp']).toBeUndefined();
    expect(record.event?.provider).toBeUndefined();
    expect(record.event?.start).toBeUndefined();
    expect(record.event?.outcome).toBeUndefined();
    expect(record.event?.end).toBeUndefined();
    expect(record.event?.duration).toBeUndefined();
    expect(record.kibana?.alert?.rule?.execution?.metrics).toBeUndefined();
    expect(record.kibana?.server_uuid).toBeUndefined();
    expect(record.kibana?.task).toBeUndefined();
    expect(record.kibana?.version).toBeUndefined();
    expect(record?.ecs).toBeUndefined();
  });
});

describe('updateEvent', () => {
  let event: IEvent;
  let expectedEvent: IEvent;
  beforeEach(() => {
    event = initializeExecuteRecord(contextWithScheduleDelay);
    expectedEvent = initializeExecuteRecord(contextWithScheduleDelay);
  });

  test('throws error if event is null', () => {
    expect(() => updateEvent(null as unknown as IEvent, {})).toThrowErrorMatchingInlineSnapshot(
      `"Cannot update event because it is not initialized."`
    );
  });

  test('throws error if event is undefined', () => {
    expect(() =>
      updateEvent(undefined as unknown as IEvent, {})
    ).toThrowErrorMatchingInlineSnapshot(`"Cannot update event because it is not initialized."`);
  });

  test('updates event message if provided', () => {
    updateEvent(event, { message: 'tell me something good' });
    expect(event).toEqual({
      ...expectedEvent,
      message: 'tell me something good',
    });
  });

  test('updates event outcome if provided', () => {
    updateEvent(event, { outcome: 'yay' });
    expect(event).toEqual({
      ...expectedEvent,
      event: {
        ...expectedEvent?.event,
        outcome: 'yay',
      },
    });
  });

  test('updates event error if provided', () => {
    updateEvent(event, { error: 'oh no' });
    expect(event).toEqual({
      ...expectedEvent,
      error: {
        message: 'oh no',
      },
    });
  });

  test('updates event rule name if provided', () => {
    updateEvent(event, { ruleName: 'test rule' });
    expect(event).toEqual({
      ...expectedEvent,
      rule: {
        ...expectedEvent?.rule,
        name: 'test rule',
      },
    });
  });

  test('updates event status if provided', () => {
    updateEvent(event, { status: 'ok' });
    expect(event).toEqual({
      ...expectedEvent,
      kibana: {
        ...expectedEvent?.kibana,
        alerting: {
          status: 'ok',
        },
      },
    });
  });

  test('updates event reason if provided', () => {
    updateEvent(event, { reason: 'my-reason' });
    expect(event).toEqual({
      ...expectedEvent,
      event: {
        ...expectedEvent?.event,
        reason: 'my-reason',
      },
    });
  });

  test('updates all fields if provided', () => {
    updateEvent(event, {
      message: 'tell me something good',
      outcome: 'yay',
      error: 'oh no',
      ruleName: 'test rule',
      status: 'ok',
      reason: 'my-reason',
    });
    expect(event).toEqual({
      ...expectedEvent,
      message: 'tell me something good',
      kibana: {
        ...expectedEvent?.kibana,
        alerting: {
          status: 'ok',
        },
      },
      event: {
        ...expectedEvent?.event,
        outcome: 'yay',
        reason: 'my-reason',
      },
      error: {
        message: 'oh no',
      },
      rule: {
        ...expectedEvent?.rule,
        name: 'test rule',
      },
    });
  });
});

function mockEventLoggerStartTiming() {
  eventLogger.startTiming.mockImplementationOnce((event: IEvent, startTime?: Date) => {
    if (event == null) return;
    event.event = event.event || {};

    const start = startTime ?? new Date();
    event.event.start = start.toISOString();
  });
}
