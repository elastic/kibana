/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createExecutionHandler } from './create_execution_handler';
import { CreateExecutionHandlerOptions } from './types';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import {
  actionsClientMock,
  actionsMock,
  renderActionParameterTemplatesDefault,
} from '@kbn/actions-plugin/server/mocks';
import { KibanaRequest } from '@kbn/core/server';
import { asSavedObjectExecutionSource } from '@kbn/actions-plugin/server';
import { InjectActionParamsOpts } from './inject_action_params';
import { NormalizedRuleType } from '../rule_type_registry';
import {
  ActionsCompletion,
  AlertInstanceContext,
  AlertInstanceState,
  RuleTypeParams,
  RuleTypeState,
} from '../types';
import { RuleRunMetricsStore } from '../lib/rule_run_metrics_store';
import { alertingEventLoggerMock } from '../lib/alerting_event_logger/alerting_event_logger.mock';

jest.mock('./inject_action_params', () => ({
  injectActionParams: jest.fn(),
}));

const alertingEventLogger = alertingEventLoggerMock.create();

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

const actionsClient = actionsClientMock.create();

const mockActionsPlugin = actionsMock.createStart();
const createExecutionHandlerParams: jest.Mocked<
  CreateExecutionHandlerOptions<
    RuleTypeParams,
    RuleTypeParams,
    RuleTypeState,
    AlertInstanceState,
    AlertInstanceContext,
    'default' | 'other-group',
    'recovered'
  >
> = {
  actionsPlugin: mockActionsPlugin,
  spaceId: 'test1',
  ruleId: '1',
  ruleName: 'name-of-alert',
  ruleConsumer: 'rule-consumer',
  executionId: '5f6aa57d-3e22-484e-bae8-cbed868f4d28',
  tags: ['tag-A', 'tag-B'],
  apiKey: 'MTIzOmFiYw==',
  kibanaBaseUrl: 'http://localhost:5601',
  ruleType,
  logger: loggingSystemMock.create().get(),
  alertingEventLogger,
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
  request: {} as KibanaRequest,
  ruleParams: {
    foo: true,
    contextVal: 'My other {{context.value}} goes here',
    stateVal: 'My other {{state.value}} goes here',
  },
  supportsEphemeralTasks: false,
  maxEphemeralActionsPerRule: 10,
  actionsConfigMap: {
    default: {
      max: 1000,
    },
  },
};
let ruleRunMetricsStore: RuleRunMetricsStore;

describe('Create Execution Handler', () => {
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

  test('enqueues execution per selected action', async () => {
    const executionHandler = createExecutionHandler(createExecutionHandlerParams);
    await executionHandler({
      actionGroup: 'default',
      state: {},
      context: {},
      alertId: '2',
      ruleRunMetricsStore,
    });
    expect(ruleRunMetricsStore.getNumberOfTriggeredActions()).toBe(1);
    expect(ruleRunMetricsStore.getNumberOfGeneratedActions()).toBe(1);
    expect(mockActionsPlugin.getActionsClientWithRequest).toHaveBeenCalledWith(
      createExecutionHandlerParams.request
    );
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
      alertId: '2',
      alertGroup: 'default',
    });

    expect(jest.requireMock('./inject_action_params').injectActionParams).toHaveBeenCalledWith({
      ruleId: '1',
      spaceId: 'test1',
      actionTypeId: 'test',
      actionParams: {
        alertVal: 'My 1 name-of-alert test1 tag-A,tag-B 2 goes here',
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
    const executionHandler = createExecutionHandler({
      ...createExecutionHandlerParams,
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
    });
    await executionHandler({
      actionGroup: 'default',
      state: {},
      context: {},
      alertId: '2',
      ruleRunMetricsStore,
    });
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
        apiKey: createExecutionHandlerParams.apiKey,
        executionId: '5f6aa57d-3e22-484e-bae8-cbed868f4d28',
      },
    ]);
  });

  test('trow error error message when action type is disabled', async () => {
    mockActionsPlugin.preconfiguredActions = [];
    mockActionsPlugin.isActionExecutable.mockReturnValue(false);
    mockActionsPlugin.isActionTypeEnabled.mockReturnValue(false);
    const executionHandler = createExecutionHandler({
      ...createExecutionHandlerParams,
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
    });

    await executionHandler({
      actionGroup: 'default',
      state: {},
      context: {},
      alertId: '2',
      ruleRunMetricsStore,
    });
    expect(ruleRunMetricsStore.getNumberOfTriggeredActions()).toBe(0);
    expect(ruleRunMetricsStore.getNumberOfGeneratedActions()).toBe(2);
    expect(actionsClient.bulkEnqueueExecution).toHaveBeenCalledTimes(0);

    mockActionsPlugin.isActionExecutable.mockImplementation(() => true);
    const executionHandlerForPreconfiguredAction = createExecutionHandler({
      ...createExecutionHandlerParams,
      actions: [...createExecutionHandlerParams.actions],
    });
    await executionHandlerForPreconfiguredAction({
      actionGroup: 'default',
      state: {},
      context: {},
      alertId: '2',
      ruleRunMetricsStore,
    });
    expect(actionsClient.bulkEnqueueExecution).toHaveBeenCalledTimes(1);
  });

  test('limits actionsPlugin.execute per action group', async () => {
    const executionHandler = createExecutionHandler(createExecutionHandlerParams);
    await executionHandler({
      actionGroup: 'other-group',
      state: {},
      context: {},
      alertId: '2',
      ruleRunMetricsStore,
    });
    expect(ruleRunMetricsStore.getNumberOfTriggeredActions()).toBe(0);
    expect(ruleRunMetricsStore.getNumberOfGeneratedActions()).toBe(0);
    expect(actionsClient.bulkEnqueueExecution).not.toHaveBeenCalled();
  });

  test('context attribute gets parameterized', async () => {
    const executionHandler = createExecutionHandler(createExecutionHandlerParams);
    await executionHandler({
      actionGroup: 'default',
      context: { value: 'context-val' },
      state: {},
      alertId: '2',
      ruleRunMetricsStore,
    });
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
    const executionHandler = createExecutionHandler(createExecutionHandlerParams);
    await executionHandler({
      actionGroup: 'default',
      context: {},
      state: { value: 'state-val' },
      alertId: '2',
      ruleRunMetricsStore,
    });
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
    const executionHandler = createExecutionHandler(createExecutionHandlerParams);
    await executionHandler({
      // we have to trick the compiler as this is an invalid type and this test checks whether we
      // enforce this at runtime as well as compile time
      actionGroup: 'invalid-group' as 'default' | 'other-group',
      context: {},
      state: {},
      alertId: '2',
      ruleRunMetricsStore,
    });
    expect(createExecutionHandlerParams.logger.error).toHaveBeenCalledWith(
      'Invalid action group "invalid-group" for rule "test".'
    );

    expect(ruleRunMetricsStore.getNumberOfTriggeredActions()).toBe(0);
    expect(ruleRunMetricsStore.getNumberOfGeneratedActions()).toBe(0);
    expect(ruleRunMetricsStore.getTriggeredActionsStatus()).toBe(ActionsCompletion.COMPLETE);
  });

  test('Stops triggering actions when the number of total triggered actions is reached the number of max executable actions', async () => {
    const executionHandler = createExecutionHandler({
      ...createExecutionHandlerParams,
      actionsConfigMap: {
        default: {
          max: 2,
        },
      },
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
    });

    ruleRunMetricsStore = new RuleRunMetricsStore();

    await executionHandler({
      actionGroup: 'default',
      context: {},
      state: { value: 'state-val' },
      alertId: '2',
      ruleRunMetricsStore,
    });

    expect(ruleRunMetricsStore.getNumberOfTriggeredActions()).toBe(2);
    expect(ruleRunMetricsStore.getNumberOfGeneratedActions()).toBe(3);
    expect(ruleRunMetricsStore.getTriggeredActionsStatus()).toBe(ActionsCompletion.PARTIAL);
    expect(createExecutionHandlerParams.logger.debug).toHaveBeenCalledTimes(1);
    expect(actionsClient.bulkEnqueueExecution).toHaveBeenCalledTimes(1);
  });

  test('Skips triggering actions for a specific action type when it reaches the limit for that specific action type', async () => {
    const executionHandler = createExecutionHandler({
      ...createExecutionHandlerParams,
      actionsConfigMap: {
        default: {
          max: 4,
        },
        'test-action-type-id': {
          max: 1,
        },
      },
      actions: [
        ...createExecutionHandlerParams.actions,
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
    });

    ruleRunMetricsStore = new RuleRunMetricsStore();

    await executionHandler({
      actionGroup: 'default',
      context: {},
      state: { value: 'state-val' },
      alertId: '2',
      ruleRunMetricsStore,
    });

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
});
