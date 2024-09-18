/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ActionScheduler } from './action_scheduler';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import {
  actionsClientMock,
  actionsMock,
  renderActionParameterTemplatesDefault,
} from '@kbn/actions-plugin/server/mocks';
import { ActionsCompletion } from '@kbn/alerting-state-types';
import { ALERT_UUID } from '@kbn/rule-data-utils';
import { InjectActionParamsOpts, injectActionParams } from '../inject_action_params';
import { RuleTypeParams, SanitizedRule, GetViewInAppRelativeUrlFnOpts } from '../../types';
import { RuleRunMetricsStore } from '../../lib/rule_run_metrics_store';
import { alertingEventLoggerMock } from '../../lib/alerting_event_logger/alerting_event_logger.mock';
import { ConcreteTaskInstance, TaskErrorSource } from '@kbn/task-manager-plugin/server';
import { RuleNotifyWhen } from '../../../common';
import { asSavedObjectExecutionSource } from '@kbn/actions-plugin/server';
import sinon from 'sinon';
import { mockAAD } from '../fixtures';
import { schema } from '@kbn/config-schema';
import { alertsClientMock } from '../../alerts_client/alerts_client.mock';
import { ExecutionResponseType } from '@kbn/actions-plugin/server/create_execute_function';
import { RULE_SAVED_OBJECT_TYPE } from '../../saved_objects';
import { getErrorSource } from '@kbn/task-manager-plugin/server/task_running';
import {
  generateAlert,
  generateRecoveredAlert,
  getDefaultSchedulerContext,
  getRule,
  getRuleType,
} from './test_fixtures';

jest.mock('../inject_action_params', () => ({
  injectActionParams: jest.fn(),
}));

const injectActionParamsMock = injectActionParams as jest.Mock;

const alertingEventLogger = alertingEventLoggerMock.create();
const actionsClient = actionsClientMock.create();
const alertsClient = alertsClientMock.create();
const mockActionsPlugin = actionsMock.createStart();
const apiKey = Buffer.from('123:abc').toString('base64');

const rule = getRule();
const ruleType = getRuleType();
const defaultSchedulerContext = getDefaultSchedulerContext(
  loggingSystemMock.create().get(),
  mockActionsPlugin,
  alertingEventLogger,
  actionsClient,
  alertsClient
);

const defaultExecutionResponse = {
  errors: false,
  items: [{ actionTypeId: 'test', id: '1', response: ExecutionResponseType.SUCCESS }],
};

let ruleRunMetricsStore: RuleRunMetricsStore;
let clock: sinon.SinonFakeTimers;

// @ts-ignore
const getSchedulerContext = (params = {}) => {
  return {
    ...defaultSchedulerContext,
    ...params,
    ruleRunMetricsStore,
  };
};

const DATE_1970 = new Date('1970-01-01T00:00:00.000Z');

describe('Action Scheduler', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    jest
      .requireMock('../inject_action_params')
      .injectActionParams.mockImplementation(
        ({ actionParams }: InjectActionParamsOpts) => actionParams
      );
    mockActionsPlugin.isActionTypeEnabled.mockReturnValue(true);
    mockActionsPlugin.isActionExecutable.mockReturnValue(true);
    mockActionsPlugin.getActionsClientWithRequest.mockResolvedValue(actionsClient);
    mockActionsPlugin.renderActionParameterTemplates.mockImplementation(
      renderActionParameterTemplatesDefault
    );
    ruleRunMetricsStore = new RuleRunMetricsStore();
    actionsClient.bulkEnqueueExecution.mockResolvedValue(defaultExecutionResponse);
  });
  beforeAll(() => {
    clock = sinon.useFakeTimers();
  });
  afterAll(() => clock.restore());

  test('enqueues execution per selected action', async () => {
    const alerts = generateAlert({ id: 1 });
    const actionScheduler = new ActionScheduler(getSchedulerContext());
    await actionScheduler.run(alerts);

    expect(ruleRunMetricsStore.getNumberOfTriggeredActions()).toBe(1);
    expect(ruleRunMetricsStore.getNumberOfGeneratedActions()).toBe(1);
    expect(actionsClient.bulkEnqueueExecution).toHaveBeenCalledTimes(1);
    expect(actionsClient.bulkEnqueueExecution.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        Array [
          Object {
            "actionTypeId": "test",
            "apiKey": "MTIzOmFiYw==",
            "consumer": "rule-consumer",
            "executionId": "5f6aa57d-3e22-484e-bae8-cbed868f4d28",
            "id": "1",
            "params": Object {
              "alertVal": "My 1 name-of-alert test1 tag-A,tag-B 1 goes here",
              "contextVal": "My  goes here",
              "foo": true,
              "stateVal": "My  goes here",
            },
            "relatedSavedObjects": Array [
              Object {
                "id": "1",
                "namespace": "test1",
                "type": "alert",
                "typeId": "test",
              },
            ],
            "source": Object {
              "source": Object {
                "id": "1",
                "type": "alert",
              },
              "type": "SAVED_OBJECT",
            },
            "spaceId": "test1",
          },
        ],
      ]
    `);

    expect(alertingEventLogger.logAction).toHaveBeenCalledTimes(1);
    expect(alertingEventLogger.logAction).toHaveBeenNthCalledWith(1, {
      id: '1',
      typeId: 'test',
      alertId: '1',
      alertGroup: 'default',
    });

    expect(jest.requireMock('../inject_action_params').injectActionParams).toHaveBeenCalledWith({
      actionTypeId: 'test',
      actionParams: {
        alertVal: 'My 1 name-of-alert test1 tag-A,tag-B 1 goes here',
        contextVal: 'My  goes here',
        foo: true,
        stateVal: 'My  goes here',
      },
      ruleName: rule.name,
    });

    expect(ruleRunMetricsStore.getTriggeredActionsStatus()).toBe(ActionsCompletion.COMPLETE);
  });

  test(`doesn't call actionsPlugin.execute for disabled actionTypes`, async () => {
    // Mock two calls, one for check against actions[0] and the second for actions[1]
    mockActionsPlugin.isActionExecutable.mockReturnValueOnce(false);
    mockActionsPlugin.isActionTypeEnabled.mockReturnValueOnce(false);
    mockActionsPlugin.isActionTypeEnabled.mockReturnValueOnce(true);
    const actionScheduler = new ActionScheduler(
      getSchedulerContext({
        rule: {
          ...defaultSchedulerContext.rule,
          actions: [
            {
              id: '2',
              group: 'default',
              actionTypeId: 'test2',
              params: {
                foo: true,
                contextVal: 'My other {{context.value}} goes here',
                stateVal: 'My other {{state.value}} goes here',
              },
            },
            {
              id: '2',
              group: 'default',
              actionTypeId: 'test2',
              params: {
                foo: true,
                contextVal: 'My other {{context.value}} goes here',
                stateVal: 'My other {{state.value}} goes here',
              },
            },
          ],
        },
      })
    );

    await actionScheduler.run(generateAlert({ id: 1 }));
    expect(ruleRunMetricsStore.getNumberOfTriggeredActions()).toBe(1);
    expect(ruleRunMetricsStore.getNumberOfGeneratedActions()).toBe(2);
    expect(actionsClient.bulkEnqueueExecution).toHaveBeenCalledTimes(1);
    expect(actionsClient.bulkEnqueueExecution).toHaveBeenCalledWith([
      {
        actionTypeId: 'test2',
        consumer: 'rule-consumer',
        id: '2',
        params: {
          foo: true,
          contextVal: 'My other  goes here',
          stateVal: 'My other  goes here',
        },
        source: asSavedObjectExecutionSource({
          id: '1',
          type: RULE_SAVED_OBJECT_TYPE,
        }),
        relatedSavedObjects: [
          {
            id: '1',
            namespace: 'test1',
            type: RULE_SAVED_OBJECT_TYPE,
            typeId: 'test',
          },
        ],
        spaceId: 'test1',
        apiKey,
        executionId: '5f6aa57d-3e22-484e-bae8-cbed868f4d28',
      },
    ]);
  });

  test('throw error message when action type is disabled', async () => {
    mockActionsPlugin.inMemoryConnectors = [];
    mockActionsPlugin.isActionExecutable.mockReturnValue(false);
    mockActionsPlugin.isActionTypeEnabled.mockReturnValue(false);
    const actionScheduler = new ActionScheduler(
      getSchedulerContext({
        rule: {
          ...defaultSchedulerContext.rule,
          actions: [
            {
              id: '2',
              group: 'default',
              actionTypeId: '.slack',
              params: {
                foo: true,
              },
            },
            {
              id: '3',
              group: 'default',
              actionTypeId: '.slack',
              params: {
                foo: true,
                contextVal: 'My other {{context.value}} goes here',
                stateVal: 'My other {{state.value}} goes here',
              },
            },
          ],
        },
      })
    );

    await actionScheduler.run(generateAlert({ id: 2 }));

    expect(ruleRunMetricsStore.getNumberOfTriggeredActions()).toBe(0);
    expect(ruleRunMetricsStore.getNumberOfGeneratedActions()).toBe(2);
    expect(actionsClient.bulkEnqueueExecution).toHaveBeenCalledTimes(0);

    mockActionsPlugin.isActionExecutable.mockImplementation(() => true);
    const actionSchedulerForPreconfiguredAction = new ActionScheduler({
      ...defaultSchedulerContext,
      ruleRunMetricsStore,
    });

    await actionSchedulerForPreconfiguredAction.run(generateAlert({ id: 2 }));
    expect(actionsClient.bulkEnqueueExecution).toHaveBeenCalledTimes(1);
  });

  test('should throw a USER error when a connector is not found', async () => {
    actionsClient.bulkEnqueueExecution.mockRejectedValue({
      statusCode: 404,
      message: 'Not Found',
    });
    const actions = [
      {
        id: '1',
        group: 'default',
        actionTypeId: 'test2',
        params: {
          foo: true,
          contextVal: 'My other {{context.value}} goes here',
          stateVal: 'My other {{state.value}} goes here',
        },
      },
    ];
    const actionScheduler = new ActionScheduler(
      getSchedulerContext({
        ...defaultSchedulerContext,
        taskRunnerContext: {
          ...defaultSchedulerContext.taskRunnerContext,
          actionsConfigMap: {
            default: {
              max: 2,
            },
          },
        },
        rule: {
          ...defaultSchedulerContext.rule,
          actions,
        },
      })
    );

    try {
      await actionScheduler.run(generateAlert({ id: 2, state: { value: 'state-val' } }));
    } catch (err) {
      expect(getErrorSource(err)).toBe(TaskErrorSource.USER);
    }
  });

  test('limits actionsPlugin.execute per action group', async () => {
    const actionScheduler = new ActionScheduler(getSchedulerContext());
    await actionScheduler.run(generateAlert({ id: 2, group: 'other-group' }));
    expect(ruleRunMetricsStore.getNumberOfTriggeredActions()).toBe(0);
    expect(ruleRunMetricsStore.getNumberOfGeneratedActions()).toBe(0);
    expect(actionsClient.bulkEnqueueExecution).not.toHaveBeenCalled();
  });

  test('context attribute gets parameterized', async () => {
    const actionScheduler = new ActionScheduler(getSchedulerContext());
    await actionScheduler.run(generateAlert({ id: 2, context: { value: 'context-val' } }));
    expect(ruleRunMetricsStore.getNumberOfTriggeredActions()).toBe(1);
    expect(ruleRunMetricsStore.getNumberOfGeneratedActions()).toBe(1);
    expect(actionsClient.bulkEnqueueExecution).toHaveBeenCalledTimes(1);
    expect(actionsClient.bulkEnqueueExecution.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        Array [
          Object {
            "actionTypeId": "test",
            "apiKey": "MTIzOmFiYw==",
            "consumer": "rule-consumer",
            "executionId": "5f6aa57d-3e22-484e-bae8-cbed868f4d28",
            "id": "1",
            "params": Object {
              "alertVal": "My 1 name-of-alert test1 tag-A,tag-B 2 goes here",
              "contextVal": "My context-val goes here",
              "foo": true,
              "stateVal": "My  goes here",
            },
            "relatedSavedObjects": Array [
              Object {
                "id": "1",
                "namespace": "test1",
                "type": "alert",
                "typeId": "test",
              },
            ],
            "source": Object {
              "source": Object {
                "id": "1",
                "type": "alert",
              },
              "type": "SAVED_OBJECT",
            },
            "spaceId": "test1",
          },
        ],
      ]
    `);
  });

  test('state attribute gets parameterized', async () => {
    const actionScheduler = new ActionScheduler(getSchedulerContext());
    await actionScheduler.run(generateAlert({ id: 2, state: { value: 'state-val' } }));
    expect(actionsClient.bulkEnqueueExecution).toHaveBeenCalledTimes(1);
    expect(actionsClient.bulkEnqueueExecution.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        Array [
          Object {
            "actionTypeId": "test",
            "apiKey": "MTIzOmFiYw==",
            "consumer": "rule-consumer",
            "executionId": "5f6aa57d-3e22-484e-bae8-cbed868f4d28",
            "id": "1",
            "params": Object {
              "alertVal": "My 1 name-of-alert test1 tag-A,tag-B 2 goes here",
              "contextVal": "My  goes here",
              "foo": true,
              "stateVal": "My state-val goes here",
            },
            "relatedSavedObjects": Array [
              Object {
                "id": "1",
                "namespace": "test1",
                "type": "alert",
                "typeId": "test",
              },
            ],
            "source": Object {
              "source": Object {
                "id": "1",
                "type": "alert",
              },
              "type": "SAVED_OBJECT",
            },
            "spaceId": "test1",
          },
        ],
      ]
    `);
  });

  test(`logs an error when action group isn't part of actionGroups available for the ruleType`, async () => {
    const actionScheduler = new ActionScheduler(getSchedulerContext());
    await actionScheduler.run(
      generateAlert({ id: 2, group: 'invalid-group' as 'default' | 'other-group' })
    );

    expect(defaultSchedulerContext.logger.error).toHaveBeenCalledWith(
      'Invalid action group "invalid-group" for rule "test".'
    );

    expect(ruleRunMetricsStore.getNumberOfTriggeredActions()).toBe(0);
    expect(ruleRunMetricsStore.getNumberOfGeneratedActions()).toBe(0);
    expect(ruleRunMetricsStore.getTriggeredActionsStatus()).toBe(ActionsCompletion.COMPLETE);
  });

  test('Stops triggering actions when the number of total triggered actions is reached the number of max executable actions', async () => {
    actionsClient.bulkEnqueueExecution.mockResolvedValueOnce({
      errors: false,
      items: [
        {
          actionTypeId: 'test2',
          id: '1',
          response: ExecutionResponseType.SUCCESS,
        },
        {
          actionTypeId: 'test2',
          id: '2',
          response: ExecutionResponseType.SUCCESS,
        },
      ],
    });
    const actions = [
      {
        id: '1',
        group: 'default',
        actionTypeId: 'test2',
        params: {
          foo: true,
          contextVal: 'My other {{context.value}} goes here',
          stateVal: 'My other {{state.value}} goes here',
        },
      },
      {
        id: '2',
        group: 'default',
        actionTypeId: 'test2',
        params: {
          foo: true,
          contextVal: 'My other {{context.value}} goes here',
          stateVal: 'My other {{state.value}} goes here',
        },
      },
      {
        id: '3',
        group: 'default',
        actionTypeId: 'test3',
        params: {
          foo: true,
          contextVal: '{{context.value}} goes here',
          stateVal: '{{state.value}} goes here',
        },
      },
    ];
    const actionScheduler = new ActionScheduler(
      getSchedulerContext({
        ...defaultSchedulerContext,
        taskRunnerContext: {
          ...defaultSchedulerContext.taskRunnerContext,
          actionsConfigMap: {
            default: {
              max: 2,
            },
          },
        },
        rule: {
          ...defaultSchedulerContext.rule,
          actions,
        },
      })
    );
    await actionScheduler.run(generateAlert({ id: 2, state: { value: 'state-val' } }));

    expect(ruleRunMetricsStore.getNumberOfTriggeredActions()).toBe(2);
    expect(ruleRunMetricsStore.getNumberOfGeneratedActions()).toBe(3);
    expect(ruleRunMetricsStore.getTriggeredActionsStatus()).toBe(ActionsCompletion.PARTIAL);
    expect(defaultSchedulerContext.logger.debug).toHaveBeenCalledTimes(1);
    expect(actionsClient.bulkEnqueueExecution).toHaveBeenCalledTimes(1);
  });

  test('Skips triggering actions for a specific action type when it reaches the limit for that specific action type', async () => {
    actionsClient.bulkEnqueueExecution.mockResolvedValueOnce({
      errors: false,
      items: [
        { actionTypeId: 'test', id: '1', response: ExecutionResponseType.SUCCESS },
        {
          actionTypeId: 'test-action-type-id',
          id: '2',
          response: ExecutionResponseType.SUCCESS,
        },
        {
          actionTypeId: 'another-action-type-id',
          id: '4',
          response: ExecutionResponseType.SUCCESS,
        },
        {
          actionTypeId: 'another-action-type-id',
          id: '5',
          response: ExecutionResponseType.SUCCESS,
        },
      ],
    });
    const actions = [
      ...defaultSchedulerContext.rule.actions,
      {
        id: '2',
        group: 'default',
        actionTypeId: 'test-action-type-id',
        params: {
          foo: true,
          contextVal: 'My other {{context.value}} goes here',
          stateVal: 'My other {{state.value}} goes here',
        },
      },
      {
        id: '3',
        group: 'default',
        actionTypeId: 'test-action-type-id',
        params: {
          foo: true,
          contextVal: '{{context.value}} goes here',
          stateVal: '{{state.value}} goes here',
        },
      },
      {
        id: '4',
        group: 'default',
        actionTypeId: 'another-action-type-id',
        params: {
          foo: true,
          contextVal: '{{context.value}} goes here',
          stateVal: '{{state.value}} goes here',
        },
      },
      {
        id: '5',
        group: 'default',
        actionTypeId: 'another-action-type-id',
        params: {
          foo: true,
          contextVal: '{{context.value}} goes here',
          stateVal: '{{state.value}} goes here',
        },
      },
    ];
    const actionScheduler = new ActionScheduler(
      getSchedulerContext({
        ...defaultSchedulerContext,
        taskRunnerContext: {
          ...defaultSchedulerContext.taskRunnerContext,
          actionsConfigMap: {
            default: {
              max: 4,
            },
            'test-action-type-id': {
              max: 1,
            },
          },
        },
        rule: {
          ...defaultSchedulerContext.rule,
          actions,
        },
      })
    );
    await actionScheduler.run(generateAlert({ id: 2, state: { value: 'state-val' } }));

    expect(ruleRunMetricsStore.getNumberOfTriggeredActions()).toBe(4);
    expect(ruleRunMetricsStore.getNumberOfGeneratedActions()).toBe(5);
    expect(ruleRunMetricsStore.getStatusByConnectorType('test').numberOfTriggeredActions).toBe(1);
    expect(
      ruleRunMetricsStore.getStatusByConnectorType('test-action-type-id').numberOfTriggeredActions
    ).toBe(1);
    expect(
      ruleRunMetricsStore.getStatusByConnectorType('another-action-type-id')
        .numberOfTriggeredActions
    ).toBe(2);
    expect(ruleRunMetricsStore.getTriggeredActionsStatus()).toBe(ActionsCompletion.PARTIAL);
    expect(actionsClient.bulkEnqueueExecution).toHaveBeenCalledTimes(1);
  });

  test('Stops triggering actions when the number of total queued actions is reached the number of max queued actions', async () => {
    actionsClient.bulkEnqueueExecution.mockResolvedValueOnce({
      errors: true,
      items: [
        {
          actionTypeId: 'test',
          id: '1',
          response: ExecutionResponseType.SUCCESS,
        },
        {
          actionTypeId: 'test',
          id: '2',
          response: ExecutionResponseType.SUCCESS,
        },
        {
          actionTypeId: 'test',
          id: '3',
          response: ExecutionResponseType.QUEUED_ACTIONS_LIMIT_ERROR,
        },
      ],
    });
    const actions = [
      {
        id: '1',
        group: 'default',
        actionTypeId: 'test',
        params: {
          foo: true,
          contextVal: 'My other {{context.value}} goes here',
          stateVal: 'My other {{state.value}} goes here',
        },
      },
      {
        id: '2',
        group: 'default',
        actionTypeId: 'test',
        params: {
          foo: true,
          contextVal: 'My other {{context.value}} goes here',
          stateVal: 'My other {{state.value}} goes here',
        },
      },
      {
        id: '3',
        group: 'default',
        actionTypeId: 'test',
        params: {
          foo: true,
          contextVal: '{{context.value}} goes here',
          stateVal: '{{state.value}} goes here',
        },
      },
    ];
    const actionScheduler = new ActionScheduler(
      getSchedulerContext({
        ...defaultSchedulerContext,
        rule: {
          ...defaultSchedulerContext.rule,
          actions,
        },
      })
    );
    await actionScheduler.run(generateAlert({ id: 2, state: { value: 'state-val' } }));

    expect(ruleRunMetricsStore.getNumberOfTriggeredActions()).toBe(2);
    expect(ruleRunMetricsStore.getNumberOfGeneratedActions()).toBe(3);
    expect(ruleRunMetricsStore.getTriggeredActionsStatus()).toBe(ActionsCompletion.PARTIAL);
    expect(defaultSchedulerContext.logger.debug).toHaveBeenCalledTimes(1);
    expect(actionsClient.bulkEnqueueExecution).toHaveBeenCalledTimes(1);
  });

  test('schedules alerts with recovered actions', async () => {
    const actions = [
      {
        id: '1',
        group: 'recovered',
        actionTypeId: 'test',
        params: {
          foo: true,
          contextVal: 'My {{context.value}} goes here',
          stateVal: 'My {{state.value}} goes here',
          alertVal:
            'My {{rule.id}} {{rule.name}} {{rule.spaceId}} {{rule.tags}} {{alert.id}} goes here',
        },
      },
    ];
    const actionScheduler = new ActionScheduler(
      getSchedulerContext({
        ...defaultSchedulerContext,
        rule: {
          ...defaultSchedulerContext.rule,
          actions,
        },
      })
    );
    await actionScheduler.run(generateRecoveredAlert({ id: 1 }));

    expect(actionsClient.bulkEnqueueExecution).toHaveBeenCalledTimes(1);
    expect(actionsClient.bulkEnqueueExecution.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        Array [
          Object {
            "actionTypeId": "test",
            "apiKey": "MTIzOmFiYw==",
            "consumer": "rule-consumer",
            "executionId": "5f6aa57d-3e22-484e-bae8-cbed868f4d28",
            "id": "1",
            "params": Object {
              "alertVal": "My 1 name-of-alert test1 tag-A,tag-B 1 goes here",
              "contextVal": "My  goes here",
              "foo": true,
              "stateVal": "My  goes here",
            },
            "relatedSavedObjects": Array [
              Object {
                "id": "1",
                "namespace": "test1",
                "type": "alert",
                "typeId": "test",
              },
            ],
            "source": Object {
              "source": Object {
                "id": "1",
                "type": "alert",
              },
              "type": "SAVED_OBJECT",
            },
            "spaceId": "test1",
          },
        ],
      ]
    `);
  });

  test('does not schedule alerts with recovered actions that are muted', async () => {
    const actionScheduler = new ActionScheduler(
      getSchedulerContext({
        ...defaultSchedulerContext,
        rule: {
          ...defaultSchedulerContext.rule,
          mutedInstanceIds: ['1'],
          actions: [
            {
              id: '1',
              group: 'recovered',
              actionTypeId: 'test',
              params: {
                foo: true,
                contextVal: 'My {{context.value}} goes here',
                stateVal: 'My {{state.value}} goes here',
                alertVal:
                  'My {{rule.id}} {{rule.name}} {{rule.spaceId}} {{rule.tags}} {{alert.id}} goes here',
              },
            },
          ],
        },
      })
    );
    await actionScheduler.run(generateRecoveredAlert({ id: 1 }));

    expect(actionsClient.bulkEnqueueExecution).toHaveBeenCalledTimes(0);
    expect(defaultSchedulerContext.logger.debug).nthCalledWith(
      1,
      `skipping scheduling of actions for '1' in rule ${defaultSchedulerContext.ruleLabel}: rule is muted`
    );
  });

  test('does not schedule active alerts that are throttled', async () => {
    const actionScheduler = new ActionScheduler(
      getSchedulerContext({
        ...defaultSchedulerContext,
        rule: {
          ...defaultSchedulerContext.rule,
          notifyWhen: 'onThrottleInterval',
          throttle: '1m',
        },
      })
    );
    await actionScheduler.run(generateAlert({ id: 1 }));

    clock.tick(30000);

    expect(actionsClient.bulkEnqueueExecution).toHaveBeenCalledTimes(0);
    expect(defaultSchedulerContext.logger.debug).nthCalledWith(
      1,
      `skipping scheduling of actions for '1' in rule ${defaultSchedulerContext.ruleLabel}: rule is throttled`
    );
  });

  test('does not schedule actions that are throttled', async () => {
    const actionScheduler = new ActionScheduler(
      getSchedulerContext({
        ...defaultSchedulerContext,
        rule: {
          ...defaultSchedulerContext.rule,
          actions: [
            {
              ...defaultSchedulerContext.rule.actions[0],
              frequency: {
                summary: false,
                notifyWhen: 'onThrottleInterval',
                throttle: '1h',
              },
            },
          ],
        },
      })
    );
    await actionScheduler.run(
      generateAlert({
        id: 1,
        throttledActions: { '111-111': { date: new Date(DATE_1970).toISOString() } },
      })
    );

    clock.tick(30000);

    expect(actionsClient.bulkEnqueueExecution).toHaveBeenCalledTimes(0);
    expect(defaultSchedulerContext.logger.debug).nthCalledWith(
      1,
      `skipping scheduling of actions for '1' in rule ${defaultSchedulerContext.ruleLabel}: rule is throttled`
    );
  });

  test('schedule actions that are throttled but alert has a changed action group', async () => {
    const actionScheduler = new ActionScheduler(
      getSchedulerContext({
        ...defaultSchedulerContext,
        rule: {
          ...defaultSchedulerContext.rule,
          actions: [
            {
              ...defaultSchedulerContext.rule.actions[0],
              frequency: {
                summary: false,
                notifyWhen: 'onThrottleInterval',
                throttle: '1h',
              },
            },
          ],
        },
      })
    );
    await actionScheduler.run(generateAlert({ id: 1, lastScheduledActionsGroup: 'recovered' }));

    clock.tick(30000);

    expect(actionsClient.bulkEnqueueExecution).toHaveBeenCalledTimes(1);
    expect(alertingEventLogger.logAction).toHaveBeenCalledTimes(1);
  });

  test('does not schedule active alerts that are muted', async () => {
    const actionScheduler = new ActionScheduler(
      getSchedulerContext({
        ...defaultSchedulerContext,
        rule: {
          ...defaultSchedulerContext.rule,
          mutedInstanceIds: ['1'],
        },
      })
    );
    await actionScheduler.run(generateAlert({ id: 1 }));

    expect(actionsClient.bulkEnqueueExecution).toHaveBeenCalledTimes(0);
    expect(defaultSchedulerContext.logger.debug).nthCalledWith(
      1,
      `skipping scheduling of actions for '1' in rule ${defaultSchedulerContext.ruleLabel}: rule is muted`
    );
  });

  test('triggers summary actions (per rule run)', async () => {
    actionsClient.bulkEnqueueExecution.mockResolvedValueOnce({
      errors: false,
      items: [
        {
          actionTypeId: 'testActionTypeId',
          id: '1',
          response: ExecutionResponseType.SUCCESS,
        },
      ],
    });
    alertsClient.getSummarizedAlerts.mockResolvedValue({
      new: {
        count: 1,
        data: [mockAAD],
      },
      ongoing: { count: 0, data: [] },
      recovered: { count: 0, data: [] },
    });
    const actionScheduler = new ActionScheduler(
      getSchedulerContext({
        rule: {
          ...defaultSchedulerContext.rule,
          mutedInstanceIds: ['foo'],
          actions: [
            {
              id: '1',
              group: null,
              actionTypeId: 'testActionTypeId',
              frequency: {
                summary: true,
                notifyWhen: 'onActiveAlert',
                throttle: null,
              },
              params: {
                message:
                  'New: {{alerts.new.count}} Ongoing: {{alerts.ongoing.count}} Recovered: {{alerts.recovered.count}}',
              },
            },
          ],
        },
      })
    );

    await actionScheduler.run(generateAlert({ id: 1 }));

    expect(alertsClient.getSummarizedAlerts).toHaveBeenCalledWith({
      executionUuid: '5f6aa57d-3e22-484e-bae8-cbed868f4d28',
      ruleId: '1',
      spaceId: 'test1',
      excludedAlertInstanceIds: ['foo'],
    });
    expect(actionsClient.bulkEnqueueExecution).toHaveBeenCalledTimes(1);
    expect(actionsClient.bulkEnqueueExecution.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        Array [
          Object {
            "actionTypeId": "testActionTypeId",
            "apiKey": "MTIzOmFiYw==",
            "consumer": "rule-consumer",
            "executionId": "5f6aa57d-3e22-484e-bae8-cbed868f4d28",
            "id": "1",
            "params": Object {
              "message": "New: 1 Ongoing: 0 Recovered: 0",
            },
            "relatedSavedObjects": Array [
              Object {
                "id": "1",
                "namespace": "test1",
                "type": "alert",
                "typeId": "test",
              },
            ],
            "source": Object {
              "source": Object {
                "id": "1",
                "type": "alert",
              },
              "type": "SAVED_OBJECT",
            },
            "spaceId": "test1",
          },
        ],
      ]
    `);
    expect(alertingEventLogger.logAction).toBeCalledWith({
      alertSummary: { new: 1, ongoing: 0, recovered: 0 },
      id: '1',
      typeId: 'testActionTypeId',
    });
  });

  test('skips summary actions (per rule run) when there is no alerts', async () => {
    alertsClient.getSummarizedAlerts.mockResolvedValue({
      new: { count: 0, data: [] },
      ongoing: { count: 0, data: [] },
      recovered: { count: 0, data: [] },
    });
    const actionScheduler = new ActionScheduler(
      getSchedulerContext({
        rule: {
          ...defaultSchedulerContext.rule,
          actions: [
            {
              id: '1',
              group: null,
              actionTypeId: 'testActionTypeId',
              frequency: {
                summary: true,
                notifyWhen: 'onActiveAlert',
                throttle: null,
              },
              params: {
                message:
                  'New: {{alerts.new.count}} Ongoing: {{alerts.ongoing.count}} Recovered: {{alerts.recovered.count}}',
              },
              alertsFilter: { query: { kql: 'test:1', dsl: '{}', filters: [] } },
            },
          ],
        },
      })
    );

    await actionScheduler.run({});

    expect(actionsClient.bulkEnqueueExecution).not.toHaveBeenCalled();
    expect(alertingEventLogger.logAction).not.toHaveBeenCalled();
  });

  test('triggers summary actions (custom interval)', async () => {
    actionsClient.bulkEnqueueExecution.mockResolvedValueOnce({
      errors: false,
      items: [
        {
          actionTypeId: 'testActionTypeId',
          id: '1',
          response: ExecutionResponseType.SUCCESS,
        },
      ],
    });
    alertsClient.getSummarizedAlerts.mockResolvedValue({
      new: {
        count: 1,
        data: [mockAAD],
      },
      ongoing: { count: 0, data: [] },
      recovered: { count: 0, data: [] },
    });
    const actionScheduler = new ActionScheduler(
      getSchedulerContext({
        rule: {
          ...defaultSchedulerContext.rule,
          mutedInstanceIds: ['foo'],
          actions: [
            {
              id: '1',
              group: null,
              actionTypeId: 'testActionTypeId',
              frequency: {
                summary: true,
                notifyWhen: 'onThrottleInterval',
                throttle: '1d',
              },
              params: {
                message:
                  'New: {{alerts.new.count}} Ongoing: {{alerts.ongoing.count}} Recovered: {{alerts.recovered.count}}',
              },
              uuid: '111-111',
            },
          ],
        },
      })
    );

    const result = await actionScheduler.run({});

    expect(alertsClient.getSummarizedAlerts).toHaveBeenCalledWith({
      start: new Date('1969-12-31T00:01:30.000Z'),
      end: new Date(),
      ruleId: '1',
      spaceId: 'test1',
      excludedAlertInstanceIds: ['foo'],
    });
    expect(result).toEqual({
      throttledSummaryActions: {
        '111-111': {
          date: new Date().toISOString(),
        },
      },
    });
    expect(actionsClient.bulkEnqueueExecution).toHaveBeenCalledTimes(1);
    expect(actionsClient.bulkEnqueueExecution.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        Array [
          Object {
            "actionTypeId": "testActionTypeId",
            "apiKey": "MTIzOmFiYw==",
            "consumer": "rule-consumer",
            "executionId": "5f6aa57d-3e22-484e-bae8-cbed868f4d28",
            "id": "1",
            "params": Object {
              "message": "New: 1 Ongoing: 0 Recovered: 0",
            },
            "relatedSavedObjects": Array [
              Object {
                "id": "1",
                "namespace": "test1",
                "type": "alert",
                "typeId": "test",
              },
            ],
            "source": Object {
              "source": Object {
                "id": "1",
                "type": "alert",
              },
              "type": "SAVED_OBJECT",
            },
            "spaceId": "test1",
          },
        ],
      ]
    `);
    expect(alertingEventLogger.logAction).toBeCalledWith({
      alertSummary: { new: 1, ongoing: 0, recovered: 0 },
      id: '1',
      typeId: 'testActionTypeId',
    });
  });

  test('does not trigger summary actions if it is still being throttled (custom interval)', async () => {
    alertsClient.getSummarizedAlerts.mockResolvedValue({
      new: { count: 0, alerts: [] },
      ongoing: { count: 0, alerts: [] },
      recovered: { count: 0, alerts: [] },
    });
    const actionScheduler = new ActionScheduler(
      getSchedulerContext({
        rule: {
          ...defaultSchedulerContext.rule,
          actions: [
            {
              id: '1',
              group: null,
              actionTypeId: 'testActionTypeId',
              frequency: {
                summary: true,
                notifyWhen: 'onThrottleInterval',
                throttle: '1d',
              },
              params: {
                message:
                  'New: {{alerts.new.count}} Ongoing: {{alerts.ongoing.count}} Recovered: {{alerts.recovered.count}}',
              },
              uuid: '111-111',
            },
          ],
        },
        taskInstance: {
          ...defaultSchedulerContext.taskInstance,
          state: {
            ...defaultSchedulerContext.taskInstance.state,
            summaryActions: { '111-111': { date: new Date() } },
          },
        } as unknown as ConcreteTaskInstance,
      })
    );

    await actionScheduler.run({});
    expect(defaultSchedulerContext.logger.debug).toHaveBeenCalledTimes(1);
    expect(defaultSchedulerContext.logger.debug).toHaveBeenCalledWith(
      "skipping scheduling the action 'testActionTypeId:1', summary action is still being throttled"
    );
    expect(alertsClient.getSummarizedAlerts).not.toHaveBeenCalled();
    expect(actionsClient.bulkEnqueueExecution).not.toHaveBeenCalled();
    expect(alertingEventLogger.logAction).not.toHaveBeenCalled();
  });

  test('removes the obsolete actions from the task state', async () => {
    alertsClient.getSummarizedAlerts.mockResolvedValue({
      new: { count: 0, data: [] },
      ongoing: { count: 0, data: [] },
      recovered: { count: 0, data: [] },
    });
    const actionScheduler = new ActionScheduler(
      getSchedulerContext({
        rule: {
          ...defaultSchedulerContext.rule,
          actions: [
            {
              id: '1',
              group: null,
              actionTypeId: 'testActionTypeId',
              frequency: {
                summary: true,
                notifyWhen: 'onThrottleInterval',
                throttle: '1d',
              },
              params: {
                message: 'New: {{alerts.new.count}}',
              },
              uuid: '111-111',
            },
            {
              id: '2',
              group: null,
              actionTypeId: 'testActionTypeId',
              frequency: {
                summary: true,
                notifyWhen: 'onThrottleInterval',
                throttle: '10d',
              },
              uuid: '222-222',
            },
          ],
        },
        taskInstance: {
          ...defaultSchedulerContext.taskInstance,
          state: {
            ...defaultSchedulerContext.taskInstance.state,
            summaryActions: {
              '111-111': { date: new Date() },
              '222-222': { date: new Date() },
              '333-333': { date: new Date() }, // does not exist in the actions list
            },
          },
        } as unknown as ConcreteTaskInstance,
      })
    );

    const result = await actionScheduler.run({});
    expect(result).toEqual({
      throttledSummaryActions: {
        '111-111': {
          date: new Date(),
        },
        '222-222': {
          date: new Date(),
        },
      },
    });
  });

  test(`skips scheduling actions if the ruleType doesn't have alerts mapping`, async () => {
    const { alerts, ...ruleTypeWithoutAlertsMapping } = ruleType;

    const actionScheduler = new ActionScheduler(
      getSchedulerContext({
        ...defaultSchedulerContext,
        ruleType: ruleTypeWithoutAlertsMapping,
        rule: {
          ...defaultSchedulerContext.rule,
          actions: [
            {
              ...defaultSchedulerContext.rule.actions[0],
              frequency: {
                summary: true,
                notifyWhen: 'onThrottleInterval',
                throttle: null,
              },
            },
          ],
        },
      })
    );
    await actionScheduler.run(generateAlert({ id: 2 }));

    expect(defaultSchedulerContext.logger.error).toHaveBeenCalledWith(
      'Skipping action "1" for rule "1" because the rule type "Test" does not support alert-as-data.'
    );

    expect(ruleRunMetricsStore.getNumberOfTriggeredActions()).toBe(0);
    expect(ruleRunMetricsStore.getNumberOfGeneratedActions()).toBe(0);
    expect(ruleRunMetricsStore.getTriggeredActionsStatus()).toBe(ActionsCompletion.COMPLETE);
  });

  test('schedules alerts with multiple recovered actions', async () => {
    actionsClient.bulkEnqueueExecution.mockResolvedValueOnce({
      errors: false,
      items: [
        { actionTypeId: 'test', id: '1', response: ExecutionResponseType.SUCCESS },
        {
          actionTypeId: 'test',
          id: '2',
          response: ExecutionResponseType.SUCCESS,
        },
      ],
    });
    const actions = [
      {
        id: '1',
        group: 'recovered',
        actionTypeId: 'test',
        params: {
          foo: true,
          contextVal: 'My {{context.value}} goes here',
          stateVal: 'My {{state.value}} goes here',
          alertVal:
            'My {{rule.id}} {{rule.name}} {{rule.spaceId}} {{rule.tags}} {{alert.id}} goes here',
        },
      },
      {
        id: '2',
        group: 'recovered',
        actionTypeId: 'test',
        params: {
          foo: true,
          contextVal: 'My {{context.value}} goes here',
          stateVal: 'My {{state.value}} goes here',
          alertVal:
            'My {{rule.id}} {{rule.name}} {{rule.spaceId}} {{rule.tags}} {{alert.id}} goes here',
        },
      },
    ];
    const actionScheduler = new ActionScheduler(
      getSchedulerContext({
        ...defaultSchedulerContext,
        rule: {
          ...defaultSchedulerContext.rule,
          actions,
        },
      })
    );
    await actionScheduler.run(generateRecoveredAlert({ id: 1 }));

    expect(actionsClient.bulkEnqueueExecution).toHaveBeenCalledTimes(1);
    expect(actionsClient.bulkEnqueueExecution.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        Array [
          Object {
            "actionTypeId": "test",
            "apiKey": "MTIzOmFiYw==",
            "consumer": "rule-consumer",
            "executionId": "5f6aa57d-3e22-484e-bae8-cbed868f4d28",
            "id": "1",
            "params": Object {
              "alertVal": "My 1 name-of-alert test1 tag-A,tag-B 1 goes here",
              "contextVal": "My  goes here",
              "foo": true,
              "stateVal": "My  goes here",
            },
            "relatedSavedObjects": Array [
              Object {
                "id": "1",
                "namespace": "test1",
                "type": "alert",
                "typeId": "test",
              },
            ],
            "source": Object {
              "source": Object {
                "id": "1",
                "type": "alert",
              },
              "type": "SAVED_OBJECT",
            },
            "spaceId": "test1",
          },
          Object {
            "actionTypeId": "test",
            "apiKey": "MTIzOmFiYw==",
            "consumer": "rule-consumer",
            "executionId": "5f6aa57d-3e22-484e-bae8-cbed868f4d28",
            "id": "2",
            "params": Object {
              "alertVal": "My 1 name-of-alert test1 tag-A,tag-B 1 goes here",
              "contextVal": "My  goes here",
              "foo": true,
              "stateVal": "My  goes here",
            },
            "relatedSavedObjects": Array [
              Object {
                "id": "1",
                "namespace": "test1",
                "type": "alert",
                "typeId": "test",
              },
            ],
            "source": Object {
              "source": Object {
                "id": "1",
                "type": "alert",
              },
              "type": "SAVED_OBJECT",
            },
            "spaceId": "test1",
          },
        ],
      ]
    `);
  });

  test('does not schedule actions for the summarized alerts that are filtered out (for each alert)', async () => {
    actionsClient.bulkEnqueueExecution.mockResolvedValueOnce({
      errors: false,
      items: [
        {
          actionTypeId: 'testActionTypeId',
          id: '1',
          response: ExecutionResponseType.SUCCESS,
        },
      ],
    });
    alertsClient.getSummarizedAlerts.mockResolvedValue({
      new: {
        count: 0,
        data: [],
      },
      ongoing: {
        count: 0,
        data: [],
      },
      recovered: { count: 0, data: [] },
    });
    const actionScheduler = new ActionScheduler(
      getSchedulerContext({
        rule: {
          ...defaultSchedulerContext.rule,
          mutedInstanceIds: ['foo'],
          actions: [
            {
              id: '1',
              uuid: '111',
              group: null,
              actionTypeId: 'testActionTypeId',
              frequency: {
                summary: true,
                notifyWhen: 'onActiveAlert',
                throttle: null,
              },
              params: {
                message:
                  'New: {{alerts.new.count}} Ongoing: {{alerts.ongoing.count}} Recovered: {{alerts.recovered.count}}',
              },
              alertsFilter: {
                query: { kql: 'kibana.alert.rule.name:foo', dsl: '{}', filters: [] },
              },
            },
          ],
        },
      })
    );

    await actionScheduler.run({
      ...generateAlert({ id: 1 }),
      ...generateAlert({ id: 2 }),
    });

    expect(alertsClient.getSummarizedAlerts).toHaveBeenCalledWith({
      executionUuid: '5f6aa57d-3e22-484e-bae8-cbed868f4d28',
      ruleId: '1',
      spaceId: 'test1',
      excludedAlertInstanceIds: ['foo'],
      alertsFilter: {
        query: { kql: 'kibana.alert.rule.name:foo', dsl: '{}', filters: [] },
      },
    });
    expect(actionsClient.bulkEnqueueExecution).not.toHaveBeenCalled();
    expect(alertingEventLogger.logAction).not.toHaveBeenCalled();
    expect(defaultSchedulerContext.logger.debug).toHaveBeenCalledTimes(1);
    expect(defaultSchedulerContext.logger.debug).toHaveBeenCalledWith(
      '(2) alerts have been filtered out for: testActionTypeId:111'
    );
  });

  test('does not schedule actions for the summarized alerts that are filtered out (summary of alerts onThrottleInterval)', async () => {
    actionsClient.bulkEnqueueExecution.mockResolvedValueOnce({
      errors: false,
      items: [
        {
          actionTypeId: 'testActionTypeId',
          id: '1',
          response: ExecutionResponseType.SUCCESS,
        },
      ],
    });
    alertsClient.getSummarizedAlerts.mockResolvedValue({
      new: {
        count: 0,
        data: [],
      },
      ongoing: {
        count: 0,
        data: [],
      },
      recovered: { count: 0, data: [] },
    });
    const actionScheduler = new ActionScheduler(
      getSchedulerContext({
        rule: {
          ...defaultSchedulerContext.rule,
          mutedInstanceIds: ['foo'],
          actions: [
            {
              id: '1',
              uuid: '111',
              group: null,
              actionTypeId: 'testActionTypeId',
              frequency: {
                summary: true,
                notifyWhen: 'onThrottleInterval',
                throttle: '1h',
              },
              params: {
                message:
                  'New: {{alerts.new.count}} Ongoing: {{alerts.ongoing.count}} Recovered: {{alerts.recovered.count}}',
              },
              alertsFilter: {
                query: { kql: 'kibana.alert.rule.name:foo', dsl: '{}', filters: [] },
              },
            },
          ],
        },
      })
    );

    await actionScheduler.run({
      ...generateAlert({ id: 1 }),
      ...generateAlert({ id: 2 }),
    });

    expect(alertsClient.getSummarizedAlerts).toHaveBeenCalledWith({
      ruleId: '1',
      spaceId: 'test1',
      end: new Date('1970-01-01T00:01:30.000Z'),
      start: new Date('1969-12-31T23:01:30.000Z'),
      excludedAlertInstanceIds: ['foo'],
      alertsFilter: {
        query: { kql: 'kibana.alert.rule.name:foo', dsl: '{}', filters: [] },
      },
    });
    expect(actionsClient.bulkEnqueueExecution).not.toHaveBeenCalled();
    expect(alertingEventLogger.logAction).not.toHaveBeenCalled();
  });

  test('does not schedule actions for the for-each type alerts that are filtered out', async () => {
    actionsClient.bulkEnqueueExecution.mockResolvedValueOnce({
      errors: false,
      items: [
        {
          actionTypeId: 'testActionTypeId',
          id: '1',
          response: ExecutionResponseType.SUCCESS,
        },
      ],
    });
    alertsClient.getSummarizedAlerts.mockResolvedValue({
      new: {
        count: 1,
        data: [{ ...mockAAD, kibana: { alert: { uuid: '1' } } }],
      },
      ongoing: {
        count: 0,
        data: [],
      },
      recovered: { count: 0, data: [] },
    });
    const actionScheduler = new ActionScheduler(
      getSchedulerContext({
        rule: {
          ...defaultSchedulerContext.rule,
          mutedInstanceIds: ['foo'],
          actions: [
            {
              id: '1',
              uuid: '111',
              group: 'default',
              actionTypeId: 'testActionTypeId',
              frequency: {
                summary: false,
                notifyWhen: 'onActiveAlert',
                throttle: null,
              },
              params: {},
              alertsFilter: {
                query: { kql: 'kibana.alert.instance.id:1', dsl: '{}', filters: [] },
              },
            },
          ],
        },
      })
    );

    await actionScheduler.run({
      ...generateAlert({ id: 1 }),
      ...generateAlert({ id: 2 }),
      ...generateAlert({ id: 3 }),
    });

    expect(alertsClient.getSummarizedAlerts).toHaveBeenCalledWith({
      executionUuid: '5f6aa57d-3e22-484e-bae8-cbed868f4d28',
      ruleId: '1',
      spaceId: 'test1',
      excludedAlertInstanceIds: ['foo'],
      alertsFilter: {
        query: { kql: 'kibana.alert.instance.id:1', dsl: '{}', filters: [] },
      },
    });
    expect(actionsClient.bulkEnqueueExecution).toHaveBeenCalledWith([
      {
        actionTypeId: 'testActionTypeId',
        apiKey: 'MTIzOmFiYw==',
        consumer: 'rule-consumer',
        executionId: '5f6aa57d-3e22-484e-bae8-cbed868f4d28',
        id: '1',
        params: {},
        relatedSavedObjects: [
          { id: '1', namespace: 'test1', type: RULE_SAVED_OBJECT_TYPE, typeId: 'test' },
        ],
        source: { source: { id: '1', type: RULE_SAVED_OBJECT_TYPE }, type: 'SAVED_OBJECT' },
        spaceId: 'test1',
      },
    ]);
    expect(alertingEventLogger.logAction).toHaveBeenCalledWith({
      alertGroup: 'default',
      alertId: '1',
      id: '1',
      typeId: 'testActionTypeId',
    });
    expect(defaultSchedulerContext.logger.debug).toHaveBeenCalledTimes(1);
    expect(defaultSchedulerContext.logger.debug).toHaveBeenCalledWith(
      '(2) alerts have been filtered out for: testActionTypeId:111'
    );
  });

  test('does not schedule summary actions when there are alerts with MW ids in memory', async () => {
    const newAlert1 = generateAlert({
      id: 1,
      maintenanceWindowIds: ['mw1'],
    });

    const newAlert2 = generateAlert({
      id: 2,
      maintenanceWindowIds: ['mw2'],
    });

    // The alerts that come back from getSummarizedAlerts might not have
    // the MW Ids attached yet, due to lack of refresh: true in the
    // update call to update the alert MW Ids
    const newAlert1AAD = {
      ...mockAAD,
      [ALERT_UUID]: newAlert1[1].getUuid(),
    };

    const newAlert2AAD = {
      ...mockAAD,
      [ALERT_UUID]: newAlert2[2].getUuid(),
    };

    alertsClient.getSummarizedAlerts.mockResolvedValue({
      new: {
        count: 2,
        data: [newAlert1AAD, newAlert2AAD],
      },
      ongoing: { count: 0, data: [] },
      recovered: { count: 0, data: [] },
    });

    alertsClient.getProcessedAlerts.mockReturnValue({
      '1': newAlert1[1],
      '2': newAlert2[2],
    });

    const actionScheduler = new ActionScheduler(
      getSchedulerContext({
        rule: {
          ...defaultSchedulerContext.rule,
          mutedInstanceIds: ['foo'],
          actions: [
            {
              uuid: '1',
              id: '1',
              group: null,
              actionTypeId: 'testActionTypeId',
              frequency: {
                summary: true,
                notifyWhen: 'onActiveAlert',
                throttle: null,
              },
              params: {
                message:
                  'New: {{alerts.new.count}} Ongoing: {{alerts.ongoing.count}} Recovered: {{alerts.recovered.count}}',
              },
            },
          ],
        },
        maintenanceWindowIds: ['test-id-active'],
      })
    );

    await actionScheduler.run({
      ...generateAlert({ id: 1, maintenanceWindowIds: ['test-id-1'] }),
      ...generateAlert({ id: 2, maintenanceWindowIds: ['test-id-2'] }),
      ...generateAlert({ id: 3, maintenanceWindowIds: ['test-id-3'] }),
    });

    expect(actionsClient.bulkEnqueueExecution).not.toHaveBeenCalled();
    expect(defaultSchedulerContext.logger.debug).toHaveBeenCalledTimes(1);

    expect(defaultSchedulerContext.logger.debug).toHaveBeenNthCalledWith(
      1,
      '(3) alerts have been filtered out for: testActionTypeId:1'
    );
  });

  test('does not schedule summary actions when there is an active maintenance window', async () => {
    alertsClient.getSummarizedAlerts.mockResolvedValue({
      new: { count: 0, data: [] },
      ongoing: { count: 0, data: [] },
      recovered: { count: 0, data: [] },
    });

    const actionScheduler = new ActionScheduler(
      getSchedulerContext({
        rule: {
          ...defaultSchedulerContext.rule,
          mutedInstanceIds: ['foo'],
          actions: [
            {
              uuid: '1',
              id: '1',
              group: null,
              actionTypeId: 'testActionTypeId',
              frequency: {
                summary: true,
                notifyWhen: 'onActiveAlert',
                throttle: null,
              },
              params: {
                message:
                  'New: {{alerts.new.count}} Ongoing: {{alerts.ongoing.count}} Recovered: {{alerts.recovered.count}}',
              },
            },
          ],
        },
        maintenanceWindowIds: ['test-id-active'],
      })
    );

    await actionScheduler.run({
      ...generateAlert({ id: 1, maintenanceWindowIds: ['test-id-1'] }),
      ...generateAlert({ id: 2, maintenanceWindowIds: ['test-id-2'] }),
      ...generateAlert({ id: 3, maintenanceWindowIds: ['test-id-3'] }),
    });

    expect(actionsClient.bulkEnqueueExecution).not.toHaveBeenCalled();
    expect(defaultSchedulerContext.logger.debug).toHaveBeenCalledTimes(1);

    expect(defaultSchedulerContext.logger.debug).toHaveBeenNthCalledWith(
      1,
      '(3) alerts have been filtered out for: testActionTypeId:1'
    );
  });

  test('does not schedule actions for alerts with maintenance window IDs', async () => {
    const actionScheduler = new ActionScheduler(getSchedulerContext());

    await actionScheduler.run({
      ...generateAlert({ id: 1, maintenanceWindowIds: ['test-id-1'] }),
      ...generateAlert({ id: 2, maintenanceWindowIds: ['test-id-2'] }),
      ...generateAlert({ id: 3, maintenanceWindowIds: ['test-id-3'] }),
    });

    expect(actionsClient.bulkEnqueueExecution).not.toHaveBeenCalled();
    expect(defaultSchedulerContext.logger.debug).toHaveBeenCalledTimes(3);

    expect(defaultSchedulerContext.logger.debug).toHaveBeenCalledWith(
      'no scheduling of summary actions "1" for rule "1": has active maintenance windows test-id-1.'
    );
    expect(defaultSchedulerContext.logger.debug).toHaveBeenCalledWith(
      'no scheduling of summary actions "1" for rule "1": has active maintenance windows test-id-2.'
    );
    expect(defaultSchedulerContext.logger.debug).toHaveBeenCalledWith(
      'no scheduling of summary actions "1" for rule "1": has active maintenance windows test-id-3.'
    );
  });

  test('does not schedule actions with notifyWhen not set to "on status change" for alerts that are flapping', async () => {
    const actionScheduler = new ActionScheduler(
      getSchedulerContext({
        ...defaultSchedulerContext,
        rule: {
          ...defaultSchedulerContext.rule,
          actions: [
            {
              ...defaultSchedulerContext.rule.actions[0],
              frequency: {
                summary: false,
                notifyWhen: RuleNotifyWhen.ACTIVE,
                throttle: null,
              },
            },
          ],
        },
      })
    );

    await actionScheduler.run({
      ...generateAlert({ id: 1, pendingRecoveredCount: 1, lastScheduledActionsGroup: 'recovered' }),
      ...generateAlert({ id: 2, pendingRecoveredCount: 1, lastScheduledActionsGroup: 'recovered' }),
      ...generateAlert({ id: 3, pendingRecoveredCount: 1, lastScheduledActionsGroup: 'recovered' }),
    });

    expect(actionsClient.bulkEnqueueExecution).not.toHaveBeenCalled();
  });

  test('does schedule actions with notifyWhen is set to "on status change" for alerts that are flapping', async () => {
    const actionScheduler = new ActionScheduler(
      getSchedulerContext({
        ...defaultSchedulerContext,
        rule: {
          ...defaultSchedulerContext.rule,
          actions: [
            {
              ...defaultSchedulerContext.rule.actions[0],
              frequency: {
                summary: false,
                notifyWhen: RuleNotifyWhen.CHANGE,
                throttle: null,
              },
            },
          ],
        },
      })
    );

    await actionScheduler.run({
      ...generateAlert({ id: 1, pendingRecoveredCount: 1, lastScheduledActionsGroup: 'recovered' }),
      ...generateAlert({ id: 2, pendingRecoveredCount: 1, lastScheduledActionsGroup: 'recovered' }),
      ...generateAlert({ id: 3, pendingRecoveredCount: 1, lastScheduledActionsGroup: 'recovered' }),
    });

    expect(actionsClient.bulkEnqueueExecution).toHaveBeenCalledTimes(1);
    expect(actionsClient.bulkEnqueueExecution.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        Array [
          Object {
            "actionTypeId": "test",
            "apiKey": "MTIzOmFiYw==",
            "consumer": "rule-consumer",
            "executionId": "5f6aa57d-3e22-484e-bae8-cbed868f4d28",
            "id": "1",
            "params": Object {
              "alertVal": "My 1 name-of-alert test1 tag-A,tag-B 1 goes here",
              "contextVal": "My  goes here",
              "foo": true,
              "stateVal": "My  goes here",
            },
            "relatedSavedObjects": Array [
              Object {
                "id": "1",
                "namespace": "test1",
                "type": "alert",
                "typeId": "test",
              },
            ],
            "source": Object {
              "source": Object {
                "id": "1",
                "type": "alert",
              },
              "type": "SAVED_OBJECT",
            },
            "spaceId": "test1",
          },
          Object {
            "actionTypeId": "test",
            "apiKey": "MTIzOmFiYw==",
            "consumer": "rule-consumer",
            "executionId": "5f6aa57d-3e22-484e-bae8-cbed868f4d28",
            "id": "1",
            "params": Object {
              "alertVal": "My 1 name-of-alert test1 tag-A,tag-B 2 goes here",
              "contextVal": "My  goes here",
              "foo": true,
              "stateVal": "My  goes here",
            },
            "relatedSavedObjects": Array [
              Object {
                "id": "1",
                "namespace": "test1",
                "type": "alert",
                "typeId": "test",
              },
            ],
            "source": Object {
              "source": Object {
                "id": "1",
                "type": "alert",
              },
              "type": "SAVED_OBJECT",
            },
            "spaceId": "test1",
          },
          Object {
            "actionTypeId": "test",
            "apiKey": "MTIzOmFiYw==",
            "consumer": "rule-consumer",
            "executionId": "5f6aa57d-3e22-484e-bae8-cbed868f4d28",
            "id": "1",
            "params": Object {
              "alertVal": "My 1 name-of-alert test1 tag-A,tag-B 3 goes here",
              "contextVal": "My  goes here",
              "foo": true,
              "stateVal": "My  goes here",
            },
            "relatedSavedObjects": Array [
              Object {
                "id": "1",
                "namespace": "test1",
                "type": "alert",
                "typeId": "test",
              },
            ],
            "source": Object {
              "source": Object {
                "id": "1",
                "type": "alert",
              },
              "type": "SAVED_OBJECT",
            },
            "spaceId": "test1",
          },
        ],
      ]
    `);
  });

  describe('rule url', () => {
    const ruleWithUrl = {
      ...rule,
      actions: [
        {
          id: '1',
          group: 'default',
          actionTypeId: 'test',
          params: {
            val: 'rule url: {{rule.url}}',
          },
        },
      ],
    } as unknown as SanitizedRule<RuleTypeParams>;

    const summaryRuleWithUrl = {
      ...rule,
      actions: [
        {
          id: '1',
          group: null,
          actionTypeId: 'test',
          frequency: {
            summary: true,
            notifyWhen: 'onActiveAlert',
            throttle: null,
          },
          params: {
            val: 'rule url: {{rule.url}}',
          },
        },
      ],
    } as unknown as SanitizedRule<RuleTypeParams>;

    it('populates the rule.url in the action params when the base url and rule id are specified', async () => {
      const execParams = {
        ...defaultSchedulerContext,
        rule: ruleWithUrl,
        taskRunnerContext: {
          ...defaultSchedulerContext.taskRunnerContext,
          kibanaBaseUrl: 'http://localhost:12345',
        },
      };

      const actionScheduler = new ActionScheduler(getSchedulerContext(execParams));
      await actionScheduler.run(generateAlert({ id: 1 }));

      expect(injectActionParamsMock.mock.calls[0]).toMatchInlineSnapshot(`
        Array [
          Object {
            "actionParams": Object {
              "val": "rule url: http://localhost:12345/s/test1/app/management/insightsAndAlerting/triggersActions/rule/1",
            },
            "actionTypeId": "test",
            "ruleName": "name-of-alert",
            "ruleUrl": Object {
              "absoluteUrl": "http://localhost:12345/s/test1/app/management/insightsAndAlerting/triggersActions/rule/1",
              "basePathname": "",
              "kibanaBaseUrl": "http://localhost:12345",
              "relativePath": "/app/management/insightsAndAlerting/triggersActions/rule/1",
              "spaceIdSegment": "/s/test1",
            },
          },
        ]
      `);
    });

    it('populates the rule.url in the action params when the base url contains pathname', async () => {
      const execParams = {
        ...defaultSchedulerContext,
        rule: ruleWithUrl,
        taskRunnerContext: {
          ...defaultSchedulerContext.taskRunnerContext,
          kibanaBaseUrl: 'http://localhost:12345/kbn',
        },
      };

      const actionScheduler = new ActionScheduler(getSchedulerContext(execParams));
      await actionScheduler.run(generateAlert({ id: 1 }));

      expect(injectActionParamsMock.mock.calls[0][0].actionParams).toEqual({
        val: 'rule url: http://localhost:12345/kbn/s/test1/app/management/insightsAndAlerting/triggersActions/rule/1',
      });
    });

    it('populates the rule.url with start and stop time when available', async () => {
      clock.reset();
      clock.tick(90000);
      alertsClient.getSummarizedAlerts.mockResolvedValue({
        new: {
          count: 2,
          data: [
            mockAAD,
            {
              ...mockAAD,
              '@timestamp': '2022-12-07T15:45:41.4672Z',
              alert: { instance: { id: 'all' } },
            },
          ],
        },
        ongoing: { count: 0, data: [] },
        recovered: { count: 0, data: [] },
      });
      const execParams = {
        ...defaultSchedulerContext,
        ruleType: {
          ...ruleType,
          getViewInAppRelativeUrl: (opts: GetViewInAppRelativeUrlFnOpts<RuleTypeParams>) =>
            `/app/test/rule/${opts.rule.id}?start=${opts.start ?? 0}&end=${opts.end ?? 0}`,
        },
        rule: summaryRuleWithUrl,
        taskRunnerContext: {
          ...defaultSchedulerContext.taskRunnerContext,
          kibanaBaseUrl: 'http://localhost:12345/basePath',
        },
      };

      const actionScheduler = new ActionScheduler(getSchedulerContext(execParams));
      await actionScheduler.run(generateAlert({ id: 1 }));

      expect(injectActionParamsMock.mock.calls[0]).toMatchInlineSnapshot(`
        Array [
          Object {
            "actionParams": Object {
              "val": "rule url: http://localhost:12345/basePath/s/test1/app/test/rule/1?start=30000&end=90000",
            },
            "actionTypeId": "test",
            "ruleName": "name-of-alert",
            "ruleUrl": Object {
              "absoluteUrl": "http://localhost:12345/basePath/s/test1/app/test/rule/1?start=30000&end=90000",
              "basePathname": "/basePath",
              "kibanaBaseUrl": "http://localhost:12345/basePath",
              "relativePath": "/app/test/rule/1?start=30000&end=90000",
              "spaceIdSegment": "/s/test1",
            },
          },
        ]
      `);
    });

    it('populates the rule.url without the space specifier when the spaceId is the string "default"', async () => {
      const execParams = {
        ...defaultSchedulerContext,
        rule: ruleWithUrl,
        taskRunnerContext: {
          ...defaultSchedulerContext.taskRunnerContext,
          kibanaBaseUrl: 'http://localhost:12345',
        },
        taskInstance: {
          params: { spaceId: 'default', alertId: '1' },
        } as unknown as ConcreteTaskInstance,
      };

      const actionScheduler = new ActionScheduler(getSchedulerContext(execParams));
      await actionScheduler.run(generateAlert({ id: 1 }));

      expect(injectActionParamsMock.mock.calls[0]).toMatchInlineSnapshot(`
        Array [
          Object {
            "actionParams": Object {
              "val": "rule url: http://localhost:12345/app/management/insightsAndAlerting/triggersActions/rule/1",
            },
            "actionTypeId": "test",
            "ruleName": "name-of-alert",
            "ruleUrl": Object {
              "absoluteUrl": "http://localhost:12345/app/management/insightsAndAlerting/triggersActions/rule/1",
              "basePathname": "",
              "kibanaBaseUrl": "http://localhost:12345",
              "relativePath": "/app/management/insightsAndAlerting/triggersActions/rule/1",
              "spaceIdSegment": "",
            },
          },
        ]
      `);
    });

    it('populates the rule.url in the action params when the base url has a trailing slash and removes the trailing slash', async () => {
      const execParams = {
        ...defaultSchedulerContext,
        rule: ruleWithUrl,
        taskRunnerContext: {
          ...defaultSchedulerContext.taskRunnerContext,
          kibanaBaseUrl: 'http://localhost:12345/',
        },
      };

      const actionScheduler = new ActionScheduler(getSchedulerContext(execParams));
      await actionScheduler.run(generateAlert({ id: 1 }));

      expect(injectActionParamsMock.mock.calls[0]).toMatchInlineSnapshot(`
        Array [
          Object {
            "actionParams": Object {
              "val": "rule url: http://localhost:12345/s/test1/app/management/insightsAndAlerting/triggersActions/rule/1",
            },
            "actionTypeId": "test",
            "ruleName": "name-of-alert",
            "ruleUrl": Object {
              "absoluteUrl": "http://localhost:12345/s/test1/app/management/insightsAndAlerting/triggersActions/rule/1",
              "basePathname": "",
              "kibanaBaseUrl": "http://localhost:12345/",
              "relativePath": "/app/management/insightsAndAlerting/triggersActions/rule/1",
              "spaceIdSegment": "/s/test1",
            },
          },
        ]
      `);
    });

    it('does not populate the rule.url when the base url is not specified', async () => {
      const execParams = {
        ...defaultSchedulerContext,
        rule: ruleWithUrl,
        taskRunnerContext: {
          ...defaultSchedulerContext.taskRunnerContext,
          kibanaBaseUrl: undefined,
        },
      };

      const actionScheduler = new ActionScheduler(getSchedulerContext(execParams));
      await actionScheduler.run(generateAlert({ id: 1 }));

      expect(injectActionParamsMock.mock.calls[0]).toMatchInlineSnapshot(`
        Array [
          Object {
            "actionParams": Object {
              "val": "rule url: ",
            },
            "actionTypeId": "test",
            "ruleName": "name-of-alert",
            "ruleUrl": undefined,
          },
        ]
      `);
    });

    it('does not populate the rule.url when base url is not a valid url', async () => {
      const execParams = {
        ...defaultSchedulerContext,
        rule: ruleWithUrl,
        taskRunnerContext: {
          ...defaultSchedulerContext.taskRunnerContext,
          kibanaBaseUrl: 'localhost12345',
        },
        taskInstance: {
          params: { spaceId: 'test1', alertId: '1' },
        } as unknown as ConcreteTaskInstance,
      };

      const actionScheduler = new ActionScheduler(getSchedulerContext(execParams));
      await actionScheduler.run(generateAlert({ id: 1 }));

      expect(injectActionParamsMock.mock.calls[0]).toMatchInlineSnapshot(`
        Array [
          Object {
            "actionParams": Object {
              "val": "rule url: ",
            },
            "actionTypeId": "test",
            "ruleName": "name-of-alert",
            "ruleUrl": undefined,
          },
        ]
      `);
    });

    it('does not populate the rule.url when base url is a number', async () => {
      const execParams = {
        ...defaultSchedulerContext,
        rule: ruleWithUrl,
        taskRunnerContext: {
          ...defaultSchedulerContext.taskRunnerContext,
          kibanaBaseUrl: 1,
        },
        taskInstance: {
          params: { spaceId: 'test1', alertId: '1' },
        } as unknown as ConcreteTaskInstance,
      };

      const actionScheduler = new ActionScheduler(getSchedulerContext(execParams));
      await actionScheduler.run(generateAlert({ id: 1 }));

      expect(injectActionParamsMock.mock.calls[0]).toMatchInlineSnapshot(`
        Array [
          Object {
            "actionParams": Object {
              "val": "rule url: ",
            },
            "actionTypeId": "test",
            "ruleName": "name-of-alert",
            "ruleUrl": undefined,
          },
        ]
      `);
    });

    it('sets the rule.url to the value from getViewInAppRelativeUrl when the rule type has it defined', async () => {
      const execParams = {
        ...defaultSchedulerContext,
        rule: ruleWithUrl,
        taskRunnerContext: {
          ...defaultSchedulerContext.taskRunnerContext,
          kibanaBaseUrl: 'http://localhost:12345',
        },
        ruleType: {
          ...ruleType,
          getViewInAppRelativeUrl() {
            return '/app/management/some/other/place';
          },
        },
      };

      const actionScheduler = new ActionScheduler(getSchedulerContext(execParams));
      await actionScheduler.run(generateAlert({ id: 1 }));

      expect(injectActionParamsMock.mock.calls[0]).toMatchInlineSnapshot(`
        Array [
          Object {
            "actionParams": Object {
              "val": "rule url: http://localhost:12345/s/test1/app/management/some/other/place",
            },
            "actionTypeId": "test",
            "ruleName": "name-of-alert",
            "ruleUrl": Object {
              "absoluteUrl": "http://localhost:12345/s/test1/app/management/some/other/place",
              "basePathname": "",
              "kibanaBaseUrl": "http://localhost:12345",
              "relativePath": "/app/management/some/other/place",
              "spaceIdSegment": "/s/test1",
            },
          },
        ]
      `);
    });
  });

  describe('System actions', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      mockActionsPlugin.isSystemActionConnector.mockReturnValue(true);
    });

    test('triggers system actions with summarization per rule run', async () => {
      const actionsParams = { myParams: 'test' };

      alertsClient.getSummarizedAlerts.mockResolvedValue({
        new: {
          count: 1,
          data: [mockAAD],
        },
        ongoing: { count: 0, data: [] },
        recovered: { count: 0, data: [] },
      });

      const executorParams = getSchedulerContext({
        rule: {
          ...defaultSchedulerContext.rule,
          systemActions: [
            {
              id: '1',
              actionTypeId: '.test-system-action',
              params: actionsParams,
              uui: 'test',
            },
          ],
        },
      });

      const buildActionParams = jest.fn().mockReturnValue({ ...actionsParams, foo: 'bar' });

      executorParams.taskRunnerContext.connectorAdapterRegistry.register({
        connectorTypeId: '.test-system-action',
        ruleActionParamsSchema: schema.object({}),
        buildActionParams,
      });

      executorParams.actionsClient.isSystemAction.mockReturnValue(true);
      executorParams.taskRunnerContext.kibanaBaseUrl = 'https://example.com';

      const actionScheduler = new ActionScheduler(getSchedulerContext(executorParams));

      const res = await actionScheduler.run(generateAlert({ id: 1 }));

      /**
       * Verifies that system actions are not throttled
       */
      expect(res).toEqual({ throttledSummaryActions: {} });

      /**
       * Verifies that system actions
       * work only with summarized alerts
       */
      expect(alertsClient.getSummarizedAlerts).toHaveBeenCalledWith({
        executionUuid: '5f6aa57d-3e22-484e-bae8-cbed868f4d28',
        ruleId: '1',
        spaceId: 'test1',
        excludedAlertInstanceIds: [],
        alertsFilter: undefined,
      });

      expect(buildActionParams).toHaveBeenCalledWith({
        alerts: {
          all: {
            count: 1,
            data: [mockAAD],
          },
          new: {
            count: 1,
            data: [mockAAD],
          },
          ongoing: { count: 0, data: [] },
          recovered: { count: 0, data: [] },
        },
        params: actionsParams,
        rule: {
          id: rule.id,
          name: rule.name,
          tags: rule.tags,
          consumer: 'test-consumer',
          producer: 'alerts',
        },
        ruleUrl:
          'https://example.com/s/test1/app/management/insightsAndAlerting/triggersActions/rule/1',
        spaceId: 'test1',
      });

      expect(actionsClient.bulkEnqueueExecution).toHaveBeenCalledTimes(1);
      expect(actionsClient.bulkEnqueueExecution.mock.calls[0]).toMatchInlineSnapshot(`
        Array [
          Array [
            Object {
              "actionTypeId": ".test-system-action",
              "apiKey": "MTIzOmFiYw==",
              "consumer": "rule-consumer",
              "executionId": "5f6aa57d-3e22-484e-bae8-cbed868f4d28",
              "id": "1",
              "params": Object {
                "foo": "bar",
                "myParams": "test",
              },
              "relatedSavedObjects": Array [
                Object {
                  "id": "1",
                  "namespace": "test1",
                  "type": "alert",
                  "typeId": "test",
                },
              ],
              "source": Object {
                "source": Object {
                  "id": "1",
                  "type": "alert",
                },
                "type": "SAVED_OBJECT",
              },
              "spaceId": "test1",
            },
          ],
        ]
      `);

      expect(alertingEventLogger.logAction).toBeCalledWith({
        alertSummary: { new: 1, ongoing: 0, recovered: 0 },
        id: '1',
        typeId: '.test-system-action',
      });
    });

    test('does not execute if the connector adapter is not configured', async () => {
      const actionsParams = { myParams: 'test' };

      alertsClient.getSummarizedAlerts.mockResolvedValue({
        new: {
          count: 1,
          data: [mockAAD],
        },
        ongoing: { count: 0, data: [] },
        recovered: { count: 0, data: [] },
      });

      const executorParams = getSchedulerContext({
        rule: {
          ...defaultSchedulerContext.rule,
          systemActions: [
            {
              id: 'action-id',
              actionTypeId: '.connector-adapter-not-exists',
              params: actionsParams,
              uui: 'test',
            },
          ],
        },
      });

      const buildActionParams = jest.fn().mockReturnValue({ ...actionsParams, foo: 'bar' });

      executorParams.actionsClient.isSystemAction.mockReturnValue(true);
      executorParams.taskRunnerContext.kibanaBaseUrl = 'https://example.com';

      const actionScheduler = new ActionScheduler(getSchedulerContext(executorParams));

      const res = await actionScheduler.run(generateAlert({ id: 1 }));

      /**
       * Verifies that system actions are not throttled
       */
      expect(res).toEqual({ throttledSummaryActions: {} });

      /**
       * Verifies that system actions
       * work only with summarized alerts
       */
      expect(alertsClient.getSummarizedAlerts).toHaveBeenCalledWith({
        executionUuid: '5f6aa57d-3e22-484e-bae8-cbed868f4d28',
        ruleId: '1',
        spaceId: 'test1',
        excludedAlertInstanceIds: [],
        alertsFilter: undefined,
      });

      expect(buildActionParams).not.toHaveBeenCalledWith();
      expect(actionsClient.ephemeralEnqueuedExecution).not.toHaveBeenCalled();
      expect(actionsClient.bulkEnqueueExecution).not.toHaveBeenCalled();
      expect(alertingEventLogger.logAction).not.toHaveBeenCalled();
      expect(executorParams.logger.warn).toHaveBeenCalledWith(
        'Rule "1" skipped scheduling system action "action-id" because no connector adapter is configured'
      );
    });

    test('do not execute if the rule type does not support summarized alerts', async () => {
      const actionsParams = { myParams: 'test' };

      const executorParams = getSchedulerContext({
        ruleType: {
          ...ruleType,
          alerts: undefined,
        },
        rule: {
          ...defaultSchedulerContext.rule,
          systemActions: [
            {
              id: 'action-id',
              actionTypeId: '.test-system-action',
              params: actionsParams,
              uui: 'test',
            },
          ],
        },
      });

      const buildActionParams = jest.fn().mockReturnValue({ ...actionsParams, foo: 'bar' });

      executorParams.actionsClient.isSystemAction.mockReturnValue(true);
      executorParams.taskRunnerContext.kibanaBaseUrl = 'https://example.com';

      const actionScheduler = new ActionScheduler(getSchedulerContext(executorParams));

      const res = await actionScheduler.run(generateAlert({ id: 1 }));

      expect(res).toEqual({ throttledSummaryActions: {} });
      expect(buildActionParams).not.toHaveBeenCalled();
      expect(alertsClient.getSummarizedAlerts).not.toHaveBeenCalled();
      expect(actionsClient.ephemeralEnqueuedExecution).not.toHaveBeenCalled();
      expect(actionsClient.bulkEnqueueExecution).not.toHaveBeenCalled();
      expect(alertingEventLogger.logAction).not.toHaveBeenCalled();
    });

    test('do not execute system actions if the rule type does not support summarized alerts', async () => {
      const actionsParams = { myParams: 'test' };

      const executorParams = getSchedulerContext({
        rule: {
          ...defaultSchedulerContext.rule,
          systemActions: [
            {
              id: '1',
              actionTypeId: '.test-system-action',
              params: actionsParams,
              uui: 'test',
            },
          ],
        },
        ruleType: {
          ...defaultSchedulerContext.ruleType,
          alerts: undefined,
        },
      });

      const buildActionParams = jest.fn().mockReturnValue({ ...actionsParams, foo: 'bar' });

      executorParams.actionsClient.isSystemAction.mockReturnValue(true);
      executorParams.taskRunnerContext.kibanaBaseUrl = 'https://example.com';

      const actionScheduler = new ActionScheduler(getSchedulerContext(executorParams));

      await actionScheduler.run(generateAlert({ id: 1 }));

      expect(alertsClient.getSummarizedAlerts).not.toHaveBeenCalled();
      expect(buildActionParams).not.toHaveBeenCalled();
      expect(actionsClient.bulkEnqueueExecution).not.toHaveBeenCalled();
      expect(alertingEventLogger.logAction).not.toHaveBeenCalled();
    });
  });
});
