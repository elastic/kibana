/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RuleRunMetricsStore } from '../lib/rule_run_metrics_store';
import { RecoveredActionGroup } from '../types';
import { RULE_NAME } from './fixtures';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import { scheduleActionsForAlerts } from './schedule_actions_for_alerts';
import { Alert } from '../alert';
import { AlertInstanceState, AlertInstanceContext, DefaultActionGroupId } from '../../common';

describe('Schedule Actions For Alerts', () => {
  const ruleRunMetricsStore = new RuleRunMetricsStore();
  const executionHandler = jest.fn();
  const recoveryActionGroup = RecoveredActionGroup;
  const mutedAlertIdsSet = new Set('2');
  const logger: ReturnType<typeof loggingSystemMock.createLogger> =
    loggingSystemMock.createLogger();

  beforeEach(() => {
    jest.resetAllMocks();
  });

  test('schedules alerts with executable actions', async () => {
    const alert = new Alert<AlertInstanceState, AlertInstanceContext, DefaultActionGroupId>('1', {
      state: { test: true },
      meta: {
        lastScheduledActions: {
          date: new Date(),
          group: 'default',
        },
      },
    });
    alert.scheduleActions('default');
    const alerts: Array<
      [string, Alert<AlertInstanceState, AlertInstanceContext, DefaultActionGroupId>]
    > = [['1', alert]];
    const recoveredAlerts = {};

    await scheduleActionsForAlerts({
      alertsWithExecutableActions: alerts,
      recoveryActionGroup,
      recoveredAlerts,
      executionHandler,
      mutedAlertIdsSet,
      logger,
      ruleLabel: RULE_NAME,
      ruleRunMetricsStore,
    });

    expect(executionHandler).toBeCalledWith({
      actionGroup: 'default',
      context: {},
      state: { test: true },
      alertId: '1',
      ruleRunMetricsStore,
    });
  });

  test('schedules alerts with recovered actions', async () => {
    const alert = new Alert<AlertInstanceState, AlertInstanceContext, DefaultActionGroupId>('1', {
      state: { test: true },
      meta: {
        lastScheduledActions: {
          date: new Date(),
          group: 'default',
        },
      },
    });
    const alerts: Array<
      [string, Alert<AlertInstanceState, AlertInstanceContext, DefaultActionGroupId>]
    > = [];
    const recoveredAlerts = { '1': alert };

    await scheduleActionsForAlerts({
      alertsWithExecutableActions: alerts,
      recoveryActionGroup,
      recoveredAlerts,
      executionHandler,
      mutedAlertIdsSet,
      logger,
      ruleLabel: RULE_NAME,
      ruleRunMetricsStore,
    });

    expect(executionHandler).toHaveBeenNthCalledWith(1, {
      actionGroup: 'recovered',
      context: {},
      state: {},
      alertId: '1',
      ruleRunMetricsStore,
    });
  });

  test('does not schedule alerts with recovered actions that are muted', async () => {
    const alert = new Alert<AlertInstanceState, AlertInstanceContext, DefaultActionGroupId>('2', {
      state: { test: true },
      meta: {
        lastScheduledActions: {
          date: new Date(),
          group: 'default',
        },
      },
    });
    const alerts: Array<
      [string, Alert<AlertInstanceState, AlertInstanceContext, DefaultActionGroupId>]
    > = [];
    const recoveredAlerts = { '2': alert };

    await scheduleActionsForAlerts({
      alertsWithExecutableActions: alerts,
      recoveryActionGroup,
      recoveredAlerts,
      executionHandler,
      mutedAlertIdsSet,
      logger,
      ruleLabel: RULE_NAME,
      ruleRunMetricsStore,
    });

    expect(executionHandler).not.toBeCalled();
    expect(logger.debug).nthCalledWith(
      1,
      `skipping scheduling of actions for '2' in rule ${RULE_NAME}: instance is muted`
    );
  });
});
