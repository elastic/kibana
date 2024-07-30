/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import sinon from 'sinon';
import { actionsClientMock, actionsMock } from '@kbn/actions-plugin/server/mocks';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { alertsClientMock } from '../../../alerts_client/alerts_client.mock';
import { alertingEventLoggerMock } from '../../../lib/alerting_event_logger/alerting_event_logger.mock';
import { RuleRunMetricsStore } from '../../../lib/rule_run_metrics_store';
import { mockAAD } from '../../fixtures';
import { SummaryActionScheduler } from './summary_action_scheduler';
import { getRule, getRuleType, getDefaultSchedulerContext, generateAlert } from '../test_fixtures';
import { RuleAction } from '@kbn/alerting-types';
import { ALERT_UUID } from '@kbn/rule-data-utils';
import {
  getErrorSource,
  TaskErrorSource,
} from '@kbn/task-manager-plugin/server/task_running/errors';

const alertingEventLogger = alertingEventLoggerMock.create();
const actionsClient = actionsClientMock.create();
const alertsClient = alertsClientMock.create();
const mockActionsPlugin = actionsMock.createStart();
const logger = loggingSystemMock.create().get();

let ruleRunMetricsStore: RuleRunMetricsStore;
const rule = getRule({
  actions: [
    {
      id: '1',
      group: 'default',
      actionTypeId: 'test',
      frequency: { summary: false, notifyWhen: 'onActiveAlert', throttle: null },
      params: {
        foo: true,
        contextVal: 'My {{context.value}} goes here',
        stateVal: 'My {{state.value}} goes here',
        alertVal:
          'My {{rule.id}} {{rule.name}} {{rule.spaceId}} {{rule.tags}} {{alert.id}} goes here',
      },
      uuid: '111-111',
    },
    {
      id: '2',
      group: 'default',
      actionTypeId: 'test',
      frequency: { summary: true, notifyWhen: 'onActiveAlert', throttle: null },
      params: {
        foo: true,
        contextVal: 'My {{context.value}} goes here',
        stateVal: 'My {{state.value}} goes here',
        alertVal:
          'My {{rule.id}} {{rule.name}} {{rule.spaceId}} {{rule.tags}} {{alert.id}} goes here',
      },
      uuid: '222-222',
    },
    {
      id: '3',
      group: 'default',
      actionTypeId: 'test',
      frequency: { summary: true, notifyWhen: 'onActiveAlert', throttle: null },
      params: {
        foo: true,
        contextVal: 'My {{context.value}} goes here',
        stateVal: 'My {{state.value}} goes here',
        alertVal:
          'My {{rule.id}} {{rule.name}} {{rule.spaceId}} {{rule.tags}} {{alert.id}} goes here',
      },
      uuid: '333-333',
    },
  ],
});
const ruleType = getRuleType();
const defaultSchedulerContext = getDefaultSchedulerContext(
  logger,
  mockActionsPlugin,
  alertingEventLogger,
  actionsClient,
  alertsClient
);

// @ts-ignore
const getSchedulerContext = (params = {}) => {
  return { ...defaultSchedulerContext, rule, ...params, ruleRunMetricsStore };
};

let clock: sinon.SinonFakeTimers;

describe('Summary Action Scheduler', () => {
  beforeAll(() => {
    clock = sinon.useFakeTimers();
  });

  beforeEach(() => {
    jest.resetAllMocks();
    mockActionsPlugin.isActionTypeEnabled.mockReturnValue(true);
    mockActionsPlugin.isActionExecutable.mockReturnValue(true);
    mockActionsPlugin.getActionsClientWithRequest.mockResolvedValue(actionsClient);
    ruleRunMetricsStore = new RuleRunMetricsStore();
  });

  afterAll(() => {
    clock.restore();
  });

  test('should initialize with only summary actions', () => {
    const scheduler = new SummaryActionScheduler(getSchedulerContext());

    // @ts-expect-error private variable
    expect(scheduler.actions).toHaveLength(2);
    // @ts-expect-error private variable
    expect(scheduler.actions).toEqual([rule.actions[1], rule.actions[2]]);
    expect(logger.error).not.toHaveBeenCalled();
  });

  test('should log if rule type does not support summarized alerts and not initialize any actions', () => {
    const scheduler = new SummaryActionScheduler(
      getSchedulerContext({ ruleType: { ...ruleType, alerts: undefined } })
    );

    // @ts-expect-error private variable
    expect(scheduler.actions).toHaveLength(0);
    expect(logger.error).toHaveBeenCalledTimes(2);
    expect(logger.error).toHaveBeenNthCalledWith(
      1,
      `Skipping action \"2\" for rule \"1\" because the rule type \"Test\" does not support alert-as-data.`
    );
    expect(logger.error).toHaveBeenNthCalledWith(
      2,
      `Skipping action \"3\" for rule \"1\" because the rule type \"Test\" does not support alert-as-data.`
    );
  });

  describe('generateExecutables', () => {
    const newAlert1 = generateAlert({ id: 1 });
    const newAlert2 = generateAlert({ id: 2 });
    const alerts = { ...newAlert1, ...newAlert2 };

    const summaryActionWithAlertFilter: RuleAction = {
      id: '2',
      group: 'default',
      actionTypeId: 'test',
      frequency: {
        summary: true,
        notifyWhen: 'onActiveAlert',
        throttle: null,
      },
      params: {
        foo: true,
        contextVal: 'My {{context.value}} goes here',
        stateVal: 'My {{state.value}} goes here',
        alertVal:
          'My {{rule.id}} {{rule.name}} {{rule.spaceId}} {{rule.tags}} {{alert.id}} goes here',
      },
      alertsFilter: { query: { kql: 'kibana.alert.rule.name:foo', dsl: '{}', filters: [] } },
      uuid: '222-222',
    };

    const summaryActionWithThrottle: RuleAction = {
      id: '2',
      group: 'default',
      actionTypeId: 'test',
      frequency: {
        summary: true,
        notifyWhen: 'onThrottleInterval',
        throttle: '1d',
      },
      params: {
        foo: true,
        contextVal: 'My {{context.value}} goes here',
        stateVal: 'My {{state.value}} goes here',
        alertVal:
          'My {{rule.id}} {{rule.name}} {{rule.spaceId}} {{rule.tags}} {{alert.id}} goes here',
      },
      uuid: '222-222',
    };

    test('should generate executable for summary action when summary action is per rule run', async () => {
      alertsClient.getProcessedAlerts.mockReturnValue(alerts);
      const summarizedAlerts = {
        new: { count: 2, data: [mockAAD, mockAAD] },
        ongoing: { count: 0, data: [] },
        recovered: { count: 0, data: [] },
      };
      alertsClient.getSummarizedAlerts.mockResolvedValue(summarizedAlerts);

      const scheduler = new SummaryActionScheduler(getSchedulerContext());
      const executables = await scheduler.generateExecutables({
        alerts,
        throttledSummaryActions: {},
      });

      expect(alertsClient.getSummarizedAlerts).toHaveBeenCalledTimes(2);
      expect(alertsClient.getSummarizedAlerts).toHaveBeenNthCalledWith(1, {
        excludedAlertInstanceIds: [],
        executionUuid: defaultSchedulerContext.executionId,
        ruleId: '1',
        spaceId: 'test1',
      });
      expect(alertsClient.getSummarizedAlerts).toHaveBeenNthCalledWith(2, {
        excludedAlertInstanceIds: [],
        executionUuid: defaultSchedulerContext.executionId,
        ruleId: '1',
        spaceId: 'test1',
      });
      expect(logger.debug).not.toHaveBeenCalled();

      expect(executables).toHaveLength(2);

      const finalSummary = { ...summarizedAlerts, all: { count: 2, data: [mockAAD, mockAAD] } };
      expect(executables).toEqual([
        { action: rule.actions[1], summarizedAlerts: finalSummary },
        { action: rule.actions[2], summarizedAlerts: finalSummary },
      ]);
    });

    test('should generate executable for summary action when summary action has alertsFilter', async () => {
      alertsClient.getProcessedAlerts.mockReturnValue(alerts);
      const summarizedAlerts = {
        new: { count: 2, data: [mockAAD, mockAAD] },
        ongoing: { count: 0, data: [] },
        recovered: { count: 0, data: [] },
      };
      alertsClient.getSummarizedAlerts.mockResolvedValue(summarizedAlerts);

      const scheduler = new SummaryActionScheduler({
        ...getSchedulerContext(),
        rule: { ...rule, actions: [summaryActionWithAlertFilter] },
      });

      const executables = await scheduler.generateExecutables({
        alerts,
        throttledSummaryActions: {},
      });

      expect(alertsClient.getSummarizedAlerts).toHaveBeenCalledTimes(1);
      expect(alertsClient.getSummarizedAlerts).toHaveBeenCalledWith({
        excludedAlertInstanceIds: [],
        executionUuid: defaultSchedulerContext.executionId,
        ruleId: '1',
        spaceId: 'test1',
        alertsFilter: { query: { kql: 'kibana.alert.rule.name:foo', dsl: '{}', filters: [] } },
      });
      expect(logger.debug).not.toHaveBeenCalled();

      expect(executables).toHaveLength(1);

      const finalSummary = { ...summarizedAlerts, all: { count: 2, data: [mockAAD, mockAAD] } };
      expect(executables).toEqual([
        { action: summaryActionWithAlertFilter, summarizedAlerts: finalSummary },
      ]);
    });

    test('should generate executable for summary action when summary action is throttled with no throttle history', async () => {
      alertsClient.getProcessedAlerts.mockReturnValue(alerts);
      const summarizedAlerts = {
        new: { count: 2, data: [mockAAD, mockAAD] },
        ongoing: { count: 0, data: [] },
        recovered: { count: 0, data: [] },
      };
      alertsClient.getSummarizedAlerts.mockResolvedValue(summarizedAlerts);

      const scheduler = new SummaryActionScheduler({
        ...getSchedulerContext(),
        rule: { ...rule, actions: [summaryActionWithThrottle] },
      });

      const executables = await scheduler.generateExecutables({
        alerts,
        throttledSummaryActions: {},
      });

      expect(alertsClient.getSummarizedAlerts).toHaveBeenCalledTimes(1);
      expect(alertsClient.getSummarizedAlerts).toHaveBeenCalledWith({
        excludedAlertInstanceIds: [],
        ruleId: '1',
        spaceId: 'test1',
        start: new Date('1969-12-31T00:00:00.000Z'),
        end: new Date(),
      });
      expect(logger.debug).not.toHaveBeenCalled();

      expect(executables).toHaveLength(1);

      const finalSummary = { ...summarizedAlerts, all: { count: 2, data: [mockAAD, mockAAD] } };
      expect(executables).toEqual([
        { action: summaryActionWithThrottle, summarizedAlerts: finalSummary },
      ]);
    });

    test('should skip generating executable for summary action when summary action is throttled', async () => {
      const scheduler = new SummaryActionScheduler({
        ...getSchedulerContext(),
        rule: { ...rule, actions: [summaryActionWithThrottle] },
      });

      const executables = await scheduler.generateExecutables({
        alerts,
        throttledSummaryActions: {
          '222-222': { date: '1969-12-31T13:00:00.000Z' },
        },
      });

      expect(alertsClient.getSummarizedAlerts).not.toHaveBeenCalled();
      expect(logger.debug).toHaveBeenCalledWith(
        `skipping scheduling the action 'test:2', summary action is still being throttled`
      );

      expect(executables).toHaveLength(0);
    });

    test('should remove new alerts from summary if suppressed by maintenance window', async () => {
      const newAlertWithMaintenanceWindow = generateAlert({
        id: 1,
        maintenanceWindowIds: ['mw-1'],
      });
      const alertsWithMaintenanceWindow = { ...newAlertWithMaintenanceWindow, ...newAlert2 };
      alertsClient.getProcessedAlerts.mockReturnValue(alertsWithMaintenanceWindow);
      const newAADAlerts = [
        { ...mockAAD, [ALERT_UUID]: newAlertWithMaintenanceWindow[1].getUuid() },
        mockAAD,
      ];
      const summarizedAlerts = {
        new: { count: 2, data: newAADAlerts },
        ongoing: { count: 0, data: [] },
        recovered: { count: 0, data: [] },
      };
      alertsClient.getSummarizedAlerts.mockResolvedValue(summarizedAlerts);
      const scheduler = new SummaryActionScheduler(getSchedulerContext());

      const executables = await scheduler.generateExecutables({
        alerts,
        throttledSummaryActions: {},
      });

      expect(alertsClient.getSummarizedAlerts).toHaveBeenCalledTimes(2);
      expect(alertsClient.getSummarizedAlerts).toHaveBeenNthCalledWith(1, {
        excludedAlertInstanceIds: [],
        executionUuid: defaultSchedulerContext.executionId,
        ruleId: '1',
        spaceId: 'test1',
      });
      expect(alertsClient.getSummarizedAlerts).toHaveBeenNthCalledWith(2, {
        excludedAlertInstanceIds: [],
        executionUuid: defaultSchedulerContext.executionId,
        ruleId: '1',
        spaceId: 'test1',
      });
      expect(logger.debug).toHaveBeenCalledTimes(2);
      expect(logger.debug).toHaveBeenNthCalledWith(
        1,
        `(1) alert has been filtered out for: test:222-222`
      );
      expect(logger.debug).toHaveBeenNthCalledWith(
        2,
        `(1) alert has been filtered out for: test:333-333`
      );

      expect(executables).toHaveLength(2);

      const finalSummary = {
        all: { count: 1, data: [newAADAlerts[1]] },
        new: { count: 1, data: [newAADAlerts[1]] },
        ongoing: { count: 0, data: [] },
        recovered: { count: 0, data: [] },
      };
      expect(executables).toEqual([
        { action: rule.actions[1], summarizedAlerts: finalSummary },
        { action: rule.actions[2], summarizedAlerts: finalSummary },
      ]);
    });

    test('should generate executable for summary action and log when alerts have been filtered out by action condition', async () => {
      alertsClient.getProcessedAlerts.mockReturnValue(alerts);
      const summarizedAlerts = {
        new: { count: 1, data: [mockAAD] },
        ongoing: { count: 0, data: [] },
        recovered: { count: 0, data: [] },
      };
      alertsClient.getSummarizedAlerts.mockResolvedValue(summarizedAlerts);

      const scheduler = new SummaryActionScheduler({
        ...getSchedulerContext(),
        rule: { ...rule, actions: [summaryActionWithAlertFilter] },
      });

      const executables = await scheduler.generateExecutables({
        alerts,
        throttledSummaryActions: {},
      });

      expect(alertsClient.getSummarizedAlerts).toHaveBeenCalledTimes(1);
      expect(alertsClient.getSummarizedAlerts).toHaveBeenCalledWith({
        excludedAlertInstanceIds: [],
        executionUuid: defaultSchedulerContext.executionId,
        ruleId: '1',
        spaceId: 'test1',
        alertsFilter: { query: { kql: 'kibana.alert.rule.name:foo', dsl: '{}', filters: [] } },
      });
      expect(logger.debug).toHaveBeenCalledTimes(1);
      expect(logger.debug).toHaveBeenCalledWith(
        `(1) alert has been filtered out for: test:222-222`
      );

      expect(executables).toHaveLength(1);

      const finalSummary = { ...summarizedAlerts, all: { count: 1, data: [mockAAD] } };
      expect(executables).toEqual([
        { action: summaryActionWithAlertFilter, summarizedAlerts: finalSummary },
      ]);
    });

    test('should skip generating executable for summary action when no alerts found', async () => {
      alertsClient.getProcessedAlerts.mockReturnValue(alerts);
      const summarizedAlerts = {
        new: { count: 0, data: [] },
        ongoing: { count: 0, data: [] },
        recovered: { count: 0, data: [] },
      };
      alertsClient.getSummarizedAlerts.mockResolvedValue(summarizedAlerts);

      const scheduler = new SummaryActionScheduler({
        ...getSchedulerContext(),
        rule: { ...rule, actions: [summaryActionWithThrottle] },
      });

      const executables = await scheduler.generateExecutables({
        alerts,
        throttledSummaryActions: {},
      });

      expect(alertsClient.getSummarizedAlerts).toHaveBeenCalledTimes(1);
      expect(alertsClient.getSummarizedAlerts).toHaveBeenCalledWith({
        excludedAlertInstanceIds: [],
        ruleId: '1',
        spaceId: 'test1',
        start: new Date('1969-12-31T00:00:00.000Z'),
        end: new Date(),
      });
      expect(logger.debug).not.toHaveBeenCalled();

      expect(executables).toHaveLength(0);
    });

    test('should throw framework error if getSummarizedAlerts throws error', async () => {
      alertsClient.getProcessedAlerts.mockReturnValue(alerts);
      alertsClient.getSummarizedAlerts.mockImplementation(() => {
        throw new Error('no alerts for you');
      });

      const scheduler = new SummaryActionScheduler(getSchedulerContext());

      try {
        await scheduler.generateExecutables({
          alerts,
          throttledSummaryActions: {},
        });
      } catch (err) {
        expect(err.message).toEqual(`no alerts for you`);
        expect(getErrorSource(err)).toBe(TaskErrorSource.FRAMEWORK);
      }
    });
  });
});
