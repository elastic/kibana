/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { shouldScheduleAction } from './should_schedule_action';
import { ruleRunMetricsStoreMock } from '../../../lib/rule_run_metrics_store.mock';
import { ActionsCompletion } from '@kbn/alerting-state-types';

const logger = loggingSystemMock.create().get();
const ruleRunMetricsStore = ruleRunMetricsStoreMock.create();

describe('shouldScheduleAction', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should return false if the the limit of executable actions has been reached', () => {
    ruleRunMetricsStore.hasReachedTheExecutableActionsLimit.mockReturnValueOnce(true);
    expect(
      shouldScheduleAction({
        action: {
          id: '1',
          group: 'default',
          actionTypeId: 'test-action-type-id',
          params: {
            foo: true,
            contextVal: 'My {{context.value}} goes here',
            stateVal: 'My {{state.value}} goes here',
            alertVal:
              'My {{rule.id}} {{rule.name}} {{rule.spaceId}} {{rule.tags}} {{alert.id}} goes here',
          },
          uuid: '111-111',
        },
        actionsConfigMap: {
          default: { max: 4 },
          'test-action-type-id': { max: 2 },
        },
        isActionExecutable: () => true,
        logger,
        ruleId: '1',
        ruleRunMetricsStore,
      })
    ).toEqual(false);

    expect(ruleRunMetricsStore.setTriggeredActionsStatusByConnectorType).toHaveBeenCalledWith({
      actionTypeId: 'test-action-type-id',
      status: ActionsCompletion.PARTIAL,
    });
    expect(logger.debug).toHaveBeenCalledWith(
      `Rule "1" skipped scheduling action "1" because the maximum number of allowed actions has been reached.`
    );
  });

  test('should return false if the the limit of executable actions for this action type has been reached', () => {
    ruleRunMetricsStore.hasReachedTheExecutableActionsLimitByConnectorType.mockReturnValueOnce(
      true
    );
    ruleRunMetricsStore.hasConnectorTypeReachedTheLimit.mockReturnValueOnce(true);
    expect(
      shouldScheduleAction({
        action: {
          id: '1',
          group: 'default',
          actionTypeId: 'test-action-type-id',
          params: {
            foo: true,
            contextVal: 'My {{context.value}} goes here',
            stateVal: 'My {{state.value}} goes here',
            alertVal:
              'My {{rule.id}} {{rule.name}} {{rule.spaceId}} {{rule.tags}} {{alert.id}} goes here',
          },
          uuid: '111-111',
        },
        actionsConfigMap: {
          default: { max: 4 },
          'test-action-type-id': { max: 2 },
        },
        isActionExecutable: () => true,
        logger,
        ruleId: '1',
        ruleRunMetricsStore,
      })
    ).toEqual(false);

    expect(ruleRunMetricsStore.setTriggeredActionsStatusByConnectorType).toHaveBeenCalledWith({
      actionTypeId: 'test-action-type-id',
      status: ActionsCompletion.PARTIAL,
    });
    expect(logger.debug).not.toHaveBeenCalled();
  });

  test('should return false and log if the the limit of executable actions for this action type has been reached', () => {
    ruleRunMetricsStore.hasReachedTheExecutableActionsLimitByConnectorType.mockReturnValueOnce(
      true
    );
    ruleRunMetricsStore.hasConnectorTypeReachedTheLimit.mockReturnValueOnce(false);
    expect(
      shouldScheduleAction({
        action: {
          id: '1',
          group: 'default',
          actionTypeId: 'test-action-type-id',
          params: {
            foo: true,
            contextVal: 'My {{context.value}} goes here',
            stateVal: 'My {{state.value}} goes here',
            alertVal:
              'My {{rule.id}} {{rule.name}} {{rule.spaceId}} {{rule.tags}} {{alert.id}} goes here',
          },
          uuid: '111-111',
        },
        actionsConfigMap: {
          default: { max: 4 },
          'test-action-type-id': { max: 2 },
        },
        isActionExecutable: () => true,
        logger,
        ruleId: '1',
        ruleRunMetricsStore,
      })
    ).toEqual(false);

    expect(ruleRunMetricsStore.setTriggeredActionsStatusByConnectorType).toHaveBeenCalledWith({
      actionTypeId: 'test-action-type-id',
      status: ActionsCompletion.PARTIAL,
    });
    expect(logger.debug).toHaveBeenCalledWith(
      `Rule "1" skipped scheduling action "1" because the maximum number of allowed actions for connector type test-action-type-id has been reached.`
    );
  });

  test('should return false the action is not executable', () => {
    expect(
      shouldScheduleAction({
        action: {
          id: '1',
          group: 'default',
          actionTypeId: 'test-action-type-id',
          params: {
            foo: true,
            contextVal: 'My {{context.value}} goes here',
            stateVal: 'My {{state.value}} goes here',
            alertVal:
              'My {{rule.id}} {{rule.name}} {{rule.spaceId}} {{rule.tags}} {{alert.id}} goes here',
          },
          uuid: '111-111',
        },
        actionsConfigMap: {
          default: { max: 4 },
          'test-action-type-id': { max: 2 },
        },
        isActionExecutable: () => false,
        logger,
        ruleId: '1',
        ruleRunMetricsStore,
      })
    ).toEqual(false);

    expect(logger.warn).toHaveBeenCalledWith(
      `Rule "1" skipped scheduling action "1" because it is disabled`
    );
  });

  test('should return true if the action is executable and no limits have been reached', () => {
    expect(
      shouldScheduleAction({
        action: {
          id: '1',
          group: 'default',
          actionTypeId: 'test-action-type-id',
          params: {
            foo: true,
            contextVal: 'My {{context.value}} goes here',
            stateVal: 'My {{state.value}} goes here',
            alertVal:
              'My {{rule.id}} {{rule.name}} {{rule.spaceId}} {{rule.tags}} {{alert.id}} goes here',
          },
          uuid: '111-111',
        },
        actionsConfigMap: {
          default: { max: 4 },
          'test-action-type-id': { max: 2 },
        },
        isActionExecutable: () => true,
        logger,
        ruleId: '1',
        ruleRunMetricsStore,
      })
    ).toEqual(true);
  });
});
