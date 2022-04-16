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

  // Getter Setter
  test('returns the default values if there is no change', () => {
    expect(alertExecutionStore.getTriggeredActionsStatus()).toBe(ActionsCompletion.COMPLETE);
    expect(alertExecutionStore.getNumberOfTriggeredActions()).toBe(0);
    expect(alertExecutionStore.getNumberOfScheduledActions()).toBe(0);
    expect(alertExecutionStore.getStatusByConnectorType('any')).toBe(undefined);
  });

  test('sets and returns numberOfTriggeredActions', () => {
    alertExecutionStore.setNumberOfTriggeredActions(5);
    expect(alertExecutionStore.getNumberOfTriggeredActions()).toBe(5);
  });

  test('sets and returns numberOfScheduledActions', () => {
    alertExecutionStore.setNumberOfScheduledActions(15);
    expect(alertExecutionStore.getNumberOfScheduledActions()).toBe(15);
  });

  test('sets and returns triggeredActionsStatusByConnectorType', () => {
    alertExecutionStore.setTriggeredActionsStatusByConnectorType({
      actionTypeId: testConnectorId,
      status: ActionsCompletion.PARTIAL,
    });
    expect(
      alertExecutionStore.getStatusByConnectorType(testConnectorId).triggeredActionsStatus
    ).toBe(ActionsCompletion.PARTIAL);
    expect(alertExecutionStore.getTriggeredActionsStatus()).toBe(ActionsCompletion.PARTIAL);
  });

  // increment
  test('increments numberOfTriggeredActions by 1', () => {
    alertExecutionStore.incrementNumberOfTriggeredActions();
    expect(alertExecutionStore.getNumberOfTriggeredActions()).toBe(6);
  });

  test('increments incrementNumberOfScheduledActions by x', () => {
    alertExecutionStore.incrementNumberOfScheduledActions(2);
    expect(alertExecutionStore.getNumberOfScheduledActions()).toBe(17);
  });

  test('increments numberOfTriggeredActionsByConnectorType by 1', () => {
    alertExecutionStore.incrementNumberOfTriggeredActionsByConnectorType(testConnectorId);
    expect(
      alertExecutionStore.getStatusByConnectorType(testConnectorId).numberOfTriggeredActions
    ).toBe(1);
  });

  test('increments NumberOfScheduledActionsByConnectorType by 1', () => {
    alertExecutionStore.incrementNumberOfScheduledActionsByConnectorType(testConnectorId);
    expect(
      alertExecutionStore.getStatusByConnectorType(testConnectorId).numberOfScheduledActions
    ).toBe(1);
  });

  // Checker
  test('checks if it has reached the executable actions limit', () => {
    expect(alertExecutionStore.hasReachedTheExecutableActionsLimit({ default: { max: 10 } })).toBe(
      false
    );

    expect(alertExecutionStore.hasReachedTheExecutableActionsLimit({ default: { max: 5 } })).toBe(
      true
    );
  });

  test('checks if it has reached the executable actions limit by connector type', () => {
    alertExecutionStore.incrementNumberOfTriggeredActionsByConnectorType(testConnectorId);
    alertExecutionStore.incrementNumberOfTriggeredActionsByConnectorType(testConnectorId);
    alertExecutionStore.incrementNumberOfTriggeredActionsByConnectorType(testConnectorId);
    alertExecutionStore.incrementNumberOfTriggeredActionsByConnectorType(testConnectorId);
    alertExecutionStore.incrementNumberOfTriggeredActionsByConnectorType(testConnectorId);

    expect(
      alertExecutionStore.hasReachedTheExecutableActionsLimitByConnectorType({
        actionsConfigMap: {
          default: { max: 20 },
          [testConnectorId]: {
            max: 5,
          },
        },
        actionTypeId: testConnectorId,
      })
    ).toBe(true);

    expect(
      alertExecutionStore.hasReachedTheExecutableActionsLimitByConnectorType({
        actionsConfigMap: {
          default: { max: 20 },
          [testConnectorId]: {
            max: 8,
          },
        },
        actionTypeId: testConnectorId,
      })
    ).toBe(false);
  });

  test('checks if a connector type it has already reached the executable actions limit', () => {
    expect(alertExecutionStore.hasConnectorTypeReachedTheLimit(testConnectorId)).toBe(true);
  });
});
