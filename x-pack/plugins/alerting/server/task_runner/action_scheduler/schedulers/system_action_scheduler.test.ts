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
import { getRule, getRuleType, getDefaultSchedulerContext, generateAlert } from '../test_fixtures';
import { SystemActionScheduler } from './system_action_scheduler';
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
  systemActions: [
    {
      id: '1',
      actionTypeId: '.test-system-action',
      params: { myParams: 'test' },
      uui: 'test',
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

describe('System Action Scheduler', () => {
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

  test('should initialize with only system actions', () => {
    const scheduler = new SystemActionScheduler(getSchedulerContext());

    // @ts-expect-error private variable
    expect(scheduler.actions).toHaveLength(1);
    // @ts-expect-error private variable
    expect(scheduler.actions).toEqual(rule.systemActions);
  });

  test('should not initialize any system actions if rule type does not support summarized alerts', () => {
    const scheduler = new SystemActionScheduler(
      getSchedulerContext({ ruleType: { ...ruleType, alerts: undefined } })
    );

    // @ts-expect-error private variable
    expect(scheduler.actions).toHaveLength(0);
  });

  describe('generateExecutables', () => {
    const newAlert1 = generateAlert({ id: 1 });
    const newAlert2 = generateAlert({ id: 2 });
    const alerts = { ...newAlert1, ...newAlert2 };

    test('should generate executable for each system action', async () => {
      alertsClient.getProcessedAlerts.mockReturnValue(alerts);
      const summarizedAlerts = {
        new: { count: 2, data: [mockAAD, mockAAD] },
        ongoing: { count: 0, data: [] },
        recovered: { count: 0, data: [] },
      };
      alertsClient.getSummarizedAlerts.mockResolvedValue(summarizedAlerts);

      const scheduler = new SystemActionScheduler(getSchedulerContext());
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

      expect(executables).toHaveLength(1);

      const finalSummary = { ...summarizedAlerts, all: { count: 2, data: [mockAAD, mockAAD] } };
      expect(executables).toEqual([
        { action: rule.systemActions?.[0], summarizedAlerts: finalSummary },
      ]);
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
      const scheduler = new SystemActionScheduler(getSchedulerContext());

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

      expect(executables).toHaveLength(1);

      const finalSummary = {
        all: { count: 1, data: [newAADAlerts[1]] },
        new: { count: 1, data: [newAADAlerts[1]] },
        ongoing: { count: 0, data: [] },
        recovered: { count: 0, data: [] },
      };
      expect(executables).toEqual([
        { action: rule.systemActions?.[0], summarizedAlerts: finalSummary },
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

      const scheduler = new SystemActionScheduler(getSchedulerContext());

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

      expect(executables).toHaveLength(0);
    });

    test('should throw framework error if getSummarizedAlerts throws error', async () => {
      alertsClient.getProcessedAlerts.mockReturnValue(alerts);
      alertsClient.getSummarizedAlerts.mockImplementation(() => {
        throw new Error('no alerts for you');
      });

      const scheduler = new SystemActionScheduler(getSchedulerContext());

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
