/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AlertExecutionStore } from './alert_execution_store';
import { ActionsCompletion } from '../task_runner/types';

describe('AlertExecutionStore', () => {
  const alertExecutionStore = new AlertExecutionStore();
  const testConnectorId = 'test-connector-id';

  test('returns the default values if there is no change', () => {
    expect(alertExecutionStore.getNumberOfTriggeredActions()).toBe(0);
    expect(alertExecutionStore.getNumberOfScheduledActions()).toBe(0);
    expect(alertExecutionStore.getNumberOfTriggeredActionsByConnectorType('any')).toBe(undefined);
    expect(alertExecutionStore.getTriggeredActionsStatus()).toBe(ActionsCompletion.COMPLETE);
  });

  test('sets and returns numberOfTriggeredActions', () => {
    alertExecutionStore.setNumberOfTriggeredActions(5);
    expect(alertExecutionStore.getNumberOfTriggeredActions()).toBe(5);
  });

  test('sets and returns numberOfScheduledActions', () => {
    alertExecutionStore.setNumberOfScheduledActions(15);
    expect(alertExecutionStore.getNumberOfScheduledActions()).toBe(15);
  });

  test('sets and returns numberOfTriggeredActionsByConnectorType', () => {
    alertExecutionStore.setNumberOfTriggeredActionsByConnectorType({
      actionTypeId: testConnectorId,
      numberOfTriggeredActionsByConnectorType: 101,
    });
    expect(alertExecutionStore.getNumberOfTriggeredActionsByConnectorType(testConnectorId)).toBe(
      101
    );
  });

  test('sets and returns triggeredActionsStatus', () => {
    alertExecutionStore.setTriggeredActionsStatus(ActionsCompletion.PARTIAL);
    expect(alertExecutionStore.getTriggeredActionsStatus()).toBe(ActionsCompletion.PARTIAL);
  });

  test('increments numberOfTriggeredActions by 1', () => {
    alertExecutionStore.incrementNumberOfTriggeredActions();
    expect(alertExecutionStore.getNumberOfTriggeredActions()).toBe(6);
  });

  test('increments numberOfTriggeredActionsByConnectorType by 1', () => {
    alertExecutionStore.incrementNumberOfTriggeredActionsByConnectorType(testConnectorId);
    expect(alertExecutionStore.getNumberOfTriggeredActionsByConnectorType(testConnectorId)).toBe(
      102
    );
  });

  test('checks if it has reached the executable actions limit', () => {
    expect(alertExecutionStore.hasReachedTheExecutableActionsLimit({ default: { max: 10 } })).toBe(
      false
    );

    expect(alertExecutionStore.hasReachedTheExecutableActionsLimit({ default: { max: 5 } })).toBe(
      true
    );
  });

  test('checks if it has reached the executable actions limit by connector type', () => {
    expect(
      alertExecutionStore.hasReachedTheExecutableActionsLimitByConnectorType({
        actionsConfigMap: {
          default: { max: 100 },
          [testConnectorId]: {
            max: 100,
          },
        },
        actionTypeId: testConnectorId,
      })
    ).toBe(true);

    expect(
      alertExecutionStore.hasReachedTheExecutableActionsLimitByConnectorType({
        actionsConfigMap: {
          default: { max: 100 },
          [testConnectorId]: {
            max: 103,
          },
        },
        actionTypeId: testConnectorId,
      })
    ).toBe(false);
  });
});
