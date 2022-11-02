/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ExecutionHandler } from './execution_handler';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import {
  actionsClientMock,
  actionsMock,
  renderActionParameterTemplatesDefault,
} from '@kbn/actions-plugin/server/mocks';
import { KibanaRequest } from '@kbn/core/server';
import { InjectActionParamsOpts } from './inject_action_params';
import { NormalizedRuleType } from '../rule_type_registry';
import { ActionsCompletion, RuleTypeParams, RuleTypeState, SanitizedRule } from '../types';
import { RuleRunMetricsStore } from '../lib/rule_run_metrics_store';
import { alertingEventLoggerMock } from '../lib/alerting_event_logger/alerting_event_logger.mock';
import { TaskRunnerContext } from './task_runner_factory';
import { ConcreteTaskInstance } from '@kbn/task-manager-plugin/server';
import { Alert } from '../alert';
import { AlertInstanceState, AlertInstanceContext } from '../../common';
import { asSavedObjectExecutionSource } from '@kbn/actions-plugin/server';
import sinon from 'sinon';

jest.mock('./inject_action_params', () => ({
  injectActionParams: jest.fn(),
}));

const alertingEventLogger = alertingEventLoggerMock.create();
const actionsClient = actionsClientMock.create();
const mockActionsPlugin = actionsMock.createStart();
const apiKey = Buffer.from('123:abc').toString('base64');
const ruleType: NormalizedRuleType<
  RuleTypeParams,
  RuleTypeParams,
  RuleTypeState,
  AlertInstanceState,
  AlertInstanceContext,
  'default' | 'other-group',
  'recovered'
> = {
  id: 'test',
  name: 'Test',
  actionGroups: [
    { id: 'default', name: 'Default' },
    { id: 'recovered', name: 'Recovered' },
    { id: 'other-group', name: 'Other Group' },
  ],
  defaultActionGroupId: 'default',
  minimumLicenseRequired: 'basic',
  isExportable: true,
  recoveryActionGroup: {
    id: 'recovered',
    name: 'Recovered',
  },
  executor: jest.fn(),
  producer: 'alerts',
};
const rule = {
  id: '1',
  name: 'name-of-alert',
  tags: ['tag-A', 'tag-B'],
  mutedInstanceIds: [],
  params: {
    foo: true,
    contextVal: 'My other {{context.value}} goes here',
    stateVal: 'My other {{state.value}} goes here',
  },
  actions: [
    {
      id: '1',
      group: 'default',
      actionTypeId: 'test',
      params: {
        foo: true,
        contextVal: 'My {{context.value}} goes here',
        stateVal: 'My {{state.value}} goes here',
        alertVal: 'My {{alertId}} {{alertName}} {{spaceId}} {{tags}} {{alertInstanceId}} goes here',
      },
    },
  ],
} as unknown as SanitizedRule<RuleTypeParams>;

const defaultExecutionParams = {
  rule,
  ruleType,
  logger: loggingSystemMock.create().get(),
  taskRunnerContext: {
    actionsConfigMap: {
      default: {
        max: 1000,
      },
    },
    actionsPlugin: mockActionsPlugin,
  } as unknown as TaskRunnerContext,
  apiKey,
  ruleConsumer: 'rule-consumer',
  executionId: '5f6aa57d-3e22-484e-bae8-cbed868f4d28',
  ruleLabel: 'rule-label',
  request: {} as KibanaRequest,
  alertingEventLogger,
  taskInstance: {
    params: { spaceId: 'test1', alertId: '1' },
  } as unknown as ConcreteTaskInstance,
  actionsClient,
};

let ruleRunMetricsStore: RuleRunMetricsStore;
let clock: sinon.SinonFakeTimers;
type ActionGroup = 'default' | 'other-group' | 'recovered';
const generateAlert = ({
  id,
  group = 'default',
  context,
  state,
  scheduleActions = true,
}: {
  id: number;
  group?: ActionGroup;
  context?: AlertInstanceContext;
  state?: AlertInstanceState;
  scheduleActions?: boolean;
}) => {
  const alert = new Alert<
    AlertInstanceState,
    AlertInstanceContext,
    'default' | 'other-group' | 'recovered'
  >(String(id), {
    state: state || { test: true },
    meta: {
      lastScheduledActions: {
        date: new Date(),
        group,
      },
    },
  });
  if (scheduleActions) {
    alert.scheduleActions(group);
  }
  if (context) {
    alert.setContext(context);
  }
  return { [id]: alert };
};

// @ts-ignore
const generateExecutionParams = (params = {}) => {
  return {
    ...defaultExecutionParams,
    ...params,
    ruleRunMetricsStore,
  };
};

describe('Execution Handler', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    jest
      .requireMock('./inject_action_params')
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
  });
  beforeAll(() => {
    clock = sinon.useFakeTimers();
  });
  afterAll(() => clock.restore());

  test('enqueues execution per selected action', async () => {
    const executionHandler = new ExecutionHandler(generateExecutionParams());
    await executionHandler.run(generateAlert({ id: 1 }));

    expect(ruleRunMetricsStore.getNumberOfTriggeredActions()).toBe(1);
    expect(ruleRunMetricsStore.getNumberOfGeneratedActions()).toBe(1);
    expect(actionsClient.bulkEnqueueExecution).toHaveBeenCalledTimes(1);
    expect(actionsClient.bulkEnqueueExecution.mock.calls[0]).toMatchInlineSnapshot(`
    Array [
      Array [
        Object {
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

    expect(jest.requireMock('./inject_action_params').injectActionParams).toHaveBeenCalledWith({
      ruleId: '1',
      spaceId: 'test1',
      actionTypeId: 'test',
      actionParams: {
        alertVal: 'My 1 name-of-alert test1 tag-A,tag-B 1 goes here',
        contextVal: 'My  goes here',
        foo: true,
        stateVal: 'My  goes here',
      },
    });

    expect(ruleRunMetricsStore.getTriggeredActionsStatus()).toBe(ActionsCompletion.COMPLETE);
  });

  test(`doesn't call actionsPlugin.execute for disabled actionTypes`, async () => {
    // Mock two calls, one for check against actions[0] and the second for actions[1]
    mockActionsPlugin.isActionExecutable.mockReturnValueOnce(false);
    mockActionsPlugin.isActionTypeEnabled.mockReturnValueOnce(false);
    mockActionsPlugin.isActionTypeEnabled.mockReturnValueOnce(true);
    const executionHandler = new ExecutionHandler(
      generateExecutionParams({
        rule: {
          ...defaultExecutionParams.rule,
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

    await executionHandler.run(generateAlert({ id: 1 }));
    expect(ruleRunMetricsStore.getNumberOfTriggeredActions()).toBe(1);
    expect(ruleRunMetricsStore.getNumberOfGeneratedActions()).toBe(2);
    expect(actionsClient.bulkEnqueueExecution).toHaveBeenCalledTimes(1);
    expect(actionsClient.bulkEnqueueExecution).toHaveBeenCalledWith([
      {
        consumer: 'rule-consumer',
        id: '2',
        params: {
          foo: true,
          contextVal: 'My other  goes here',
          stateVal: 'My other  goes here',
        },
        source: asSavedObjectExecutionSource({
          id: '1',
          type: 'alert',
        }),
        relatedSavedObjects: [
          {
            id: '1',
            namespace: 'test1',
            type: 'alert',
            typeId: 'test',
          },
        ],
        spaceId: 'test1',
        apiKey,
        executionId: '5f6aa57d-3e22-484e-bae8-cbed868f4d28',
      },
    ]);
  });

  test('trow error error message when action type is disabled', async () => {
    mockActionsPlugin.preconfiguredActions = [];
    mockActionsPlugin.isActionExecutable.mockReturnValue(false);
    mockActionsPlugin.isActionTypeEnabled.mockReturnValue(false);
    const executionHandler = new ExecutionHandler(
      generateExecutionParams({
        rule: {
          ...defaultExecutionParams.rule,
          actions: [
            {
              id: '1',
              group: 'default',
              actionTypeId: '.slack',
              params: {
                foo: true,
              },
            },
            {
              id: '2',
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

    await executionHandler.run(generateAlert({ id: 2 }));
    expect(ruleRunMetricsStore.getNumberOfTriggeredActions()).toBe(0);
    expect(ruleRunMetricsStore.getNumberOfGeneratedActions()).toBe(2);
    expect(actionsClient.bulkEnqueueExecution).toHaveBeenCalledTimes(0);

    mockActionsPlugin.isActionExecutable.mockImplementation(() => true);
    const executionHandlerForPreconfiguredAction = new ExecutionHandler({
      ...defaultExecutionParams,
      ruleRunMetricsStore,
    });

    await executionHandlerForPreconfiguredAction.run(generateAlert({ id: 2 }));
    expect(actionsClient.bulkEnqueueExecution).toHaveBeenCalledTimes(1);
  });

  test('limits actionsPlugin.execute per action group', async () => {
    const executionHandler = new ExecutionHandler(generateExecutionParams());
    await executionHandler.run(generateAlert({ id: 2, group: 'other-group' }));
    expect(ruleRunMetricsStore.getNumberOfTriggeredActions()).toBe(0);
    expect(ruleRunMetricsStore.getNumberOfGeneratedActions()).toBe(0);
    expect(actionsClient.bulkEnqueueExecution).not.toHaveBeenCalled();
  });

  test('context attribute gets parameterized', async () => {
    const executionHandler = new ExecutionHandler(generateExecutionParams());
    await executionHandler.run(generateAlert({ id: 2, context: { value: 'context-val' } }));
    expect(ruleRunMetricsStore.getNumberOfTriggeredActions()).toBe(1);
    expect(ruleRunMetricsStore.getNumberOfGeneratedActions()).toBe(1);
    expect(actionsClient.bulkEnqueueExecution).toHaveBeenCalledTimes(1);
    expect(actionsClient.bulkEnqueueExecution.mock.calls[0]).toMatchInlineSnapshot(`
    Array [
      Array [
        Object {
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
    const executionHandler = new ExecutionHandler(generateExecutionParams());
    await executionHandler.run(generateAlert({ id: 2, state: { value: 'state-val' } }));
    expect(actionsClient.bulkEnqueueExecution).toHaveBeenCalledTimes(1);
    expect(actionsClient.bulkEnqueueExecution.mock.calls[0]).toMatchInlineSnapshot(`
    Array [
      Array [
        Object {
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
    const executionHandler = new ExecutionHandler(generateExecutionParams());
    await executionHandler.run(
      generateAlert({ id: 2, group: 'invalid-group' as 'default' | 'other-group' })
    );
    expect(defaultExecutionParams.logger.error).toHaveBeenCalledWith(
      'Invalid action group "invalid-group" for rule "test".'
    );

    expect(ruleRunMetricsStore.getNumberOfTriggeredActions()).toBe(0);
    expect(ruleRunMetricsStore.getNumberOfGeneratedActions()).toBe(0);
    expect(ruleRunMetricsStore.getTriggeredActionsStatus()).toBe(ActionsCompletion.COMPLETE);
  });

  test('Stops triggering actions when the number of total triggered actions is reached the number of max executable actions', async () => {
    const executionHandler = new ExecutionHandler(
      generateExecutionParams({
        ...defaultExecutionParams,
        taskRunnerContext: {
          ...defaultExecutionParams.taskRunnerContext,
          actionsConfigMap: {
            default: {
              max: 2,
            },
          },
        },
        rule: {
          ...defaultExecutionParams.rule,
          actions: [
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
          ],
        },
      })
    );
    await executionHandler.run(generateAlert({ id: 2, state: { value: 'state-val' } }));

    expect(ruleRunMetricsStore.getNumberOfTriggeredActions()).toBe(2);
    expect(ruleRunMetricsStore.getNumberOfGeneratedActions()).toBe(3);
    expect(ruleRunMetricsStore.getTriggeredActionsStatus()).toBe(ActionsCompletion.PARTIAL);
    expect(defaultExecutionParams.logger.debug).toHaveBeenCalledTimes(1);
    expect(actionsClient.bulkEnqueueExecution).toHaveBeenCalledTimes(1);
  });

  test('Skips triggering actions for a specific action type when it reaches the limit for that specific action type', async () => {
    const executionHandler = new ExecutionHandler(
      generateExecutionParams({
        ...defaultExecutionParams,
        taskRunnerContext: {
          ...defaultExecutionParams.taskRunnerContext,
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
          ...defaultExecutionParams.rule,
          actions: [
            ...defaultExecutionParams.rule.actions,
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
          ],
        },
      })
    );
    await executionHandler.run(generateAlert({ id: 2, state: { value: 'state-val' } }));

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

  test('schedules alerts with recovered actions', async () => {
    const executionHandler = new ExecutionHandler(
      generateExecutionParams({
        ...defaultExecutionParams,
        rule: {
          ...defaultExecutionParams.rule,
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
                  'My {{alertId}} {{alertName}} {{spaceId}} {{tags}} {{alertInstanceId}} goes here',
              },
            },
          ],
        },
      })
    );
    await executionHandler.run(generateAlert({ id: 1, scheduleActions: false }), true);
    expect(actionsClient.bulkEnqueueExecution).toHaveBeenCalledTimes(1);
    expect(actionsClient.bulkEnqueueExecution.mock.calls[0]).toMatchInlineSnapshot(`
    Array [
      Array [
        Object {
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
    const executionHandler = new ExecutionHandler(
      generateExecutionParams({
        ...defaultExecutionParams,
        rule: {
          ...defaultExecutionParams.rule,
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
                  'My {{alertId}} {{alertName}} {{spaceId}} {{tags}} {{alertInstanceId}} goes here',
              },
            },
          ],
        },
      })
    );
    await executionHandler.run(generateAlert({ id: 1, scheduleActions: false }), true);

    expect(actionsClient.bulkEnqueueExecution).toHaveBeenCalledTimes(0);
    expect(defaultExecutionParams.logger.debug).nthCalledWith(
      1,
      `skipping scheduling of actions for '1' in rule ${defaultExecutionParams.ruleLabel}: rule is muted`
    );
  });

  test('does not schedule active alerts that are throttled', async () => {
    const executionHandler = new ExecutionHandler(
      generateExecutionParams({
        ...defaultExecutionParams,
        rule: {
          ...defaultExecutionParams.rule,
          throttle: '1m',
        },
      })
    );
    await executionHandler.run(generateAlert({ id: 1 }));

    clock.tick(30000);

    expect(actionsClient.bulkEnqueueExecution).toHaveBeenCalledTimes(0);
    expect(defaultExecutionParams.logger.debug).nthCalledWith(
      1,
      `skipping scheduling of actions for '1' in rule ${defaultExecutionParams.ruleLabel}: rule is throttled`
    );
  });

  test('does not schedule active alerts that are muted', async () => {
    const executionHandler = new ExecutionHandler(
      generateExecutionParams({
        ...defaultExecutionParams,
        rule: {
          ...defaultExecutionParams.rule,
          mutedInstanceIds: ['1'],
        },
      })
    );
    await executionHandler.run(generateAlert({ id: 1 }));

    expect(actionsClient.bulkEnqueueExecution).toHaveBeenCalledTimes(0);
    expect(defaultExecutionParams.logger.debug).nthCalledWith(
      1,
      `skipping scheduling of actions for '1' in rule ${defaultExecutionParams.ruleLabel}: rule is muted`
    );
  });
});
