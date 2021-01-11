/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createExecutionHandler, CreateExecutionHandlerOptions } from './create_execution_handler';
import { loggingSystemMock } from '../../../../../src/core/server/mocks';
import {
  actionsMock,
  actionsClientMock,
  renderActionParameterTemplatesDefault,
} from '../../../actions/server/mocks';
import { eventLoggerMock } from '../../../event_log/server/event_logger.mock';
import { KibanaRequest } from 'kibana/server';
import { asSavedObjectExecutionSource } from '../../../actions/server';
import { InjectActionParamsOpts } from './inject_action_params';
import { NormalizedAlertType } from '../alert_type_registry';
import {
  AlertTypeParams,
  AlertTypeState,
  AlertInstanceState,
  AlertInstanceContext,
} from '../types';

jest.mock('./inject_action_params', () => ({
  injectActionParams: jest.fn(),
}));

const alertType: NormalizedAlertType<
  AlertTypeParams,
  AlertTypeState,
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
  recoveryActionGroup: {
    id: 'recovered',
    name: 'Recovered',
  },
  executor: jest.fn(),
  producer: 'alerts',
};

const actionsClient = actionsClientMock.create();

const mockActionsPlugin = actionsMock.createStart();
const mockEventLogger = eventLoggerMock.create();
const createExecutionHandlerParams: jest.Mocked<
  CreateExecutionHandlerOptions<
    AlertTypeParams,
    AlertTypeState,
    AlertInstanceState,
    AlertInstanceContext,
    'default' | 'other-group',
    'recovered'
  >
> = {
  actionsPlugin: mockActionsPlugin,
  spaceId: 'default',
  alertId: '1',
  alertName: 'name-of-alert',
  tags: ['tag-A', 'tag-B'],
  apiKey: 'MTIzOmFiYw==',
  alertType,
  logger: loggingSystemMock.create().get(),
  eventLogger: mockEventLogger,
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
  alertParams: {
    foo: true,
    contextVal: 'My other {{context.value}} goes here',
    stateVal: 'My other {{state.value}} goes here',
  },
};

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
});

test('enqueues execution per selected action', async () => {
  const executionHandler = createExecutionHandler(createExecutionHandlerParams);
  await executionHandler({
    actionGroup: 'default',
    state: {},
    context: {},
    alertInstanceId: '2',
  });
  expect(mockActionsPlugin.getActionsClientWithRequest).toHaveBeenCalledWith(
    createExecutionHandlerParams.request
  );
  expect(actionsClient.enqueueExecution).toHaveBeenCalledTimes(1);
  expect(actionsClient.enqueueExecution.mock.calls[0]).toMatchInlineSnapshot(`
    Array [
      Object {
        "apiKey": "MTIzOmFiYw==",
        "id": "1",
        "params": Object {
          "alertVal": "My 1 name-of-alert default tag-A,tag-B 2 goes here",
          "contextVal": "My  goes here",
          "foo": true,
          "stateVal": "My  goes here",
        },
        "source": Object {
          "source": Object {
            "id": "1",
            "type": "alert",
          },
          "type": "SAVED_OBJECT",
        },
        "spaceId": "default",
      },
    ]
  `);

  expect(mockEventLogger.logEvent).toHaveBeenCalledTimes(1);
  expect(mockEventLogger.logEvent.mock.calls).toMatchInlineSnapshot(`
    Array [
      Array [
        Object {
          "event": Object {
            "action": "execute-action",
          },
          "kibana": Object {
            "alerting": Object {
              "action_group_id": "default",
              "action_subgroup": undefined,
              "instance_id": "2",
            },
            "saved_objects": Array [
              Object {
                "id": "1",
                "rel": "primary",
                "type": "alert",
              },
              Object {
                "id": "1",
                "type": "action",
              },
            ],
          },
          "message": "alert: test:1: 'name-of-alert' instanceId: '2' scheduled actionGroup: 'default' action: test:1",
        },
      ],
    ]
  `);

  expect(jest.requireMock('./inject_action_params').injectActionParams).toHaveBeenCalledWith({
    alertId: '1',
    actionTypeId: 'test',
    actionParams: {
      alertVal: 'My 1 name-of-alert default tag-A,tag-B 2 goes here',
      contextVal: 'My  goes here',
      foo: true,
      stateVal: 'My  goes here',
    },
  });
});

test(`doesn't call actionsPlugin.execute for disabled actionTypes`, async () => {
  // Mock two calls, one for check against actions[0] and the second for actions[1]
  mockActionsPlugin.isActionExecutable.mockReturnValueOnce(false);
  mockActionsPlugin.isActionTypeEnabled.mockReturnValueOnce(false);
  mockActionsPlugin.isActionTypeEnabled.mockReturnValueOnce(true);
  const executionHandler = createExecutionHandler({
    ...createExecutionHandlerParams,
    actions: [
      ...createExecutionHandlerParams.actions,
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
    alertInstanceId: '2',
  });
  expect(actionsClient.enqueueExecution).toHaveBeenCalledTimes(1);
  expect(actionsClient.enqueueExecution).toHaveBeenCalledWith({
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
    spaceId: 'default',
    apiKey: createExecutionHandlerParams.apiKey,
  });
});

test('trow error error message when action type is disabled', async () => {
  mockActionsPlugin.preconfiguredActions = [];
  mockActionsPlugin.isActionExecutable.mockReturnValue(false);
  mockActionsPlugin.isActionTypeEnabled.mockReturnValue(false);
  const executionHandler = createExecutionHandler({
    ...createExecutionHandlerParams,
    actions: [
      ...createExecutionHandlerParams.actions,
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
    alertInstanceId: '2',
  });

  expect(actionsClient.enqueueExecution).toHaveBeenCalledTimes(0);

  mockActionsPlugin.isActionExecutable.mockImplementation(() => true);
  const executionHandlerForPreconfiguredAction = createExecutionHandler({
    ...createExecutionHandlerParams,
    actions: [...createExecutionHandlerParams.actions],
  });
  await executionHandlerForPreconfiguredAction({
    actionGroup: 'default',
    state: {},
    context: {},
    alertInstanceId: '2',
  });
  expect(actionsClient.enqueueExecution).toHaveBeenCalledTimes(1);
});

test('limits actionsPlugin.execute per action group', async () => {
  const executionHandler = createExecutionHandler(createExecutionHandlerParams);
  await executionHandler({
    actionGroup: 'other-group',
    state: {},
    context: {},
    alertInstanceId: '2',
  });
  expect(actionsClient.enqueueExecution).not.toHaveBeenCalled();
});

test('context attribute gets parameterized', async () => {
  const executionHandler = createExecutionHandler(createExecutionHandlerParams);
  await executionHandler({
    actionGroup: 'default',
    context: { value: 'context-val' },
    state: {},
    alertInstanceId: '2',
  });
  expect(actionsClient.enqueueExecution).toHaveBeenCalledTimes(1);
  expect(actionsClient.enqueueExecution.mock.calls[0]).toMatchInlineSnapshot(`
    Array [
      Object {
        "apiKey": "MTIzOmFiYw==",
        "id": "1",
        "params": Object {
          "alertVal": "My 1 name-of-alert default tag-A,tag-B 2 goes here",
          "contextVal": "My context-val goes here",
          "foo": true,
          "stateVal": "My  goes here",
        },
        "source": Object {
          "source": Object {
            "id": "1",
            "type": "alert",
          },
          "type": "SAVED_OBJECT",
        },
        "spaceId": "default",
      },
    ]
  `);
});

test('state attribute gets parameterized', async () => {
  const executionHandler = createExecutionHandler(createExecutionHandlerParams);
  await executionHandler({
    actionGroup: 'default',
    context: {},
    state: { value: 'state-val' },
    alertInstanceId: '2',
  });
  expect(actionsClient.enqueueExecution).toHaveBeenCalledTimes(1);
  expect(actionsClient.enqueueExecution.mock.calls[0]).toMatchInlineSnapshot(`
    Array [
      Object {
        "apiKey": "MTIzOmFiYw==",
        "id": "1",
        "params": Object {
          "alertVal": "My 1 name-of-alert default tag-A,tag-B 2 goes here",
          "contextVal": "My  goes here",
          "foo": true,
          "stateVal": "My state-val goes here",
        },
        "source": Object {
          "source": Object {
            "id": "1",
            "type": "alert",
          },
          "type": "SAVED_OBJECT",
        },
        "spaceId": "default",
      },
    ]
  `);
});

test(`logs an error when action group isn't part of actionGroups available for the alertType`, async () => {
  const executionHandler = createExecutionHandler(createExecutionHandlerParams);
  const result = await executionHandler({
    // we have to trick the compiler as this is an invalid type and this test checks whether we
    // enforce this at runtime as well as compile time
    actionGroup: 'invalid-group' as 'default' | 'other-group',
    context: {},
    state: {},
    alertInstanceId: '2',
  });
  expect(result).toBeUndefined();
  expect(createExecutionHandlerParams.logger.error).toHaveBeenCalledWith(
    'Invalid action group "invalid-group" for alert "test".'
  );
});
