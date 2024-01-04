/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KibanaRequest } from '@kbn/core/server';
import { schema } from '@kbn/config-schema';
import { ActionExecutor } from './action_executor';
import { actionTypeRegistryMock } from '../action_type_registry.mock';
import { encryptedSavedObjectsMock } from '@kbn/encrypted-saved-objects-plugin/server/mocks';
import { httpServerMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { eventLoggerMock } from '@kbn/event-log-plugin/server/mocks';
import { spacesServiceMock } from '@kbn/spaces-plugin/server/spaces_service/spaces_service.mock';
import { ActionType } from '../types';
import { actionsAuthorizationMock, actionsMock } from '../mocks';
import {
  asHttpRequestExecutionSource,
  asSavedObjectExecutionSource,
} from './action_execution_source';
import { securityMock } from '@kbn/security-plugin/server/mocks';
import { finished } from 'stream/promises';
import { PassThrough } from 'stream';
import { SecurityConnectorFeatureId } from '../../common';
import { TaskErrorSource } from '@kbn/task-manager-plugin/common';
import { getErrorSource } from '@kbn/task-manager-plugin/server/task_running';

const actionExecutor = new ActionExecutor({ isESOCanEncrypt: true });
const services = actionsMock.createServices();

const encryptedSavedObjectsClient = encryptedSavedObjectsMock.createClient();
const actionTypeRegistry = actionTypeRegistryMock.create();
const eventLogger = eventLoggerMock.create();

const executeParams = {
  actionId: '1',
  params: {
    foo: true,
  },
  executionId: '123abc',
  request: {} as KibanaRequest,
  actionExecutionId: '2',
};

const spacesMock = spacesServiceMock.createStartContract();
const loggerMock: ReturnType<typeof loggingSystemMock.createLogger> =
  loggingSystemMock.createLogger();
const securityMockStart = securityMock.createStart();

const authorizationMock = actionsAuthorizationMock.create();
const getActionsAuthorizationWithRequest = jest.fn();

actionExecutor.initialize({
  logger: loggerMock,
  spaces: spacesMock,
  security: securityMockStart,
  getServices: () => services,
  actionTypeRegistry,
  encryptedSavedObjectsClient,
  eventLogger,
  getActionsAuthorizationWithRequest,
  inMemoryConnectors: [
    {
      id: 'preconfigured',
      name: 'Preconfigured',
      actionTypeId: 'test',
      config: {
        bar: 'preconfigured',
      },
      secrets: {
        apiKey: 'abc',
      },
      isPreconfigured: true,
      isDeprecated: false,
      isSystemAction: false,
    },
    {
      actionTypeId: '.cases',
      config: {},
      id: 'system-connector-.cases',
      name: 'System action: .cases',
      secrets: {},
      isPreconfigured: false,
      isDeprecated: false,
      isSystemAction: true,
    },
  ],
});

beforeEach(() => {
  jest.resetAllMocks();
  spacesMock.getSpaceId.mockReturnValue('some-namespace');
  loggerMock.get.mockImplementation(() => loggerMock);
  const mockRealm = { name: 'default_native', type: 'native' };
  securityMockStart.authc.getCurrentUser.mockImplementation(() => ({
    authentication_realm: mockRealm,
    authentication_provider: mockRealm,
    authentication_type: 'realm',
    lookup_realm: mockRealm,
    elastic_cloud_user: true,
    enabled: true,
    profile_uid: '123',
    roles: ['superuser'],
    username: 'coolguy',
  }));

  getActionsAuthorizationWithRequest.mockReturnValue(authorizationMock);
});

test('successfully executes', async () => {
  const actionType: jest.Mocked<ActionType> = {
    id: 'test',
    name: 'Test',
    minimumLicenseRequired: 'basic',
    supportedFeatureIds: ['alerting'],
    validate: {
      config: { schema: schema.object({ bar: schema.boolean() }) },
      secrets: { schema: schema.object({ baz: schema.boolean() }) },
      params: { schema: schema.object({ foo: schema.boolean() }) },
    },
    executor: jest.fn(),
  };
  const actionSavedObject = {
    id: '1',
    type: 'action',
    attributes: {
      name: '1',
      actionTypeId: 'test',
      config: {
        bar: true,
      },
      secrets: {
        baz: true,
      },
      isMissingSecrets: false,
    },
    references: [],
  };
  encryptedSavedObjectsClient.getDecryptedAsInternalUser.mockResolvedValueOnce(actionSavedObject);
  actionTypeRegistry.get.mockReturnValueOnce(actionType);
  await actionExecutor.execute(executeParams);

  expect(encryptedSavedObjectsClient.getDecryptedAsInternalUser).toHaveBeenCalledWith(
    'action',
    '1',
    { namespace: 'some-namespace' }
  );

  expect(actionTypeRegistry.get).toHaveBeenCalledWith('test');
  expect(actionTypeRegistry.isActionExecutable).toHaveBeenCalledWith('1', 'test', {
    notifyUsage: true,
  });

  expect(actionType.executor).toHaveBeenCalledWith({
    actionId: '1',
    services: expect.anything(),
    config: {
      bar: true,
    },
    secrets: {
      baz: true,
    },
    params: { foo: true },
    logger: loggerMock,
  });

  expect(loggerMock.debug).toBeCalledWith('executing action test:1: 1');
  expect(eventLogger.logEvent.mock.calls).toMatchInlineSnapshot(`
    Array [
      Array [
        Object {
          "event": Object {
            "action": "execute-start",
            "kind": "action",
          },
          "kibana": Object {
            "action": Object {
              "execution": Object {
                "uuid": "2",
              },
              "id": "1",
              "name": "1",
            },
            "alert": Object {
              "rule": Object {
                "execution": Object {
                  "uuid": "123abc",
                },
              },
            },
            "saved_objects": Array [
              Object {
                "id": "1",
                "namespace": "some-namespace",
                "rel": "primary",
                "type": "action",
                "type_id": "test",
              },
            ],
            "space_ids": Array [
              "some-namespace",
            ],
          },
          "message": "action started: test:1: 1",
        },
      ],
      Array [
        Object {
          "event": Object {
            "action": "execute",
            "kind": "action",
            "outcome": "success",
          },
          "kibana": Object {
            "action": Object {
              "execution": Object {
                "uuid": "2",
              },
              "id": "1",
              "name": "1",
            },
            "alert": Object {
              "rule": Object {
                "execution": Object {
                  "uuid": "123abc",
                },
              },
            },
            "saved_objects": Array [
              Object {
                "id": "1",
                "namespace": "some-namespace",
                "rel": "primary",
                "type": "action",
                "type_id": "test",
              },
            ],
            "space_ids": Array [
              "some-namespace",
            ],
          },
          "message": "action executed: test:1: 1",
          "user": Object {
            "id": "123",
            "name": "coolguy",
          },
        },
      ],
    ]
  `);
});

test('successfully executes when http_request source is specified', async () => {
  const actionType: jest.Mocked<ActionType> = {
    id: 'test',
    name: 'Test',
    minimumLicenseRequired: 'basic',
    supportedFeatureIds: ['alerting'],
    validate: {
      config: { schema: schema.object({ bar: schema.boolean() }) },
      secrets: { schema: schema.object({ baz: schema.boolean() }) },
      params: { schema: schema.object({ foo: schema.boolean() }) },
    },
    executor: jest.fn(),
  };
  const actionSavedObject = {
    id: '1',
    type: 'action',
    attributes: {
      name: '1',
      actionTypeId: 'test',
      config: {
        bar: true,
      },
      secrets: {
        baz: true,
      },
      isMissingSecrets: false,
    },
    references: [],
  };
  encryptedSavedObjectsClient.getDecryptedAsInternalUser.mockResolvedValueOnce(actionSavedObject);
  actionTypeRegistry.get.mockReturnValueOnce(actionType);
  await actionExecutor.execute({
    ...executeParams,
    source: asHttpRequestExecutionSource(httpServerMock.createKibanaRequest()),
  });

  expect(encryptedSavedObjectsClient.getDecryptedAsInternalUser).toHaveBeenCalledWith(
    'action',
    '1',
    { namespace: 'some-namespace' }
  );

  expect(actionTypeRegistry.get).toHaveBeenCalledWith('test');
  expect(actionTypeRegistry.isActionExecutable).toHaveBeenCalledWith('1', 'test', {
    notifyUsage: true,
  });

  expect(actionType.executor).toHaveBeenCalledWith({
    actionId: '1',
    services: expect.anything(),
    config: {
      bar: true,
    },
    secrets: {
      baz: true,
    },
    params: { foo: true },
    logger: loggerMock,
    source: {
      source: expect.anything(),
      type: 'HTTP_REQUEST',
    },
  });

  expect(loggerMock.debug).toBeCalledWith('executing action test:1: 1');
  expect(eventLogger.logEvent.mock.calls).toMatchInlineSnapshot(`
    Array [
      Array [
        Object {
          "event": Object {
            "action": "execute-start",
            "kind": "action",
          },
          "kibana": Object {
            "action": Object {
              "execution": Object {
                "source": "http_request",
                "uuid": "2",
              },
              "id": "1",
              "name": "1",
            },
            "alert": Object {
              "rule": Object {
                "execution": Object {
                  "uuid": "123abc",
                },
              },
            },
            "saved_objects": Array [
              Object {
                "id": "1",
                "namespace": "some-namespace",
                "rel": "primary",
                "type": "action",
                "type_id": "test",
              },
            ],
            "space_ids": Array [
              "some-namespace",
            ],
          },
          "message": "action started: test:1: 1",
        },
      ],
      Array [
        Object {
          "event": Object {
            "action": "execute",
            "kind": "action",
            "outcome": "success",
          },
          "kibana": Object {
            "action": Object {
              "execution": Object {
                "source": "http_request",
                "uuid": "2",
              },
              "id": "1",
              "name": "1",
            },
            "alert": Object {
              "rule": Object {
                "execution": Object {
                  "uuid": "123abc",
                },
              },
            },
            "saved_objects": Array [
              Object {
                "id": "1",
                "namespace": "some-namespace",
                "rel": "primary",
                "type": "action",
                "type_id": "test",
              },
            ],
            "space_ids": Array [
              "some-namespace",
            ],
          },
          "message": "action executed: test:1: 1",
          "user": Object {
            "id": "123",
            "name": "coolguy",
          },
        },
      ],
    ]
  `);
});

test('successfully executes when saved_object source is specified', async () => {
  const actionType: jest.Mocked<ActionType> = {
    id: 'test',
    name: 'Test',
    minimumLicenseRequired: 'basic',
    supportedFeatureIds: ['alerting'],
    validate: {
      config: { schema: schema.object({ bar: schema.boolean() }) },
      secrets: { schema: schema.object({ baz: schema.boolean() }) },
      params: { schema: schema.object({ foo: schema.boolean() }) },
    },
    executor: jest.fn(),
  };
  const actionSavedObject = {
    id: '1',
    type: 'action',
    attributes: {
      name: '1',
      actionTypeId: 'test',
      config: {
        bar: true,
      },
      secrets: {
        baz: true,
      },
      isMissingSecrets: false,
    },
    references: [],
  };
  encryptedSavedObjectsClient.getDecryptedAsInternalUser.mockResolvedValueOnce(actionSavedObject);
  actionTypeRegistry.get.mockReturnValueOnce(actionType);
  await actionExecutor.execute({
    ...executeParams,
    source: asSavedObjectExecutionSource({
      id: '573891ae-8c48-49cb-a197-0cd5ec34a88b',
      type: 'alert',
    }),
  });

  expect(encryptedSavedObjectsClient.getDecryptedAsInternalUser).toHaveBeenCalledWith(
    'action',
    '1',
    { namespace: 'some-namespace' }
  );

  expect(actionTypeRegistry.get).toHaveBeenCalledWith('test');
  expect(actionTypeRegistry.isActionExecutable).toHaveBeenCalledWith('1', 'test', {
    notifyUsage: true,
  });

  expect(actionType.executor).toHaveBeenCalledWith({
    actionId: '1',
    services: expect.anything(),
    config: {
      bar: true,
    },
    secrets: {
      baz: true,
    },
    params: { foo: true },
    logger: loggerMock,
    source: {
      source: {
        id: '573891ae-8c48-49cb-a197-0cd5ec34a88b',
        type: 'alert',
      },
      type: 'SAVED_OBJECT',
    },
  });

  expect(loggerMock.debug).toBeCalledWith('executing action test:1: 1');
  expect(eventLogger.logEvent.mock.calls).toMatchInlineSnapshot(`
    Array [
      Array [
        Object {
          "event": Object {
            "action": "execute-start",
            "kind": "action",
          },
          "kibana": Object {
            "action": Object {
              "execution": Object {
                "source": "alert",
                "uuid": "2",
              },
              "id": "1",
              "name": "1",
            },
            "alert": Object {
              "rule": Object {
                "execution": Object {
                  "uuid": "123abc",
                },
              },
            },
            "saved_objects": Array [
              Object {
                "id": "1",
                "namespace": "some-namespace",
                "rel": "primary",
                "type": "action",
                "type_id": "test",
              },
            ],
            "space_ids": Array [
              "some-namespace",
            ],
          },
          "message": "action started: test:1: 1",
        },
      ],
      Array [
        Object {
          "event": Object {
            "action": "execute",
            "kind": "action",
            "outcome": "success",
          },
          "kibana": Object {
            "action": Object {
              "execution": Object {
                "source": "alert",
                "uuid": "2",
              },
              "id": "1",
              "name": "1",
            },
            "alert": Object {
              "rule": Object {
                "execution": Object {
                  "uuid": "123abc",
                },
              },
            },
            "saved_objects": Array [
              Object {
                "id": "1",
                "namespace": "some-namespace",
                "rel": "primary",
                "type": "action",
                "type_id": "test",
              },
            ],
            "space_ids": Array [
              "some-namespace",
            ],
          },
          "message": "action executed: test:1: 1",
          "user": Object {
            "id": "123",
            "name": "coolguy",
          },
        },
      ],
    ]
  `);
});

test('successfully executes with preconfigured connector', async () => {
  const actionType: jest.Mocked<ActionType> = {
    id: 'test',
    name: 'Test',
    minimumLicenseRequired: 'basic',
    supportedFeatureIds: ['alerting'],
    validate: {
      config: { schema: schema.object({ bar: schema.string() }) },
      secrets: { schema: schema.object({ apiKey: schema.string() }) },
      params: { schema: schema.object({ foo: schema.boolean() }) },
    },
    executor: jest.fn(),
  };

  actionTypeRegistry.get.mockReturnValueOnce(actionType);
  await actionExecutor.execute({ ...executeParams, actionId: 'preconfigured' });

  expect(encryptedSavedObjectsClient.getDecryptedAsInternalUser).not.toHaveBeenCalled();

  expect(actionTypeRegistry.get).toHaveBeenCalledWith('test');
  expect(actionTypeRegistry.isActionExecutable).toHaveBeenCalledWith('preconfigured', 'test', {
    notifyUsage: true,
  });

  expect(actionType.executor).toHaveBeenCalledWith({
    actionId: 'preconfigured',
    services: expect.anything(),
    config: {
      bar: 'preconfigured',
    },
    secrets: {
      apiKey: 'abc',
    },
    params: { foo: true },
    logger: loggerMock,
  });

  expect(loggerMock.debug).toBeCalledWith('executing action test:preconfigured: Preconfigured');
  expect(eventLogger.logEvent.mock.calls).toMatchInlineSnapshot(`
    Array [
      Array [
        Object {
          "event": Object {
            "action": "execute-start",
            "kind": "action",
          },
          "kibana": Object {
            "action": Object {
              "execution": Object {
                "uuid": "2",
              },
              "id": "preconfigured",
              "name": "Preconfigured",
            },
            "alert": Object {
              "rule": Object {
                "execution": Object {
                  "uuid": "123abc",
                },
              },
            },
            "saved_objects": Array [
              Object {
                "id": "preconfigured",
                "namespace": "some-namespace",
                "rel": "primary",
                "space_agnostic": true,
                "type": "action",
                "type_id": "test",
              },
            ],
            "space_ids": Array [
              "some-namespace",
            ],
          },
          "message": "action started: test:preconfigured: Preconfigured",
        },
      ],
      Array [
        Object {
          "event": Object {
            "action": "execute",
            "kind": "action",
            "outcome": "success",
          },
          "kibana": Object {
            "action": Object {
              "execution": Object {
                "uuid": "2",
              },
              "id": "preconfigured",
              "name": "Preconfigured",
            },
            "alert": Object {
              "rule": Object {
                "execution": Object {
                  "uuid": "123abc",
                },
              },
            },
            "saved_objects": Array [
              Object {
                "id": "preconfigured",
                "namespace": "some-namespace",
                "rel": "primary",
                "space_agnostic": true,
                "type": "action",
                "type_id": "test",
              },
            ],
            "space_ids": Array [
              "some-namespace",
            ],
          },
          "message": "action executed: test:preconfigured: Preconfigured",
          "user": Object {
            "id": "123",
            "name": "coolguy",
          },
        },
      ],
    ]
  `);
});

test('successfully executes with system connector', async () => {
  const actionType: jest.Mocked<ActionType> = {
    id: '.cases',
    name: 'Cases',
    minimumLicenseRequired: 'platinum',
    supportedFeatureIds: ['alerting'],
    isSystemActionType: true,
    validate: {
      config: { schema: schema.any() },
      secrets: { schema: schema.any() },
      params: { schema: schema.any() },
    },
    executor: jest.fn(),
  };

  actionTypeRegistry.get.mockReturnValueOnce(actionType);
  await actionExecutor.execute({ ...executeParams, actionId: 'system-connector-.cases' });

  expect(encryptedSavedObjectsClient.getDecryptedAsInternalUser).not.toHaveBeenCalled();

  expect(actionTypeRegistry.get).toHaveBeenCalledWith('.cases');
  expect(actionTypeRegistry.isActionExecutable).toHaveBeenCalledWith(
    'system-connector-.cases',
    '.cases',
    {
      notifyUsage: true,
    }
  );

  expect(actionType.executor).toHaveBeenCalledWith({
    actionId: 'system-connector-.cases',
    services: expect.anything(),
    config: {},
    secrets: {},
    params: { foo: true },
    logger: loggerMock,
    request: {},
  });

  expect(loggerMock.debug).toBeCalledWith(
    'executing action .cases:system-connector-.cases: System action: .cases'
  );
  expect(eventLogger.logEvent.mock.calls).toMatchInlineSnapshot(`
    Array [
      Array [
        Object {
          "event": Object {
            "action": "execute-start",
            "kind": "action",
          },
          "kibana": Object {
            "action": Object {
              "execution": Object {
                "uuid": "2",
              },
              "id": "system-connector-.cases",
              "name": "System action: .cases",
            },
            "alert": Object {
              "rule": Object {
                "execution": Object {
                  "uuid": "123abc",
                },
              },
            },
            "saved_objects": Array [
              Object {
                "id": "system-connector-.cases",
                "namespace": "some-namespace",
                "rel": "primary",
                "space_agnostic": true,
                "type": "action",
                "type_id": ".cases",
              },
            ],
            "space_ids": Array [
              "some-namespace",
            ],
          },
          "message": "action started: .cases:system-connector-.cases: System action: .cases",
        },
      ],
      Array [
        Object {
          "event": Object {
            "action": "execute",
            "kind": "action",
            "outcome": "success",
          },
          "kibana": Object {
            "action": Object {
              "execution": Object {
                "uuid": "2",
              },
              "id": "system-connector-.cases",
              "name": "System action: .cases",
            },
            "alert": Object {
              "rule": Object {
                "execution": Object {
                  "uuid": "123abc",
                },
              },
            },
            "saved_objects": Array [
              Object {
                "id": "system-connector-.cases",
                "namespace": "some-namespace",
                "rel": "primary",
                "space_agnostic": true,
                "type": "action",
                "type_id": ".cases",
              },
            ],
            "space_ids": Array [
              "some-namespace",
            ],
          },
          "message": "action executed: .cases:system-connector-.cases: System action: .cases",
          "user": Object {
            "id": "123",
            "name": "coolguy",
          },
        },
      ],
    ]
  `);
});

test('passes the Kibana request on the executor of a system action', async () => {
  const actionType: jest.Mocked<ActionType> = {
    id: '.cases',
    name: 'Cases',
    minimumLicenseRequired: 'platinum',
    supportedFeatureIds: ['alerting'],
    isSystemActionType: true,
    validate: {
      config: { schema: schema.any() },
      secrets: { schema: schema.any() },
      params: { schema: schema.any() },
    },
    executor: jest.fn(),
  };

  actionTypeRegistry.get.mockReturnValueOnce(actionType);
  await actionExecutor.execute({ ...executeParams, actionId: 'system-connector-.cases' });

  expect(actionType.executor).toHaveBeenCalledWith({
    actionId: 'system-connector-.cases',
    services: expect.anything(),
    config: {},
    secrets: {},
    params: { foo: true },
    logger: loggerMock,
    request: {},
  });
});

test('does not pass the Kibana request on the executor if the action is not a system action', async () => {
  const actionType: jest.Mocked<ActionType> = {
    id: 'test',
    name: 'Test',
    minimumLicenseRequired: 'basic',
    supportedFeatureIds: ['alerting'],
    validate: {
      config: { schema: schema.object({ bar: schema.boolean() }) },
      secrets: { schema: schema.object({ baz: schema.boolean() }) },
      params: { schema: schema.object({ foo: schema.boolean() }) },
    },
    executor: jest.fn(),
  };

  const actionSavedObject = {
    id: '1',
    type: 'action',
    attributes: {
      name: '1',
      actionTypeId: 'test',
      config: {
        bar: true,
      },
      secrets: {
        baz: true,
      },
      isMissingSecrets: false,
    },
    references: [],
  };

  encryptedSavedObjectsClient.getDecryptedAsInternalUser.mockResolvedValueOnce(actionSavedObject);
  actionTypeRegistry.get.mockReturnValueOnce(actionType);
  await actionExecutor.execute(executeParams);

  const args = actionType.executor.mock.calls[0][0];

  expect(args.request).toBeUndefined();
});

test('successfully authorize system actions', async () => {
  const actionType: jest.Mocked<ActionType> = {
    id: '.cases',
    name: 'Cases',
    minimumLicenseRequired: 'platinum',
    supportedFeatureIds: ['alerting'],
    getKibanaPrivileges: () => ['test/create'],
    isSystemActionType: true,
    validate: {
      config: { schema: schema.any() },
      secrets: { schema: schema.any() },
      params: { schema: schema.any() },
    },
    executor: jest.fn(),
  };

  actionTypeRegistry.get.mockReturnValueOnce(actionType);
  actionTypeRegistry.isSystemActionType.mockReturnValueOnce(true);
  actionTypeRegistry.getSystemActionKibanaPrivileges.mockReturnValueOnce(['test/create']);

  await actionExecutor.execute({ ...executeParams, actionId: 'system-connector-.cases' });

  expect(authorizationMock.ensureAuthorized).toBeCalledWith({
    actionTypeId: '.cases',
    operation: 'execute',
    additionalPrivileges: ['test/create'],
  });
});

test('actionType Executor returns status "error" and an error message', async () => {
  const actionType: jest.Mocked<ActionType> = {
    id: 'test',
    name: 'Test',
    minimumLicenseRequired: 'basic',
    supportedFeatureIds: ['alerting'],
    validate: {
      config: { schema: schema.any() },
      secrets: { schema: schema.any() },
      params: { schema: schema.any() },
    },
    executor: jest.fn().mockReturnValue({
      actionId: 'test',
      status: 'error',
      message: 'test error message',
      retry: true,
    }),
  };
  const actionSavedObject = {
    id: '1',
    type: 'action',
    attributes: {
      name: '1',
      actionTypeId: 'test',
      config: {
        bar: true,
      },
      secrets: {
        baz: true,
      },
      isMissingSecrets: false,
    },
    references: [],
  };
  encryptedSavedObjectsClient.getDecryptedAsInternalUser.mockResolvedValueOnce(actionSavedObject);
  actionTypeRegistry.get.mockReturnValueOnce(actionType);
  const result = await actionExecutor.execute(executeParams);

  expect(result).toEqual({
    actionId: 'test',
    errorSource: TaskErrorSource.USER,
    message: 'test error message',
    retry: true,
    status: 'error',
  });
});

test('Execute of SentinelOne sub-actions require create privilege', async () => {
  const actionType: jest.Mocked<ActionType> = {
    id: '.sentinelone',
    name: 'sentinelone',
    minimumLicenseRequired: 'enterprise',
    supportedFeatureIds: [SecurityConnectorFeatureId],
    validate: {
      config: { schema: schema.any() },
      secrets: { schema: schema.any() },
      params: { schema: schema.any() },
    },
    executor: jest.fn(),
  };
  const actionSavedObject = {
    id: '1',
    type: 'action',
    attributes: {
      name: '1',
      actionTypeId: '.sentinelone',
      config: {
        bar: true,
      },
      secrets: {
        baz: true,
      },
      isMissingSecrets: false,
    },
    references: [],
  };

  encryptedSavedObjectsClient.getDecryptedAsInternalUser.mockResolvedValueOnce(actionSavedObject);
  actionTypeRegistry.get.mockReturnValueOnce(actionType);

  await actionExecutor.execute({ ...executeParams, actionId: 'sentinel-one-connector-authz' });

  expect(authorizationMock.ensureAuthorized).toHaveBeenCalledWith({
    operation: 'execute',
    actionTypeId: '.sentinelone',
  });
});

test('pass the params to the actionTypeRegistry when authorizing system actions', async () => {
  const actionType: jest.Mocked<ActionType> = {
    id: '.cases',
    name: 'Cases',
    minimumLicenseRequired: 'platinum',
    supportedFeatureIds: ['alerting'],
    getKibanaPrivileges: () => ['test/create'],
    isSystemActionType: true,
    validate: {
      config: { schema: schema.any() },
      secrets: { schema: schema.any() },
      params: { schema: schema.any() },
    },
    executor: jest.fn(),
  };

  actionTypeRegistry.get.mockReturnValueOnce(actionType);
  actionTypeRegistry.isSystemActionType.mockReturnValueOnce(true);
  actionTypeRegistry.getSystemActionKibanaPrivileges.mockReturnValueOnce(['test/create']);

  await actionExecutor.execute({
    ...executeParams,
    params: { foo: 'bar' },
    actionId: 'system-connector-.cases',
  });

  expect(actionTypeRegistry.getSystemActionKibanaPrivileges).toHaveBeenCalledWith('.cases', {
    foo: 'bar',
  });

  expect(authorizationMock.ensureAuthorized).toBeCalledWith({
    actionTypeId: '.cases',
    operation: 'execute',
    additionalPrivileges: ['test/create'],
  });
});

test('does not authorize non system actions', async () => {
  const actionType: jest.Mocked<ActionType> = {
    id: 'test',
    name: 'Test',
    minimumLicenseRequired: 'basic',
    supportedFeatureIds: ['alerting'],
    validate: {
      config: { schema: schema.object({ bar: schema.string() }) },
      secrets: { schema: schema.object({ apiKey: schema.string() }) },
      params: { schema: schema.object({ foo: schema.boolean() }) },
    },
    executor: jest.fn(),
  };

  actionTypeRegistry.get.mockReturnValueOnce(actionType);
  actionTypeRegistry.isSystemActionType.mockReturnValueOnce(false);

  await actionExecutor.execute({ ...executeParams, actionId: 'preconfigured' });

  expect(authorizationMock.ensureAuthorized).not.toBeCalled();
});

test('successfully executes as a task', async () => {
  const actionType: jest.Mocked<ActionType> = {
    id: 'test',
    name: 'Test',
    minimumLicenseRequired: 'basic',
    supportedFeatureIds: ['alerting'],
    validate: {
      config: { schema: schema.object({ bar: schema.boolean() }) },
      secrets: { schema: schema.object({ baz: schema.boolean() }) },
      params: { schema: schema.object({ foo: schema.boolean() }) },
    },
    executor: jest.fn(),
  };
  const actionSavedObject = {
    id: '1',
    type: 'action',
    attributes: {
      name: '1',
      actionTypeId: 'test',
      isMissingSecrets: false,
      config: {
        bar: true,
      },
      secrets: {
        baz: true,
      },
    },
    references: [],
  };
  encryptedSavedObjectsClient.getDecryptedAsInternalUser.mockResolvedValueOnce(actionSavedObject);
  actionTypeRegistry.get.mockReturnValueOnce(actionType);

  const scheduleDelay = 10000; // milliseconds
  const scheduled = new Date(Date.now() - scheduleDelay);
  const attempts = 1;
  await actionExecutor.execute({
    ...executeParams,
    taskInfo: {
      scheduled,
      attempts,
    },
  });

  const eventTask = eventLogger.logEvent.mock.calls[0][0]?.kibana?.task;
  expect(eventTask).toBeDefined();
  expect(eventTask?.scheduled).toBe(scheduled.toISOString());
  expect(eventTask?.schedule_delay).toBeGreaterThanOrEqual(scheduleDelay * 1000 * 1000);
  expect(eventTask?.schedule_delay).toBeLessThanOrEqual(2 * scheduleDelay * 1000 * 1000);
});

test('provides empty config when config and / or secrets is empty', async () => {
  const actionType: jest.Mocked<ActionType> = {
    id: 'test',
    name: 'Test',
    minimumLicenseRequired: 'basic',
    supportedFeatureIds: ['alerting'],
    validate: {
      config: { schema: schema.object({}) },
      secrets: { schema: schema.object({}) },
      params: { schema: schema.object({ foo: schema.boolean() }) },
    },
    executor: jest.fn(),
  };
  const actionSavedObject = {
    id: '1',
    type: 'action',
    attributes: {
      name: '1',
      actionTypeId: 'test',
      isMissingSecrets: false,
      config: {},
      secrets: {},
    },
    references: [],
  };
  encryptedSavedObjectsClient.getDecryptedAsInternalUser.mockResolvedValueOnce(actionSavedObject);
  actionTypeRegistry.get.mockReturnValueOnce(actionType);
  await actionExecutor.execute(executeParams);

  expect(actionType.executor).toHaveBeenCalledTimes(1);
  const executorCall = actionType.executor.mock.calls[0][0];
  expect(executorCall.config).toMatchInlineSnapshot(`Object {}`);
});

test('throws an error when config is invalid', async () => {
  const actionType: jest.Mocked<ActionType> = {
    id: 'test',
    name: 'Test',
    minimumLicenseRequired: 'basic',
    supportedFeatureIds: ['alerting'],
    validate: {
      secrets: { schema: schema.object({}) },
      params: { schema: schema.object({ foo: schema.boolean() }) },
      config: {
        schema: schema.object({
          param1: schema.string(),
        }),
      },
    },
    executor: jest.fn(),
  };
  const actionSavedObject = {
    id: '1',
    type: 'action',
    attributes: {
      name: '1',
      actionTypeId: 'test',
    },
    references: [],
  };
  encryptedSavedObjectsClient.getDecryptedAsInternalUser.mockResolvedValueOnce(actionSavedObject);
  actionTypeRegistry.get.mockReturnValueOnce(actionType);

  const result = await actionExecutor.execute(executeParams);
  expect(result).toEqual({
    actionId: '1',
    status: 'error',
    retry: false,
    message: `error validating action type config: [param1]: expected value of type [string] but got [undefined]`,
    errorSource: TaskErrorSource.FRAMEWORK,
  });
});

test('returns an error when connector is invalid', async () => {
  const actionType: jest.Mocked<ActionType> = {
    id: 'test',
    name: 'Test',
    minimumLicenseRequired: 'basic',
    supportedFeatureIds: ['alerting'],
    validate: {
      secrets: { schema: schema.object({}) },
      config: { schema: schema.object({}) },
      params: { schema: schema.object({ foo: schema.boolean() }) },
      connector: () => {
        return 'error';
      },
    },
    executor: jest.fn(),
  };
  const actionSavedObject = {
    id: '1',
    type: 'action',
    attributes: {
      name: '1',
      actionTypeId: 'test',
      isMissingSecrets: false,
      secrets: {},
    },
    references: [],
  };
  encryptedSavedObjectsClient.getDecryptedAsInternalUser.mockResolvedValueOnce(actionSavedObject);
  actionTypeRegistry.get.mockReturnValueOnce(actionType);

  const result = await actionExecutor.execute(executeParams);
  expect(result).toEqual({
    actionId: '1',
    status: 'error',
    retry: false,
    message: `error validating action type connector: config must be defined`,
    errorSource: TaskErrorSource.FRAMEWORK,
  });
});

test('throws an error when params is invalid', async () => {
  const actionType: jest.Mocked<ActionType> = {
    id: 'test',
    name: 'Test',
    minimumLicenseRequired: 'basic',
    supportedFeatureIds: ['alerting'],
    validate: {
      config: { schema: schema.object({}) },
      secrets: { schema: schema.object({}) },
      params: {
        schema: schema.object({
          param1: schema.string(),
        }),
      },
    },
    executor: jest.fn(),
  };
  const actionSavedObject = {
    id: '1',
    type: 'action',
    attributes: {
      name: '1',
      actionTypeId: 'test',
    },
    references: [],
  };
  encryptedSavedObjectsClient.getDecryptedAsInternalUser.mockResolvedValueOnce(actionSavedObject);
  actionTypeRegistry.get.mockReturnValueOnce(actionType);

  const result = await actionExecutor.execute(executeParams);
  expect(result).toEqual({
    actionId: '1',
    status: 'error',
    retry: false,
    message: `error validating action params: [param1]: expected value of type [string] but got [undefined]`,
    errorSource: TaskErrorSource.FRAMEWORK,
  });
});

test('throws an error when failing to load action through savedObjectsClient', async () => {
  encryptedSavedObjectsClient.getDecryptedAsInternalUser.mockRejectedValueOnce(
    new Error('No access')
  );

  try {
    await actionExecutor.execute(executeParams);
  } catch (e) {
    expect(e.message).toBe('No access');
    expect(getErrorSource(e)).toBe(TaskErrorSource.FRAMEWORK);
  }
});

test('throws an error if actionType is not enabled', async () => {
  const actionType: jest.Mocked<ActionType> = {
    id: 'test',
    name: 'Test',
    minimumLicenseRequired: 'basic',
    supportedFeatureIds: ['alerting'],
    validate: {
      config: { schema: schema.object({}) },
      secrets: { schema: schema.object({}) },
      params: { schema: schema.object({}) },
    },
    executor: jest.fn(),
  };
  const actionSavedObject = {
    id: '1',
    type: 'action',
    attributes: {
      name: '1',
      actionTypeId: 'test',
    },
    references: [],
  };
  encryptedSavedObjectsClient.getDecryptedAsInternalUser.mockResolvedValueOnce(actionSavedObject);
  actionTypeRegistry.get.mockReturnValueOnce(actionType);
  actionTypeRegistry.ensureActionTypeEnabled.mockImplementationOnce(() => {
    throw new Error('not enabled for test');
  });

  try {
    await actionExecutor.execute(executeParams);
  } catch (e) {
    expect(e.message).toBe('not enabled for test');
    expect(getErrorSource(e)).toBe(TaskErrorSource.FRAMEWORK);
  }

  expect(actionTypeRegistry.ensureActionTypeEnabled).toHaveBeenCalledWith('test');
});

test('should not throws an error if actionType is preconfigured', async () => {
  const actionType: jest.Mocked<ActionType> = {
    id: 'test',
    name: 'Test',
    minimumLicenseRequired: 'basic',
    supportedFeatureIds: ['alerting'],
    validate: {
      config: { schema: schema.object({ bar: schema.boolean() }) },
      secrets: { schema: schema.object({ baz: schema.boolean() }) },
      params: { schema: schema.object({ foo: schema.boolean() }) },
    },
    executor: jest.fn(),
  };
  const actionSavedObject = {
    id: '1',
    type: 'action',
    attributes: {
      name: '1',
      actionTypeId: 'test',
      config: {
        bar: true,
      },
      secrets: {
        baz: true,
      },
      isMissingSecrets: false,
    },
    references: [],
  };
  encryptedSavedObjectsClient.getDecryptedAsInternalUser.mockResolvedValueOnce(actionSavedObject);
  actionTypeRegistry.get.mockReturnValueOnce(actionType);
  actionTypeRegistry.ensureActionTypeEnabled.mockImplementationOnce(() => {
    throw new Error('not enabled for test');
  });
  actionTypeRegistry.isActionExecutable.mockImplementationOnce(() => true);
  await actionExecutor.execute(executeParams);

  expect(actionTypeRegistry.ensureActionTypeEnabled).toHaveBeenCalledTimes(0);
  expect(actionType.executor).toHaveBeenCalledWith({
    actionId: '1',
    services: expect.anything(),
    config: {
      bar: true,
    },
    secrets: {
      baz: true,
    },
    params: { foo: true },
    logger: loggerMock,
  });
});

test('should not throws an error if actionType is system action', async () => {
  const actionType: jest.Mocked<ActionType> = {
    id: '.cases',
    name: 'Cases',
    minimumLicenseRequired: 'platinum',
    supportedFeatureIds: ['alerting'],
    isSystemActionType: true,
    validate: {
      config: { schema: schema.any() },
      secrets: { schema: schema.any() },
      params: { schema: schema.any() },
    },
    executor: jest.fn(),
  };

  const actionSavedObject = {
    id: '1',
    type: 'action',
    attributes: {
      name: '1',
      actionTypeId: '.cases',
      config: {},
      secrets: {},
    },
    references: [],
  };

  encryptedSavedObjectsClient.getDecryptedAsInternalUser.mockResolvedValueOnce(actionSavedObject);
  actionTypeRegistry.get.mockReturnValueOnce(actionType);
  actionTypeRegistry.ensureActionTypeEnabled.mockImplementationOnce(() => {
    throw new Error('not enabled for test');
  });
  actionTypeRegistry.isActionExecutable.mockImplementationOnce(() => true);
  await actionExecutor.execute(executeParams);

  expect(actionTypeRegistry.ensureActionTypeEnabled).toHaveBeenCalledTimes(0);
  expect(actionType.executor).toHaveBeenCalledWith({
    actionId: '1',
    services: expect.anything(),
    config: {},
    secrets: {},
    params: { foo: true },
    logger: loggerMock,
    request: {},
  });
});

test('throws an error when passing isESOCanEncrypt with value of false', async () => {
  const customActionExecutor = new ActionExecutor({ isESOCanEncrypt: false });
  customActionExecutor.initialize({
    logger: loggingSystemMock.create().get(),
    spaces: spacesMock,
    getServices: () => services,
    actionTypeRegistry,
    encryptedSavedObjectsClient,
    eventLogger: eventLoggerMock.create(),
    inMemoryConnectors: [],
    getActionsAuthorizationWithRequest,
  });

  try {
    await customActionExecutor.execute(executeParams);
  } catch (e) {
    expect(e.message).toBe(
      'Unable to execute action because the Encrypted Saved Objects plugin is missing encryption key. Please set xpack.encryptedSavedObjects.encryptionKey in the kibana.yml or use the bin/kibana-encryption-keys command.'
    );
    expect(getErrorSource(e)).toBe(TaskErrorSource.USER);
  }
});

test('should not throw error if action is preconfigured and isESOCanEncrypt is false', async () => {
  const customActionExecutor = new ActionExecutor({ isESOCanEncrypt: false });
  customActionExecutor.initialize({
    logger: loggingSystemMock.create().get(),
    spaces: spacesMock,
    getServices: () => services,
    actionTypeRegistry,
    encryptedSavedObjectsClient,
    eventLogger: eventLoggerMock.create(),
    getActionsAuthorizationWithRequest,
    inMemoryConnectors: [
      {
        id: 'preconfigured',
        name: 'Preconfigured',
        actionTypeId: 'test',
        config: {
          bar: 'preconfigured',
        },
        secrets: {
          apiKey: 'abc',
        },
        isPreconfigured: true,
        isDeprecated: false,
        isSystemAction: false,
      },
    ],
  });
  const actionType: jest.Mocked<ActionType> = {
    id: 'test',
    name: 'Test',
    minimumLicenseRequired: 'basic',
    supportedFeatureIds: ['alerting'],
    validate: {
      config: { schema: schema.object({ bar: schema.string() }) },
      secrets: { schema: schema.object({ apiKey: schema.string() }) },
      params: { schema: schema.object({ foo: schema.boolean() }) },
    },
    executor: jest.fn(),
  };

  actionTypeRegistry.get.mockReturnValueOnce(actionType);
  await actionExecutor.execute({ ...executeParams, actionId: 'preconfigured' });

  expect(encryptedSavedObjectsClient.getDecryptedAsInternalUser).not.toHaveBeenCalled();

  expect(actionTypeRegistry.get).toHaveBeenCalledWith('test');
  expect(actionTypeRegistry.isActionExecutable).toHaveBeenCalledWith('preconfigured', 'test', {
    notifyUsage: true,
  });

  expect(actionType.executor).toHaveBeenCalledWith({
    actionId: 'preconfigured',
    services: expect.anything(),
    config: {
      bar: 'preconfigured',
    },
    secrets: {
      apiKey: 'abc',
    },
    params: { foo: true },
    logger: loggerMock,
  });

  expect(loggerMock.debug).toBeCalledWith('executing action test:preconfigured: Preconfigured');
  expect(eventLogger.logEvent.mock.calls).toMatchInlineSnapshot(`
    Array [
      Array [
        Object {
          "event": Object {
            "action": "execute-start",
            "kind": "action",
          },
          "kibana": Object {
            "action": Object {
              "execution": Object {
                "uuid": "2",
              },
              "id": "preconfigured",
              "name": "Preconfigured",
            },
            "alert": Object {
              "rule": Object {
                "execution": Object {
                  "uuid": "123abc",
                },
              },
            },
            "saved_objects": Array [
              Object {
                "id": "preconfigured",
                "namespace": "some-namespace",
                "rel": "primary",
                "space_agnostic": true,
                "type": "action",
                "type_id": "test",
              },
            ],
            "space_ids": Array [
              "some-namespace",
            ],
          },
          "message": "action started: test:preconfigured: Preconfigured",
        },
      ],
      Array [
        Object {
          "event": Object {
            "action": "execute",
            "kind": "action",
            "outcome": "success",
          },
          "kibana": Object {
            "action": Object {
              "execution": Object {
                "uuid": "2",
              },
              "id": "preconfigured",
              "name": "Preconfigured",
            },
            "alert": Object {
              "rule": Object {
                "execution": Object {
                  "uuid": "123abc",
                },
              },
            },
            "saved_objects": Array [
              Object {
                "id": "preconfigured",
                "namespace": "some-namespace",
                "rel": "primary",
                "space_agnostic": true,
                "type": "action",
                "type_id": "test",
              },
            ],
            "space_ids": Array [
              "some-namespace",
            ],
          },
          "message": "action executed: test:preconfigured: Preconfigured",
          "user": Object {
            "id": "123",
            "name": "coolguy",
          },
        },
      ],
    ]
  `);
});

test('should not throw error if action is system action and isESOCanEncrypt is false', async () => {
  const customActionExecutor = new ActionExecutor({ isESOCanEncrypt: false });
  customActionExecutor.initialize({
    logger: loggingSystemMock.create().get(),
    spaces: spacesMock,
    getServices: () => services,
    actionTypeRegistry,
    encryptedSavedObjectsClient,
    eventLogger: eventLoggerMock.create(),
    getActionsAuthorizationWithRequest,
    inMemoryConnectors: [
      {
        actionTypeId: '.cases',
        config: {},
        id: 'system-connector-.cases',
        name: 'System action: .cases',
        secrets: {},
        isPreconfigured: false,
        isDeprecated: false,
        isSystemAction: true,
      },
    ],
  });

  const actionType: jest.Mocked<ActionType> = {
    id: '.cases',
    name: 'Cases',
    minimumLicenseRequired: 'platinum',
    supportedFeatureIds: ['alerting'],
    isSystemActionType: true,
    validate: {
      config: { schema: schema.any() },
      secrets: { schema: schema.any() },
      params: { schema: schema.any() },
    },
    executor: jest.fn(),
  };

  actionTypeRegistry.get.mockReturnValueOnce(actionType);
  await actionExecutor.execute({ ...executeParams, actionId: 'system-connector-.cases' });

  expect(encryptedSavedObjectsClient.getDecryptedAsInternalUser).not.toHaveBeenCalled();

  expect(actionTypeRegistry.get).toHaveBeenCalledWith('.cases');
  expect(actionTypeRegistry.isActionExecutable).toHaveBeenCalledWith(
    'system-connector-.cases',
    '.cases',
    {
      notifyUsage: true,
    }
  );

  expect(actionType.executor).toHaveBeenCalledWith({
    actionId: 'system-connector-.cases',
    services: expect.anything(),
    config: {},
    secrets: {},
    params: { foo: true },
    logger: loggerMock,
    request: {},
  });

  expect(loggerMock.debug).toBeCalledWith(
    'executing action .cases:system-connector-.cases: System action: .cases'
  );
  expect(eventLogger.logEvent.mock.calls).toMatchInlineSnapshot(`
    Array [
      Array [
        Object {
          "event": Object {
            "action": "execute-start",
            "kind": "action",
          },
          "kibana": Object {
            "action": Object {
              "execution": Object {
                "uuid": "2",
              },
              "id": "system-connector-.cases",
              "name": "System action: .cases",
            },
            "alert": Object {
              "rule": Object {
                "execution": Object {
                  "uuid": "123abc",
                },
              },
            },
            "saved_objects": Array [
              Object {
                "id": "system-connector-.cases",
                "namespace": "some-namespace",
                "rel": "primary",
                "space_agnostic": true,
                "type": "action",
                "type_id": ".cases",
              },
            ],
            "space_ids": Array [
              "some-namespace",
            ],
          },
          "message": "action started: .cases:system-connector-.cases: System action: .cases",
        },
      ],
      Array [
        Object {
          "event": Object {
            "action": "execute",
            "kind": "action",
            "outcome": "success",
          },
          "kibana": Object {
            "action": Object {
              "execution": Object {
                "uuid": "2",
              },
              "id": "system-connector-.cases",
              "name": "System action: .cases",
            },
            "alert": Object {
              "rule": Object {
                "execution": Object {
                  "uuid": "123abc",
                },
              },
            },
            "saved_objects": Array [
              Object {
                "id": "system-connector-.cases",
                "namespace": "some-namespace",
                "rel": "primary",
                "space_agnostic": true,
                "type": "action",
                "type_id": ".cases",
              },
            ],
            "space_ids": Array [
              "some-namespace",
            ],
          },
          "message": "action executed: .cases:system-connector-.cases: System action: .cases",
          "user": Object {
            "id": "123",
            "name": "coolguy",
          },
        },
      ],
    ]
  `);
});

test('does not log warning when alert executor succeeds', async () => {
  const executorMock = setupActionExecutorMock();
  executorMock.mockResolvedValue({
    actionId: '1',
    status: 'ok',
  });
  await actionExecutor.execute(executeParams);
  expect(loggerMock.warn).not.toBeCalled();
});

test('logs a warning when alert executor has an error', async () => {
  const executorMock = setupActionExecutorMock();
  executorMock.mockResolvedValue({
    actionId: '1',
    status: 'error',
    message: 'message for action execution error',
    serviceMessage: 'serviceMessage for action execution error',
  });
  await actionExecutor.execute(executeParams);
  expect(loggerMock.warn).toBeCalledWith(
    'action execution failure: test:1: action-1: message for action execution error: serviceMessage for action execution error'
  );
});

test('logs a warning and error when alert executor throws an error', async () => {
  const executorMock = setupActionExecutorMock();
  const err = new Error('this action execution is intended to fail');
  err.stack = 'foo error\n  stack 1\n  stack 2\n  stack 3';
  executorMock.mockRejectedValue(err);
  await actionExecutor.execute(executeParams);
  expect(loggerMock.warn).toBeCalledWith(
    'action execution failure: test:1: action-1: an error occurred while running the action: this action execution is intended to fail; retry: true'
  );
  expect(loggerMock.error).toBeCalledWith(err, {
    error: { stack_trace: 'foo error\n  stack 1\n  stack 2\n  stack 3' },
    tags: ['test', '1', 'action-run-failed'],
  });
});

test('logs a warning when alert executor returns invalid status', async () => {
  const executorMock = setupActionExecutorMock();
  // object typed as any as it has an invalid status value, but we want to test that
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const alertExecutionStatus: any = {
    actionId: '1',
    status: 'invalid-status',
    message: 'message for action execution error',
    serviceMessage: 'serviceMessage for action execution error',
  };
  executorMock.mockResolvedValue(alertExecutionStatus);
  await actionExecutor.execute(executeParams);
  expect(loggerMock.warn).toBeCalledWith(
    'action execution failure: test:1: action-1: returned unexpected result "invalid-status"'
  );
});

test('writes to event log for execute timeout', async () => {
  setupActionExecutorMock();

  await actionExecutor.logCancellation({
    actionId: 'action1',
    executionId: '123abc',
    consumer: 'test-consumer',
    relatedSavedObjects: [],
    request: {} as KibanaRequest,
    actionExecutionId: '2',
  });
  expect(eventLogger.logEvent).toHaveBeenCalledTimes(1);
  expect(eventLogger.logEvent).toHaveBeenNthCalledWith(1, {
    event: {
      action: 'execute-timeout',
      kind: 'action',
    },
    kibana: {
      action: {
        execution: {
          uuid: '2',
        },
        name: undefined,
        id: 'action1',
      },
      alert: {
        rule: {
          consumer: 'test-consumer',
          execution: {
            uuid: '123abc',
          },
        },
      },
      saved_objects: [
        {
          id: 'action1',
          namespace: 'some-namespace',
          rel: 'primary',
          type: 'action',
          type_id: 'test',
        },
      ],
      space_ids: ['some-namespace'],
    },
    message:
      'action: test:action1: \'action-1\' execution cancelled due to timeout - exceeded default timeout of "5m"',
  });
});

test('writes to event log for execute and execute start', async () => {
  const executorMock = setupActionExecutorMock();
  executorMock.mockResolvedValue({
    actionId: '1',
    status: 'ok',
  });
  await actionExecutor.execute(executeParams);
  expect(eventLogger.logEvent).toHaveBeenCalledTimes(2);
  expect(eventLogger.logEvent).toHaveBeenNthCalledWith(1, {
    event: {
      action: 'execute-start',
      kind: 'action',
    },
    kibana: {
      action: {
        execution: {
          uuid: '2',
        },
        name: 'action-1',
        id: '1',
      },
      alert: {
        rule: {
          execution: {
            uuid: '123abc',
          },
        },
      },
      saved_objects: [
        {
          id: '1',
          namespace: 'some-namespace',
          rel: 'primary',
          type: 'action',
          type_id: 'test',
        },
      ],
      space_ids: ['some-namespace'],
    },
    message: 'action started: test:1: action-1',
  });
});

test('writes to event log for execute and execute start when consumer and related saved object are defined', async () => {
  const executorMock = setupActionExecutorMock();
  executorMock.mockResolvedValue({
    actionId: '1',
    status: 'ok',
  });
  await actionExecutor.execute({
    ...executeParams,
    consumer: 'test-consumer',
    relatedSavedObjects: [
      {
        typeId: '.rule-type',
        type: 'alert',
        id: '12',
      },
    ],
  });
  expect(eventLogger.logEvent).toHaveBeenCalledTimes(2);
  expect(eventLogger.logEvent).toHaveBeenNthCalledWith(1, {
    event: {
      action: 'execute-start',
      kind: 'action',
    },
    kibana: {
      action: {
        execution: {
          uuid: '2',
        },
        name: 'action-1',
        id: '1',
      },
      alert: {
        rule: {
          consumer: 'test-consumer',
          execution: {
            uuid: '123abc',
          },
          rule_type_id: '.rule-type',
        },
      },
      saved_objects: [
        {
          id: '1',
          namespace: 'some-namespace',
          rel: 'primary',
          type: 'action',
          type_id: 'test',
        },
        {
          id: '12',
          namespace: undefined,
          rel: 'primary',
          type: 'alert',
          type_id: '.rule-type',
        },
      ],
      space_ids: ['some-namespace'],
    },
    message: 'action started: test:1: action-1',
  });
});

test('writes usage data to event log for OpenAI events', async () => {
  const executorMock = setupActionExecutorMock('.gen-ai');
  const mockGenAi = {
    id: 'chatcmpl-7LztF5xsJl2z5jcNpJKvaPm4uWt8x',
    object: 'chat.completion',
    created: 1685477149,
    model: 'gpt-3.5-turbo-0301',
    usage: {
      prompt_tokens: 10,
      completion_tokens: 9,
      total_tokens: 19,
    },
    choices: [
      {
        message: {
          role: 'assistant',
          content: 'Hello! How can I assist you today?',
        },
        finish_reason: 'stop',
        index: 0,
      },
    ],
  };
  executorMock.mockResolvedValue({
    actionId: '1',
    status: 'ok',
    // @ts-ignore
    data: mockGenAi,
  });
  await actionExecutor.execute(executeParams);
  expect(eventLogger.logEvent).toHaveBeenCalledTimes(2);
  expect(eventLogger.logEvent).toHaveBeenNthCalledWith(2, {
    event: {
      action: 'execute',
      kind: 'action',
      outcome: 'success',
    },
    kibana: {
      action: {
        execution: {
          uuid: '2',
          gen_ai: {
            usage: mockGenAi.usage,
          },
        },
        name: 'action-1',
        id: '1',
      },
      alert: {
        rule: {
          execution: {
            uuid: '123abc',
          },
        },
      },
      saved_objects: [
        {
          id: '1',
          namespace: 'some-namespace',
          rel: 'primary',
          type: 'action',
          type_id: '.gen-ai',
        },
      ],
      space_ids: ['some-namespace'],
    },
    message: 'action executed: .gen-ai:1: action-1',
    user: { name: 'coolguy', id: '123' },
  });
});

test('writes usage data to event log for streaming OpenAI events', async () => {
  const executorMock = setupActionExecutorMock('.gen-ai', {
    params: { schema: schema.any() },
    config: { schema: schema.any() },
    secrets: { schema: schema.any() },
  });

  const stream = new PassThrough();

  executorMock.mockResolvedValue({
    actionId: '1',
    status: 'ok',
    // @ts-ignore
    data: stream,
  });

  await actionExecutor.execute({
    ...executeParams,
    params: {
      subActionParams: {
        body: JSON.stringify({
          messages: [
            {
              role: 'system',
              content: 'System message',
            },
            {
              role: 'user',
              content: 'User message',
            },
          ],
        }),
      },
    },
  });

  expect(eventLogger.logEvent).toHaveBeenCalledTimes(1);
  stream.write(
    `data: ${JSON.stringify({
      object: 'chat.completion.chunk',
      choices: [{ delta: { content: 'Single' } }],
    })}\n`
  );
  stream.write(`data: [DONE]`);

  stream.end();

  await finished(stream);

  await new Promise(process.nextTick);

  expect(eventLogger.logEvent).toHaveBeenCalledTimes(2);
  expect(eventLogger.logEvent).toHaveBeenNthCalledWith(2, {
    event: {
      action: 'execute',
      kind: 'action',
      outcome: 'success',
    },
    kibana: {
      action: {
        execution: {
          uuid: '2',
          gen_ai: {
            usage: {
              completion_tokens: 5,
              prompt_tokens: 30,
              total_tokens: 35,
            },
          },
        },
        name: 'action-1',
        id: '1',
      },
      alert: {
        rule: {
          execution: {
            uuid: '123abc',
          },
        },
      },
      saved_objects: [
        {
          id: '1',
          namespace: 'some-namespace',
          rel: 'primary',
          type: 'action',
          type_id: '.gen-ai',
        },
      ],
      space_ids: ['some-namespace'],
    },
    message: 'action executed: .gen-ai:1: action-1',
    user: { name: 'coolguy', id: '123' },
  });
});

test('does not fetches actionInfo if passed as param', async () => {
  const actionType: jest.Mocked<ActionType> = {
    id: 'test',
    name: 'Test',
    minimumLicenseRequired: 'basic',
    supportedFeatureIds: ['alerting'],
    validate: {
      config: { schema: schema.object({ bar: schema.boolean() }) },
      secrets: { schema: schema.object({ baz: schema.boolean() }) },
      params: { schema: schema.object({ foo: schema.boolean() }) },
    },
    executor: jest.fn(),
  };

  const mockAction = {
    id: '1',
    type: 'action',
    attributes: {
      name: '1',
      actionTypeId: 'test',
      config: {
        bar: true,
      },
      secrets: {
        baz: true,
      },
      isMissingSecrets: false,
    },
    references: [],
  };

  const mockActionInfo = {
    actionTypeId: mockAction.attributes.actionTypeId,
    name: mockAction.attributes.name,
    config: mockAction.attributes.config,
    secrets: mockAction.attributes.secrets,
    actionId: mockAction.id,
    rawAction: mockAction.attributes,
  };

  actionTypeRegistry.get.mockReturnValueOnce(actionType);
  await actionExecutor.execute({
    ...executeParams,
    actionInfo: mockActionInfo,
  });

  expect(encryptedSavedObjectsClient.getDecryptedAsInternalUser).not.toHaveBeenCalled();
  expect(actionType.executor).toHaveBeenCalledWith(
    expect.objectContaining({
      actionId: '1',
      config: {
        bar: true,
      },
      secrets: {
        baz: true,
      },
      params: { foo: true },
    })
  );
});

function setupActionExecutorMock(
  actionTypeId = 'test',
  validationOverride?: ActionType['validate']
) {
  const actionType: jest.Mocked<ActionType> = {
    id: 'test',
    name: 'Test',
    minimumLicenseRequired: 'basic',
    supportedFeatureIds: ['alerting'],
    validate: validationOverride || {
      config: { schema: schema.object({ bar: schema.boolean() }) },
      secrets: { schema: schema.object({ baz: schema.boolean() }) },
      params: { schema: schema.object({ foo: schema.boolean() }) },
    },
    executor: jest.fn(),
  };
  const actionSavedObject = {
    id: '1',
    type: 'action',
    attributes: {
      name: 'action-1',
      actionTypeId,
      config: {
        bar: true,
      },
      secrets: {
        baz: true,
      },
      isMissingSecrets: false,
    },
    references: [],
  };
  encryptedSavedObjectsClient.getDecryptedAsInternalUser.mockResolvedValueOnce(actionSavedObject);
  actionTypeRegistry.get.mockReturnValueOnce(actionType);
  return actionType.executor;
}
