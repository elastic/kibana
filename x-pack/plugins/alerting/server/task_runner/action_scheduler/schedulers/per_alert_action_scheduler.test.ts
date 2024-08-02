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
import { PerAlertActionScheduler } from './per_alert_action_scheduler';
import { getRule, getRuleType, getDefaultSchedulerContext, generateAlert } from '../test_fixtures';
import { SanitizedRuleAction } from '@kbn/alerting-types';
import { ALERT_UUID } from '@kbn/rule-data-utils';

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
      frequency: { summary: false, notifyWhen: 'onActiveAlert', throttle: null },
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
      frequency: { summary: true, notifyWhen: 'onActiveAlert' },
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

describe('Per-Alert Action Scheduler', () => {
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

  test('should initialize with only per-alert actions', () => {
    const scheduler = new PerAlertActionScheduler(getSchedulerContext());

    // @ts-expect-error private variable
    expect(scheduler.actions).toHaveLength(2);
    // @ts-expect-error private variable
    expect(scheduler.actions).toEqual([rule.actions[0], rule.actions[1]]);
    expect(logger.error).not.toHaveBeenCalled();
  });

  test('should not initialize action and log if rule type does not support summarized alerts and action has alertsFilter', () => {
    const actions = [
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
        frequency: { summary: false, notifyWhen: 'onActiveAlert', throttle: null },
        alertsFilter: {
          query: { kql: 'kibana.alert.rule.name:foo', dsl: '{}', filters: [] },
        },
        params: {
          foo: true,
          contextVal: 'My {{context.value}} goes here',
          stateVal: 'My {{state.value}} goes here',
          alertVal:
            'My {{rule.id}} {{rule.name}} {{rule.spaceId}} {{rule.tags}} {{alert.id}} goes here',
        },
        uuid: '222-222',
      },
    ];
    const scheduler = new PerAlertActionScheduler(
      getSchedulerContext({
        rule: {
          ...rule,
          actions,
        },
        ruleType: { ...ruleType, alerts: undefined },
      })
    );

    // @ts-expect-error private variable
    expect(scheduler.actions).toHaveLength(1);
    // @ts-expect-error private variable
    expect(scheduler.actions).toEqual([actions[0]]);
    expect(logger.error).toHaveBeenCalledTimes(1);
    expect(logger.error).toHaveBeenCalledWith(
      `Skipping action \"2\" for rule \"1\" because the rule type \"Test\" does not support alert-as-data.`
    );
  });

  describe('generateExecutables', () => {
    const newAlert1 = generateAlert({ id: 1 });
    const newAlert2 = generateAlert({ id: 2 });
    const alerts = { ...newAlert1, ...newAlert2 };

    test('should generate executable for each alert and each action', async () => {
      const scheduler = new PerAlertActionScheduler(getSchedulerContext());
      const executables = await scheduler.generateExecutables({
        alerts,
        throttledSummaryActions: {},
      });

      expect(alertsClient.getSummarizedAlerts).not.toHaveBeenCalled();
      expect(logger.debug).not.toHaveBeenCalled();

      expect(executables).toHaveLength(4);

      expect(executables).toEqual([
        { action: rule.actions[0], alert: alerts['1'] },
        { action: rule.actions[0], alert: alerts['2'] },
        { action: rule.actions[1], alert: alerts['1'] },
        { action: rule.actions[1], alert: alerts['2'] },
      ]);
    });

    test('should skip generating executable when alert has maintenance window', async () => {
      const scheduler = new PerAlertActionScheduler(getSchedulerContext());
      const newAlertWithMaintenanceWindow = generateAlert({
        id: 1,
        maintenanceWindowIds: ['mw-1'],
      });
      const alertsWithMaintenanceWindow = { ...newAlertWithMaintenanceWindow, ...newAlert2 };
      const executables = await scheduler.generateExecutables({
        alerts: alertsWithMaintenanceWindow,
        throttledSummaryActions: {},
      });

      expect(alertsClient.getSummarizedAlerts).not.toHaveBeenCalled();
      expect(logger.debug).toHaveBeenCalledTimes(2);
      expect(logger.debug).toHaveBeenNthCalledWith(
        1,
        `no scheduling of summary actions \"1\" for rule \"1\": has active maintenance windows mw-1.`
      );
      expect(logger.debug).toHaveBeenNthCalledWith(
        2,
        `no scheduling of summary actions \"2\" for rule \"1\": has active maintenance windows mw-1.`
      );

      expect(executables).toHaveLength(2);

      expect(executables).toEqual([
        { action: rule.actions[0], alert: alerts['2'] },
        { action: rule.actions[1], alert: alerts['2'] },
      ]);
    });

    test('should skip generating executable when alert has invalid action group', async () => {
      const scheduler = new PerAlertActionScheduler(getSchedulerContext());
      const newAlertInvalidActionGroup = generateAlert({
        id: 1,
        // @ts-expect-error
        group: 'invalid',
      });
      const alertsWithInvalidActionGroup = { ...newAlertInvalidActionGroup, ...newAlert2 };
      const executables = await scheduler.generateExecutables({
        alerts: alertsWithInvalidActionGroup,
        throttledSummaryActions: {},
      });

      expect(alertsClient.getSummarizedAlerts).not.toHaveBeenCalled();
      expect(logger.error).toHaveBeenCalledTimes(2);
      expect(logger.error).toHaveBeenNthCalledWith(
        1,
        `Invalid action group \"invalid\" for rule \"test\".`
      );
      expect(logger.error).toHaveBeenNthCalledWith(
        2,
        `Invalid action group \"invalid\" for rule \"test\".`
      );

      expect(executables).toHaveLength(2);

      expect(executables).toEqual([
        { action: rule.actions[0], alert: alerts['2'] },
        { action: rule.actions[1], alert: alerts['2'] },
      ]);
    });

    test('should skip generating executable when alert has pending recovered count greater than 0 and notifyWhen is onActiveAlert', async () => {
      const scheduler = new PerAlertActionScheduler(getSchedulerContext());
      const newAlertWithPendingRecoveredCount = generateAlert({
        id: 1,
        pendingRecoveredCount: 3,
      });
      const alertsWithPendingRecoveredCount = {
        ...newAlertWithPendingRecoveredCount,
        ...newAlert2,
      };
      const executables = await scheduler.generateExecutables({
        alerts: alertsWithPendingRecoveredCount,
        throttledSummaryActions: {},
      });

      expect(alertsClient.getSummarizedAlerts).not.toHaveBeenCalled();
      expect(executables).toHaveLength(2);

      expect(executables).toEqual([
        { action: rule.actions[0], alert: alerts['2'] },
        { action: rule.actions[1], alert: alerts['2'] },
      ]);
    });

    test('should skip generating executable when alert has pending recovered count greater than 0 and notifyWhen is onThrottleInterval', async () => {
      const onThrottleIntervalAction: SanitizedRuleAction = {
        id: '2',
        group: 'default',
        actionTypeId: 'test',
        frequency: { summary: false, notifyWhen: 'onThrottleInterval', throttle: '1h' },
        params: {
          foo: true,
          contextVal: 'My {{context.value}} goes here',
          stateVal: 'My {{state.value}} goes here',
          alertVal:
            'My {{rule.id}} {{rule.name}} {{rule.spaceId}} {{rule.tags}} {{alert.id}} goes here',
        },
        uuid: '222-222',
      };
      const scheduler = new PerAlertActionScheduler({
        ...getSchedulerContext(),
        rule: { ...rule, actions: [rule.actions[0], onThrottleIntervalAction] },
      });
      const newAlertWithPendingRecoveredCount = generateAlert({
        id: 1,
        pendingRecoveredCount: 3,
      });
      const alertsWithPendingRecoveredCount = {
        ...newAlertWithPendingRecoveredCount,
        ...newAlert2,
      };
      const executables = await scheduler.generateExecutables({
        alerts: alertsWithPendingRecoveredCount,
        throttledSummaryActions: {},
      });

      expect(alertsClient.getSummarizedAlerts).not.toHaveBeenCalled();
      expect(executables).toHaveLength(2);

      expect(executables).toEqual([
        { action: rule.actions[0], alert: alerts['2'] },
        { action: onThrottleIntervalAction, alert: alerts['2'] },
      ]);
    });

    test('should skip generating executable when alert is muted', async () => {
      const scheduler = new PerAlertActionScheduler({
        ...getSchedulerContext(),
        rule: { ...rule, mutedInstanceIds: ['2'] },
      });
      const executables = await scheduler.generateExecutables({
        alerts,
        throttledSummaryActions: {},
      });

      expect(alertsClient.getSummarizedAlerts).not.toHaveBeenCalled();
      expect(logger.debug).toHaveBeenCalledTimes(1);
      expect(logger.debug).toHaveBeenNthCalledWith(
        1,
        `skipping scheduling of actions for '2' in rule rule-label: rule is muted`
      );
      expect(executables).toHaveLength(2);

      // @ts-expect-error private variable
      expect(scheduler.skippedAlerts).toEqual({ '2': { reason: 'muted' } });

      expect(executables).toEqual([
        { action: rule.actions[0], alert: alerts['1'] },
        { action: rule.actions[1], alert: alerts['1'] },
      ]);
    });

    test('should skip generating executable when alert action group has not changed and notifyWhen is onActionGroupChange', async () => {
      const onActionGroupChangeAction: SanitizedRuleAction = {
        id: '2',
        group: 'default',
        actionTypeId: 'test',
        frequency: { summary: false, notifyWhen: 'onActionGroupChange', throttle: null },
        params: {
          foo: true,
          contextVal: 'My {{context.value}} goes here',
          stateVal: 'My {{state.value}} goes here',
          alertVal:
            'My {{rule.id}} {{rule.name}} {{rule.spaceId}} {{rule.tags}} {{alert.id}} goes here',
        },
        uuid: '222-222',
      };

      const activeAlert1 = generateAlert({
        id: 1,
        group: 'default',
        lastScheduledActionsGroup: 'other-group',
      });
      const activeAlert2 = generateAlert({
        id: 2,
        group: 'default',
        lastScheduledActionsGroup: 'default',
      });
      const alertsWithOngoingAlert = { ...activeAlert1, ...activeAlert2 };

      const scheduler = new PerAlertActionScheduler({
        ...getSchedulerContext(),
        rule: { ...rule, actions: [rule.actions[0], onActionGroupChangeAction] },
      });

      const executables = await scheduler.generateExecutables({
        alerts: alertsWithOngoingAlert,
        throttledSummaryActions: {},
      });

      expect(alertsClient.getSummarizedAlerts).not.toHaveBeenCalled();
      expect(logger.debug).toHaveBeenCalledTimes(1);
      expect(logger.debug).toHaveBeenNthCalledWith(
        1,
        `skipping scheduling of actions for '2' in rule rule-label: alert is active but action group has not changed`
      );
      expect(executables).toHaveLength(3);

      // @ts-expect-error private variable
      expect(scheduler.skippedAlerts).toEqual({ '2': { reason: 'actionGroupHasNotChanged' } });

      expect(executables).toEqual([
        { action: rule.actions[0], alert: alertsWithOngoingAlert['1'] },
        { action: rule.actions[0], alert: alertsWithOngoingAlert['2'] },
        { action: onActionGroupChangeAction, alert: alertsWithOngoingAlert['1'] },
      ]);
    });

    test('should skip generating executable when throttle interval has not passed and notifyWhen is onThrottleInterval', async () => {
      const onThrottleIntervalAction: SanitizedRuleAction = {
        id: '2',
        group: 'default',
        actionTypeId: 'test',
        frequency: { summary: false, notifyWhen: 'onThrottleInterval', throttle: '1h' },
        params: {
          foo: true,
          contextVal: 'My {{context.value}} goes here',
          stateVal: 'My {{state.value}} goes here',
          alertVal:
            'My {{rule.id}} {{rule.name}} {{rule.spaceId}} {{rule.tags}} {{alert.id}} goes here',
        },
        uuid: '222-222',
      };

      const activeAlert2 = generateAlert({
        id: 2,
        lastScheduledActionsGroup: 'default',
        throttledActions: { '222-222': { date: '1969-12-31T23:10:00.000Z' } },
      });
      const alertsWithOngoingAlert = { ...newAlert1, ...activeAlert2 };

      const scheduler = new PerAlertActionScheduler({
        ...getSchedulerContext(),
        rule: { ...rule, actions: [rule.actions[0], onThrottleIntervalAction] },
      });

      const executables = await scheduler.generateExecutables({
        alerts: alertsWithOngoingAlert,
        throttledSummaryActions: {},
      });

      expect(alertsClient.getSummarizedAlerts).not.toHaveBeenCalled();
      expect(logger.debug).toHaveBeenCalledTimes(1);
      expect(logger.debug).toHaveBeenNthCalledWith(
        1,
        `skipping scheduling of actions for '2' in rule rule-label: rule is throttled`
      );
      expect(executables).toHaveLength(3);

      // @ts-expect-error private variable
      expect(scheduler.skippedAlerts).toEqual({ '2': { reason: 'throttled' } });

      expect(executables).toEqual([
        { action: rule.actions[0], alert: alertsWithOngoingAlert['1'] },
        { action: rule.actions[0], alert: alertsWithOngoingAlert['2'] },
        { action: onThrottleIntervalAction, alert: alertsWithOngoingAlert['1'] },
      ]);
    });

    test('should not skip generating executable when throttle interval has passed and notifyWhen is onThrottleInterval', async () => {
      const onThrottleIntervalAction: SanitizedRuleAction = {
        id: '2',
        group: 'default',
        actionTypeId: 'test',
        frequency: { summary: false, notifyWhen: 'onThrottleInterval', throttle: '1h' },
        params: {
          foo: true,
          contextVal: 'My {{context.value}} goes here',
          stateVal: 'My {{state.value}} goes here',
          alertVal:
            'My {{rule.id}} {{rule.name}} {{rule.spaceId}} {{rule.tags}} {{alert.id}} goes here',
        },
        uuid: '222-222',
      };

      const activeAlert2 = generateAlert({
        id: 2,
        lastScheduledActionsGroup: 'default',
        throttledActions: { '222-222': { date: '1969-12-31T22:10:00.000Z' } },
      });
      const alertsWithOngoingAlert = { ...newAlert1, ...activeAlert2 };

      const scheduler = new PerAlertActionScheduler({
        ...getSchedulerContext(),
        rule: { ...rule, actions: [rule.actions[0], onThrottleIntervalAction] },
      });

      const executables = await scheduler.generateExecutables({
        alerts: alertsWithOngoingAlert,
        throttledSummaryActions: {},
      });

      expect(alertsClient.getSummarizedAlerts).not.toHaveBeenCalled();
      expect(logger.debug).not.toHaveBeenCalled();
      expect(executables).toHaveLength(4);

      // @ts-expect-error private variable
      expect(scheduler.skippedAlerts).toEqual({});

      expect(executables).toEqual([
        { action: rule.actions[0], alert: alertsWithOngoingAlert['1'] },
        { action: rule.actions[0], alert: alertsWithOngoingAlert['2'] },
        { action: onThrottleIntervalAction, alert: alertsWithOngoingAlert['1'] },
        { action: onThrottleIntervalAction, alert: alertsWithOngoingAlert['2'] },
      ]);
    });

    test('should query for summarized alerts if useAlertDataForTemplate is true', async () => {
      alertsClient.getProcessedAlerts.mockReturnValue(alerts);
      const summarizedAlerts = {
        new: {
          count: 1,
          data: [
            { ...mockAAD, [ALERT_UUID]: alerts[1].getUuid() },
            { ...mockAAD, [ALERT_UUID]: alerts[2].getUuid() },
          ],
        },
        ongoing: { count: 0, data: [] },
        recovered: { count: 0, data: [] },
      };
      alertsClient.getSummarizedAlerts.mockResolvedValue(summarizedAlerts);
      const actionWithUseAlertDataForTemplate: SanitizedRuleAction = {
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
        useAlertDataForTemplate: true,
      };
      const scheduler = new PerAlertActionScheduler({
        ...getSchedulerContext(),
        rule: { ...rule, actions: [rule.actions[0], actionWithUseAlertDataForTemplate] },
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
      });

      expect(executables).toHaveLength(4);

      expect(executables).toEqual([
        { action: rule.actions[0], alert: alerts['1'] },
        { action: rule.actions[0], alert: alerts['2'] },
        { action: actionWithUseAlertDataForTemplate, alert: alerts['1'] },
        { action: actionWithUseAlertDataForTemplate, alert: alerts['2'] },
      ]);
    });

    test('should query for summarized alerts if useAlertDataForTemplate is true and action has throttle interval', async () => {
      alertsClient.getProcessedAlerts.mockReturnValue(alerts);
      const summarizedAlerts = {
        new: {
          count: 1,
          data: [
            { ...mockAAD, [ALERT_UUID]: alerts[1].getUuid() },
            { ...mockAAD, [ALERT_UUID]: alerts[2].getUuid() },
          ],
        },
        ongoing: { count: 0, data: [] },
        recovered: { count: 0, data: [] },
      };
      alertsClient.getSummarizedAlerts.mockResolvedValue(summarizedAlerts);
      const actionWithUseAlertDataForTemplate: SanitizedRuleAction = {
        id: '1',
        group: 'default',
        actionTypeId: 'test',
        frequency: { summary: false, notifyWhen: 'onThrottleInterval', throttle: '1h' },
        params: {
          foo: true,
          contextVal: 'My {{context.value}} goes here',
          stateVal: 'My {{state.value}} goes here',
          alertVal:
            'My {{rule.id}} {{rule.name}} {{rule.spaceId}} {{rule.tags}} {{alert.id}} goes here',
        },
        uuid: '111-111',
        useAlertDataForTemplate: true,
      };
      const scheduler = new PerAlertActionScheduler({
        ...getSchedulerContext(),
        rule: { ...rule, actions: [rule.actions[0], actionWithUseAlertDataForTemplate] },
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
        start: new Date('1969-12-31T23:00:00.000Z'),
        end: new Date('1970-01-01T00:00:00.000Z'),
      });

      expect(executables).toHaveLength(4);

      expect(executables).toEqual([
        { action: rule.actions[0], alert: alerts['1'] },
        { action: rule.actions[0], alert: alerts['2'] },
        { action: actionWithUseAlertDataForTemplate, alert: alerts['1'] },
        { action: actionWithUseAlertDataForTemplate, alert: alerts['2'] },
      ]);
    });

    test('should query for summarized alerts if action has alertsFilter', async () => {
      alertsClient.getProcessedAlerts.mockReturnValue(alerts);
      const summarizedAlerts = {
        new: {
          count: 1,
          data: [
            { ...mockAAD, [ALERT_UUID]: alerts[1].getUuid() },
            { ...mockAAD, [ALERT_UUID]: alerts[2].getUuid() },
          ],
        },
        ongoing: { count: 0, data: [] },
        recovered: { count: 0, data: [] },
      };
      alertsClient.getSummarizedAlerts.mockResolvedValue(summarizedAlerts);
      const actionWithAlertsFilter: SanitizedRuleAction = {
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
        alertsFilter: { query: { kql: 'kibana.alert.rule.name:foo', filters: [] } },
      };
      const scheduler = new PerAlertActionScheduler({
        ...getSchedulerContext(),
        rule: { ...rule, actions: [rule.actions[0], actionWithAlertsFilter] },
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
        alertsFilter: { query: { kql: 'kibana.alert.rule.name:foo', filters: [] } },
      });

      expect(executables).toHaveLength(4);

      expect(executables).toEqual([
        { action: rule.actions[0], alert: alerts['1'] },
        { action: rule.actions[0], alert: alerts['2'] },
        { action: actionWithAlertsFilter, alert: alerts['1'] },
        { action: actionWithAlertsFilter, alert: alerts['2'] },
      ]);
    });

    test('should query for summarized alerts if action has alertsFilter and action has throttle interval', async () => {
      alertsClient.getProcessedAlerts.mockReturnValue(alerts);
      const summarizedAlerts = {
        new: {
          count: 1,
          data: [
            { ...mockAAD, [ALERT_UUID]: alerts[1].getUuid() },
            { ...mockAAD, [ALERT_UUID]: alerts[2].getUuid() },
          ],
        },
        ongoing: { count: 0, data: [] },
        recovered: { count: 0, data: [] },
      };
      alertsClient.getSummarizedAlerts.mockResolvedValue(summarizedAlerts);
      const actionWithAlertsFilter: SanitizedRuleAction = {
        id: '1',
        group: 'default',
        actionTypeId: 'test',
        frequency: { summary: false, notifyWhen: 'onThrottleInterval', throttle: '6h' },
        params: {
          foo: true,
          contextVal: 'My {{context.value}} goes here',
          stateVal: 'My {{state.value}} goes here',
          alertVal:
            'My {{rule.id}} {{rule.name}} {{rule.spaceId}} {{rule.tags}} {{alert.id}} goes here',
        },
        uuid: '111-111',
        alertsFilter: { query: { kql: 'kibana.alert.rule.name:foo', filters: [] } },
      };
      const scheduler = new PerAlertActionScheduler({
        ...getSchedulerContext(),
        rule: { ...rule, actions: [rule.actions[0], actionWithAlertsFilter] },
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
        alertsFilter: { query: { kql: 'kibana.alert.rule.name:foo', filters: [] } },
        start: new Date('1969-12-31T18:00:00.000Z'),
        end: new Date('1970-01-01T00:00:00.000Z'),
      });

      expect(executables).toHaveLength(4);

      expect(executables).toEqual([
        { action: rule.actions[0], alert: alerts['1'] },
        { action: rule.actions[0], alert: alerts['2'] },
        { action: actionWithAlertsFilter, alert: alerts['1'] },
        { action: actionWithAlertsFilter, alert: alerts['2'] },
      ]);
    });

    test('should skip generating executable if alert does not match any alerts in summarized alerts', async () => {
      alertsClient.getProcessedAlerts.mockReturnValue(alerts);
      const summarizedAlerts = {
        new: {
          count: 1,
          data: [
            { ...mockAAD, [ALERT_UUID]: alerts[1].getUuid() },
            { ...mockAAD, [ALERT_UUID]: 'uuid-not-a-match' },
          ],
        },
        ongoing: { count: 0, data: [] },
        recovered: { count: 0, data: [] },
      };
      alertsClient.getSummarizedAlerts.mockResolvedValue(summarizedAlerts);
      const actionWithAlertsFilter: SanitizedRuleAction = {
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
        alertsFilter: { query: { kql: 'kibana.alert.rule.name:foo', filters: [] } },
      };
      const scheduler = new PerAlertActionScheduler({
        ...getSchedulerContext(),
        rule: { ...rule, actions: [rule.actions[0], actionWithAlertsFilter] },
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
        alertsFilter: { query: { kql: 'kibana.alert.rule.name:foo', filters: [] } },
      });

      expect(executables).toHaveLength(3);

      expect(executables).toEqual([
        { action: rule.actions[0], alert: alerts['1'] },
        { action: rule.actions[0], alert: alerts['2'] },
        { action: actionWithAlertsFilter, alert: alerts['1'] },
      ]);
    });

    test('should set alerts as data', async () => {
      alertsClient.getProcessedAlerts.mockReturnValue(alerts);
      const summarizedAlerts = {
        new: {
          count: 1,
          data: [
            { ...mockAAD, _id: alerts[1].getUuid(), [ALERT_UUID]: alerts[1].getUuid() },
            { ...mockAAD, _id: alerts[2].getUuid(), [ALERT_UUID]: alerts[2].getUuid() },
          ],
        },
        ongoing: { count: 0, data: [] },
        recovered: { count: 0, data: [] },
      };
      alertsClient.getSummarizedAlerts.mockResolvedValue(summarizedAlerts);
      const actionWithAlertsFilter: SanitizedRuleAction = {
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
        alertsFilter: { query: { kql: 'kibana.alert.rule.name:foo', filters: [] } },
      };
      const scheduler = new PerAlertActionScheduler({
        ...getSchedulerContext(),
        rule: { ...rule, actions: [rule.actions[0], actionWithAlertsFilter] },
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
        alertsFilter: { query: { kql: 'kibana.alert.rule.name:foo', filters: [] } },
      });

      expect(executables).toHaveLength(4);

      expect(alerts['1'].getAlertAsData()).not.toBeUndefined();
      expect(alerts['2'].getAlertAsData()).not.toBeUndefined();

      expect(executables).toEqual([
        { action: rule.actions[0], alert: alerts['1'] },
        { action: rule.actions[0], alert: alerts['2'] },
        { action: actionWithAlertsFilter, alert: alerts['1'] },
        { action: actionWithAlertsFilter, alert: alerts['2'] },
      ]);
    });
  });
});
