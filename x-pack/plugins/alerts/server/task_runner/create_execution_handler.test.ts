/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AlertType } from '../types';
import { createExecutionHandler } from './create_execution_handler';
import { loggingSystemMock } from '../../../../../src/core/server/mocks';
import { actionsMock, actionsClientMock } from '../../../actions/server/mocks';
import { eventLoggerMock } from '../../../event_log/server/event_logger.mock';
import { KibanaRequest } from 'kibana/server';

const alertType: AlertType = {
  id: 'test',
  name: 'Test',
  actionGroups: [
    { id: 'default', name: 'Default' },
    { id: 'other-group', name: 'Other Group' },
  ],
  defaultActionGroupId: 'default',
  executor: jest.fn(),
  producer: 'alerting',
};

const actionsClient = actionsClientMock.create();
const createExecutionHandlerParams = {
  actionsPlugin: actionsMock.createStart(),
  spaceId: 'default',
  alertId: '1',
  alertName: 'name-of-alert',
  tags: ['tag-A', 'tag-B'],
  apiKey: 'MTIzOmFiYw==',
  spaceIdToNamespace: jest.fn().mockReturnValue(undefined),
  getBasePath: jest.fn().mockReturnValue(undefined),
  alertType,
  logger: loggingSystemMock.create().get(),
  eventLogger: eventLoggerMock.create(),
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
};

beforeEach(() => {
  jest.resetAllMocks();
  createExecutionHandlerParams.actionsPlugin.isActionTypeEnabled.mockReturnValue(true);
  createExecutionHandlerParams.actionsPlugin.isActionExecutable.mockReturnValue(true);
  createExecutionHandlerParams.actionsPlugin.getActionsClientWithRequest.mockResolvedValue(
    actionsClient
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
  expect(
    createExecutionHandlerParams.actionsPlugin.getActionsClientWithRequest
  ).toHaveBeenCalledWith(createExecutionHandlerParams.request);
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
            "spaceId": "default",
          },
        ]
    `);

  const eventLogger = createExecutionHandlerParams.eventLogger;
  expect(eventLogger.logEvent).toHaveBeenCalledTimes(1);
  expect(eventLogger.logEvent.mock.calls).toMatchInlineSnapshot(`
    Array [
      Array [
        Object {
          "event": Object {
            "action": "execute-action",
          },
          "kibana": Object {
            "alerting": Object {
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
});

test(`doesn't call actionsPlugin.execute for disabled actionTypes`, async () => {
  // Mock two calls, one for check against actions[0] and the second for actions[1]
  createExecutionHandlerParams.actionsPlugin.isActionExecutable.mockReturnValueOnce(false);
  createExecutionHandlerParams.actionsPlugin.isActionTypeEnabled.mockReturnValueOnce(false);
  createExecutionHandlerParams.actionsPlugin.isActionTypeEnabled.mockReturnValueOnce(true);
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
    spaceId: 'default',
    apiKey: createExecutionHandlerParams.apiKey,
  });
});

test('trow error error message when action type is disabled', async () => {
  createExecutionHandlerParams.actionsPlugin.preconfiguredActions = [];
  createExecutionHandlerParams.actionsPlugin.isActionExecutable.mockReturnValue(false);
  createExecutionHandlerParams.actionsPlugin.isActionTypeEnabled.mockReturnValue(false);
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

  createExecutionHandlerParams.actionsPlugin.isActionExecutable.mockImplementation(() => true);
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
            "spaceId": "default",
          },
        ]
    `);
});

test(`logs an error when action group isn't part of actionGroups available for the alertType`, async () => {
  const executionHandler = createExecutionHandler(createExecutionHandlerParams);
  const result = await executionHandler({
    actionGroup: 'invalid-group',
    context: {},
    state: {},
    alertInstanceId: '2',
  });
  expect(result).toBeUndefined();
  expect(createExecutionHandlerParams.logger.error).toHaveBeenCalledWith(
    'Invalid action group "invalid-group" for alert "test".'
  );
});
