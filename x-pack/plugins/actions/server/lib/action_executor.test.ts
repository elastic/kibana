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
import { ActionType as ConnectorType } from '../types';
import { actionsAuthorizationMock, actionsMock } from '../mocks';
import {
  asBackgroundTaskExecutionSource,
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
const unsecuredServices = actionsMock.createUnsecuredServices();

const encryptedSavedObjectsClient = encryptedSavedObjectsMock.createClient();
const connectorTypeRegistry = actionTypeRegistryMock.create();
const eventLogger = eventLoggerMock.create();

const CONNECTOR_ID = '1';
const ACTION_EXECUTION_ID = '2';
const ACTION_PARAMS = { foo: true };

const executeUnsecuredParams = {
  actionExecutionId: ACTION_EXECUTION_ID,
  actionId: CONNECTOR_ID,
  params: ACTION_PARAMS,
  spaceId: 'some-namespace',
};

const executeParams = {
  actionExecutionId: ACTION_EXECUTION_ID,
  actionId: CONNECTOR_ID,
  params: ACTION_PARAMS,
  executionId: '123abc',
  request: {} as KibanaRequest,
};

const spacesMock = spacesServiceMock.createStartContract();
const loggerMock: ReturnType<typeof loggingSystemMock.createLogger> =
  loggingSystemMock.createLogger();
const securityMockStart = securityMock.createStart();

const authorizationMock = actionsAuthorizationMock.create();
const getActionsAuthorizationWithRequest = jest.fn();

const actionExecutorInitializationParams = {
  logger: loggerMock,
  spaces: spacesMock,
  security: securityMockStart,
  getServices: () => services,
  getUnsecuredServices: () => unsecuredServices,
  actionTypeRegistry: connectorTypeRegistry,
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
};
actionExecutor.initialize(actionExecutorInitializationParams);

const connectorType: jest.Mocked<ConnectorType> = {
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

const systemConnectorType: jest.Mocked<ConnectorType> = {
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

const connectorSavedObject = {
  id: CONNECTOR_ID,
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

const getBaseExecuteStartEventLogDoc = (unsecured: boolean) => {
  return {
    event: {
      action: 'execute-start',
      kind: 'action',
    },
    kibana: {
      action: {
        execution: {
          uuid: ACTION_EXECUTION_ID,
        },
        id: CONNECTOR_ID,
        name: '1',
      },
      ...(unsecured
        ? {}
        : {
            alert: {
              rule: {
                execution: {
                  uuid: '123abc',
                },
              },
            },
          }),
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
    message: 'action started: test:1: 1',
  };
};

const getBaseExecuteEventLogDoc = (unsecured: boolean) => {
  const base = getBaseExecuteStartEventLogDoc(unsecured);
  return {
    ...base,
    event: {
      ...base.event,
      action: 'execute',
      outcome: 'success',
    },
    message: 'action executed: test:1: 1',
    user: {
      ...(unsecured
        ? {}
        : {
            id: '123',
            name: 'coolguy',
          }),
    },
  };
};

beforeEach(() => {
  jest.resetAllMocks();
  jest.clearAllMocks();
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

describe('Action Executor', () => {
  for (const executeUnsecure of [false, true]) {
    const label = executeUnsecure ? 'executes unsecured' : 'executes';

    test(`successfully ${label}`, async () => {
      encryptedSavedObjectsClient.getDecryptedAsInternalUser.mockResolvedValueOnce(
        connectorSavedObject
      );
      connectorTypeRegistry.get.mockReturnValueOnce(connectorType);

      if (executeUnsecure) {
        await actionExecutor.executeUnsecured(executeUnsecuredParams);
      } else {
        await actionExecutor.execute(executeParams);
      }

      if (executeUnsecure) {
        expect(spacesMock.getSpaceId).not.toHaveBeenCalled();
        expect(securityMockStart.authc.getCurrentUser).not.toHaveBeenCalled();
      } else {
        expect(spacesMock.getSpaceId).toHaveBeenCalled();
        expect(securityMockStart.authc.getCurrentUser).toHaveBeenCalled();
      }

      expect(connectorTypeRegistry.isSystemActionType).toHaveBeenCalled();
      expect(encryptedSavedObjectsClient.getDecryptedAsInternalUser).toHaveBeenCalledWith(
        'action',
        CONNECTOR_ID,
        { namespace: 'some-namespace' }
      );
      expect(authorizationMock.ensureAuthorized).not.toBeCalled();

      expect(connectorTypeRegistry.get).toHaveBeenCalledWith('test');
      expect(connectorTypeRegistry.isActionExecutable).toHaveBeenCalledWith(CONNECTOR_ID, 'test', {
        notifyUsage: true,
      });

      expect(connectorType.executor).toHaveBeenCalledWith({
        actionId: CONNECTOR_ID,
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
      expect(eventLogger.logEvent).toHaveBeenCalledTimes(2);

      const execStartDoc = getBaseExecuteStartEventLogDoc(executeUnsecure);
      const execDoc = getBaseExecuteEventLogDoc(executeUnsecure);
      expect(eventLogger.logEvent).toHaveBeenNthCalledWith(1, execStartDoc);
      expect(eventLogger.logEvent).toHaveBeenNthCalledWith(2, execDoc);
    });

    for (const executionSource of [
      {
        name: `http`,
        sourceType: `http_request`,
        source: asHttpRequestExecutionSource(httpServerMock.createKibanaRequest()),
      },
      {
        name: `saved_object`,
        sourceType: `alert`,
        source: asSavedObjectExecutionSource({
          id: '573891ae-8c48-49cb-a197-0cd5ec34a88b',
          type: 'alert',
        }),
      },
      {
        name: `background_task`,
        sourceType: `background_task`,
        source: asBackgroundTaskExecutionSource({ taskId: 'task:123', taskType: 'taskType' }),
      },
    ]) {
      test(`successfully ${label} with ${executionSource.name} source`, async () => {
        encryptedSavedObjectsClient.getDecryptedAsInternalUser.mockResolvedValueOnce(
          connectorSavedObject
        );
        connectorTypeRegistry.get.mockReturnValueOnce(connectorType);

        if (executeUnsecure) {
          await actionExecutor.executeUnsecured({
            ...executeUnsecuredParams,
            source: executionSource.source,
          });
        } else {
          await actionExecutor.execute({ ...executeParams, source: executionSource.source });
        }

        expect(encryptedSavedObjectsClient.getDecryptedAsInternalUser).toHaveBeenCalledWith(
          'action',
          CONNECTOR_ID,
          { namespace: 'some-namespace' }
        );

        expect(connectorTypeRegistry.get).toHaveBeenCalledWith('test');
        expect(connectorTypeRegistry.isActionExecutable).toHaveBeenCalledWith(
          CONNECTOR_ID,
          'test',
          {
            notifyUsage: true,
          }
        );

        expect(connectorType.executor).toHaveBeenCalledWith({
          actionId: CONNECTOR_ID,
          services: expect.anything(),
          config: {
            bar: true,
          },
          secrets: {
            baz: true,
          },
          params: { foo: true },
          logger: loggerMock,
          source: executionSource.source,
        });

        expect(loggerMock.debug).toBeCalledWith('executing action test:1: 1');
        expect(eventLogger.logEvent).toHaveBeenCalledTimes(2);

        const execStartDoc = getBaseExecuteStartEventLogDoc(executeUnsecure);
        const execDoc = getBaseExecuteEventLogDoc(executeUnsecure);
        expect(eventLogger.logEvent).toHaveBeenNthCalledWith(1, {
          ...execStartDoc,
          kibana: {
            ...execStartDoc.kibana,
            action: {
              ...execStartDoc.kibana.action,
              execution: {
                ...execStartDoc.kibana.action.execution,
                source: executionSource.sourceType,
              },
            },
          },
        });
        expect(eventLogger.logEvent).toHaveBeenNthCalledWith(2, {
          ...execDoc,
          kibana: {
            ...execDoc.kibana,

            action: {
              ...execDoc.kibana.action,
              execution: {
                ...execDoc.kibana.action.execution,
                source: executionSource.sourceType,
              },
            },
          },
        });
      });
    }

    test(`successfully ${label} with preconfigured connector`, async () => {
      connectorTypeRegistry.get.mockReturnValueOnce({
        ...connectorType,
        validate: {
          config: { schema: schema.object({ bar: schema.string() }) },
          secrets: { schema: schema.object({ apiKey: schema.string() }) },
          params: { schema: schema.object({ foo: schema.boolean() }) },
        },
      });

      if (executeUnsecure) {
        await actionExecutor.executeUnsecured({
          ...executeUnsecuredParams,
          actionId: 'preconfigured',
        });
      } else {
        await actionExecutor.execute({ ...executeParams, actionId: 'preconfigured' });
      }

      expect(encryptedSavedObjectsClient.getDecryptedAsInternalUser).not.toHaveBeenCalled();

      expect(connectorTypeRegistry.get).toHaveBeenCalledWith('test');
      expect(connectorTypeRegistry.isActionExecutable).toHaveBeenCalledWith(
        'preconfigured',
        'test',
        {
          notifyUsage: true,
        }
      );

      expect(connectorType.executor).toHaveBeenCalledWith({
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
      expect(eventLogger.logEvent).toHaveBeenCalledTimes(2);

      const execStartDoc = getBaseExecuteStartEventLogDoc(executeUnsecure);
      const execDoc = getBaseExecuteEventLogDoc(executeUnsecure);
      expect(eventLogger.logEvent).toHaveBeenNthCalledWith(1, {
        ...execStartDoc,
        kibana: {
          ...execStartDoc.kibana,
          action: {
            ...execStartDoc.kibana.action,
            id: 'preconfigured',
            name: 'Preconfigured',
          },
          saved_objects: [
            {
              id: 'preconfigured',
              namespace: 'some-namespace',
              rel: 'primary',
              type: 'action',
              type_id: 'test',
              space_agnostic: true,
            },
          ],
        },
        message: 'action started: test:preconfigured: Preconfigured',
      });
      expect(eventLogger.logEvent).toHaveBeenNthCalledWith(2, {
        ...execDoc,
        kibana: {
          ...execDoc.kibana,
          action: {
            ...execDoc.kibana.action,
            id: 'preconfigured',
            name: 'Preconfigured',
          },
          saved_objects: [
            {
              id: 'preconfigured',
              namespace: 'some-namespace',
              rel: 'primary',
              type: 'action',
              type_id: 'test',
              space_agnostic: true,
            },
          ],
        },
        message: 'action executed: test:preconfigured: Preconfigured',
      });
    });

    test(`${label} with system connector`, async () => {
      connectorTypeRegistry.get.mockReturnValueOnce(systemConnectorType);
      connectorTypeRegistry.isSystemActionType.mockReturnValueOnce(true);

      if (executeUnsecure) {
        const result = await actionExecutor.executeUnsecured({
          ...executeUnsecuredParams,
          actionId: 'system-connector-.cases',
        });
        expect(result).toEqual({
          actionId: 'system-connector-.cases',
          errorSource: 'user',
          message: 'Cannot execute unsecured system action',
          retry: false,
          status: 'error',
        });

        expect(systemConnectorType.executor).not.toHaveBeenCalled();
      } else {
        await actionExecutor.execute({ ...executeParams, actionId: 'system-connector-.cases' });

        expect(systemConnectorType.executor).toHaveBeenCalledWith({
          actionId: 'system-connector-.cases',
          services: expect.anything(),
          config: {},
          secrets: {},
          params: { foo: true },
          logger: loggerMock,
          request: {},
        });
      }

      expect(encryptedSavedObjectsClient.getDecryptedAsInternalUser).not.toHaveBeenCalled();
      expect(connectorTypeRegistry.get).toHaveBeenCalledWith('.cases');
      expect(connectorTypeRegistry.isActionExecutable).toHaveBeenCalledWith(
        'system-connector-.cases',
        '.cases',
        {
          notifyUsage: true,
        }
      );
      expect(loggerMock.debug).toBeCalledWith(
        'executing action .cases:system-connector-.cases: System action: .cases'
      );
      expect(eventLogger.logEvent).toHaveBeenCalledTimes(2);

      const execStartDoc = getBaseExecuteStartEventLogDoc(executeUnsecure);
      const execDoc = getBaseExecuteEventLogDoc(executeUnsecure);
      expect(eventLogger.logEvent).toHaveBeenNthCalledWith(1, {
        ...execStartDoc,
        kibana: {
          ...execStartDoc.kibana,
          action: {
            ...execStartDoc.kibana.action,
            id: 'system-connector-.cases',
            name: 'System action: .cases',
          },
          saved_objects: [
            {
              id: 'system-connector-.cases',
              namespace: 'some-namespace',
              rel: 'primary',
              type: 'action',
              type_id: '.cases',
              space_agnostic: true,
            },
          ],
        },
        message: 'action started: .cases:system-connector-.cases: System action: .cases',
      });
      expect(eventLogger.logEvent).toHaveBeenNthCalledWith(2, {
        ...execDoc,
        ...(executeUnsecure
          ? { error: { message: `Cannot execute unsecured system action` } }
          : {}),
        event: {
          ...execDoc.event,
          outcome: executeUnsecure ? 'failure' : 'success',
        },
        kibana: {
          ...execDoc.kibana,
          action: {
            ...execDoc.kibana.action,
            id: 'system-connector-.cases',
            name: 'System action: .cases',
          },
          saved_objects: [
            {
              id: 'system-connector-.cases',
              namespace: 'some-namespace',
              rel: 'primary',
              type: 'action',
              type_id: '.cases',
              space_agnostic: true,
            },
          ],
        },
        message: `action ${
          executeUnsecure ? 'execution failure' : 'executed'
        }: .cases:system-connector-.cases: System action: .cases`,
      });
    });

    test(`${label} should return error status with error message when executor returns an error`, async () => {
      encryptedSavedObjectsClient.getDecryptedAsInternalUser.mockResolvedValueOnce(
        connectorSavedObject
      );
      connectorTypeRegistry.get.mockReturnValueOnce({
        ...connectorType,
        executor: jest.fn().mockReturnValue({
          actionId: 'test',
          status: 'error',
          message: 'test error message',
          retry: true,
        }),
      });

      const result = executeUnsecure
        ? await actionExecutor.executeUnsecured(executeUnsecuredParams)
        : await actionExecutor.execute(executeParams);

      expect(result).toEqual({
        actionId: 'test',
        errorSource: TaskErrorSource.USER,
        message: 'test error message',
        retry: true,
        status: 'error',
      });
    });

    test(`${label} should handle SentinelOne connector type`, async () => {
      const sentinelOneConnectorType: jest.Mocked<ConnectorType> = {
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
      const sentinelOneSavedObject = {
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

      encryptedSavedObjectsClient.getDecryptedAsInternalUser.mockResolvedValueOnce(
        sentinelOneSavedObject
      );
      connectorTypeRegistry.get.mockReturnValueOnce(sentinelOneConnectorType);

      if (executeUnsecure) {
        await actionExecutor.executeUnsecured({
          ...executeUnsecuredParams,
          actionId: 'sentinel-one-connector-authz',
        });
        expect(authorizationMock.ensureAuthorized).not.toHaveBeenCalled();
      } else {
        await actionExecutor.execute({
          ...executeParams,
          actionId: 'sentinel-one-connector-authz',
        });
        expect(authorizationMock.ensureAuthorized).toHaveBeenCalledWith({
          operation: 'execute',
          actionTypeId: '.sentinelone',
        });
      }
    });

    test(`${label} with taskInfo`, async () => {
      if (executeUnsecure) return;

      encryptedSavedObjectsClient.getDecryptedAsInternalUser.mockResolvedValueOnce(
        connectorSavedObject
      );
      connectorTypeRegistry.get.mockReturnValueOnce(connectorType);
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

    test(`${label} provides empty config when config and/or secrets is empty`, async () => {
      encryptedSavedObjectsClient.getDecryptedAsInternalUser.mockResolvedValueOnce({
        ...connectorSavedObject,
        attributes: {
          ...connectorSavedObject.attributes,
          config: {},
          secrets: {},
        },
      });
      connectorTypeRegistry.get.mockReturnValueOnce({
        ...connectorType,
        validate: {
          config: { schema: schema.object({}) },
          secrets: { schema: schema.object({}) },
          params: { schema: schema.object({ foo: schema.boolean() }) },
        },
      });

      if (executeUnsecure) {
        await actionExecutor.executeUnsecured(executeUnsecuredParams);
      } else {
        await actionExecutor.execute(executeParams);
      }

      expect(connectorType.executor).toHaveBeenCalledTimes(1);
      const executorCall = connectorType.executor.mock.calls[0][0];
      expect(executorCall.config).toMatchInlineSnapshot(`Object {}`);
    });

    test(`${label} returns error when config is invalid`, async () => {
      encryptedSavedObjectsClient.getDecryptedAsInternalUser.mockResolvedValueOnce({
        ...connectorSavedObject,
        attributes: {
          name: CONNECTOR_ID,
          actionTypeId: 'test',
        },
      });
      connectorTypeRegistry.get.mockReturnValueOnce({
        ...connectorType,
        validate: {
          secrets: { schema: schema.object({}) },
          params: { schema: schema.object({ foo: schema.boolean() }) },
          config: {
            schema: schema.object({
              param1: schema.string(),
            }),
          },
        },
      });

      const result = executeUnsecure
        ? await actionExecutor.executeUnsecured(executeUnsecuredParams)
        : await actionExecutor.execute(executeParams);

      expect(result).toEqual({
        actionId: '1',
        status: 'error',
        retry: false,
        message: `error validating action type config: [param1]: expected value of type [string] but got [undefined]`,
        errorSource: TaskErrorSource.FRAMEWORK,
      });
    });

    test(`${label} returns error when connector is invalid`, async () => {
      encryptedSavedObjectsClient.getDecryptedAsInternalUser.mockResolvedValueOnce({
        ...connectorSavedObject,
        attributes: {
          name: CONNECTOR_ID,
          actionTypeId: 'test',
          isMissingSecrets: false,
          secrets: {},
        },
      });
      connectorTypeRegistry.get.mockReturnValueOnce({
        ...connectorType,
        validate: {
          secrets: { schema: schema.object({}) },
          config: { schema: schema.object({}) },
          params: { schema: schema.object({ foo: schema.boolean() }) },
          connector: () => {
            return 'error';
          },
        },
      });

      const result = executeUnsecure
        ? await actionExecutor.executeUnsecured(executeUnsecuredParams)
        : await actionExecutor.execute(executeParams);

      expect(result).toEqual({
        actionId: '1',
        status: 'error',
        retry: false,
        message: `error validating action type connector: config must be defined`,
        errorSource: TaskErrorSource.FRAMEWORK,
      });
    });

    test(`${label} returns error when params are invalid`, async () => {
      encryptedSavedObjectsClient.getDecryptedAsInternalUser.mockResolvedValueOnce({
        ...connectorSavedObject,
        attributes: {
          name: CONNECTOR_ID,
          actionTypeId: 'test',
        },
      });
      connectorTypeRegistry.get.mockReturnValueOnce({
        ...connectorType,
        validate: {
          config: { schema: schema.object({}) },
          secrets: { schema: schema.object({}) },
          params: {
            schema: schema.object({
              param1: schema.string(),
            }),
          },
        },
      });

      const result = executeUnsecure
        ? await actionExecutor.executeUnsecured(executeUnsecuredParams)
        : await actionExecutor.execute(executeParams);

      expect(result).toEqual({
        actionId: '1',
        status: 'error',
        retry: false,
        message: `error validating action params: [param1]: expected value of type [string] but got [undefined]`,
        errorSource: TaskErrorSource.FRAMEWORK,
      });
    });

    test(`${label} throws error when unable to read connector through saved object client`, async () => {
      encryptedSavedObjectsClient.getDecryptedAsInternalUser.mockRejectedValueOnce(
        new Error('No access')
      );

      try {
        if (executeUnsecure) {
          await actionExecutor.executeUnsecured(executeUnsecuredParams);
        } else {
          await actionExecutor.execute(executeParams);
        }
      } catch (e) {
        expect(e.message).toBe('No access');
        expect(getErrorSource(e)).toBe(TaskErrorSource.FRAMEWORK);
      }
    });

    test(`${label} throws error if connector type is not enabled`, async () => {
      encryptedSavedObjectsClient.getDecryptedAsInternalUser.mockResolvedValueOnce(
        connectorSavedObject
      );
      connectorTypeRegistry.get.mockReturnValueOnce(connectorType);
      connectorTypeRegistry.ensureActionTypeEnabled.mockImplementationOnce(() => {
        throw new Error('not enabled for test');
      });

      try {
        if (executeUnsecure) {
          await actionExecutor.executeUnsecured(executeUnsecuredParams);
        } else {
          await actionExecutor.execute(executeParams);
        }
      } catch (e) {
        expect(e.message).toBe('not enabled for test');
        expect(getErrorSource(e)).toBe(TaskErrorSource.FRAMEWORK);
      }
    });

    test(`${label} does not throw error if connector type is not enabled but connector is preconfigured`, async () => {
      encryptedSavedObjectsClient.getDecryptedAsInternalUser.mockResolvedValueOnce(
        connectorSavedObject
      );
      connectorTypeRegistry.get.mockReturnValueOnce(connectorType);
      connectorTypeRegistry.ensureActionTypeEnabled.mockImplementationOnce(() => {
        throw new Error('not enabled for test');
      });
      connectorTypeRegistry.isActionExecutable.mockImplementationOnce(() => true);

      if (executeUnsecure) {
        await actionExecutor.executeUnsecured(executeUnsecuredParams);
      } else {
        await actionExecutor.execute(executeParams);
      }

      expect(connectorTypeRegistry.ensureActionTypeEnabled).toHaveBeenCalledTimes(0);
      expect(connectorType.executor).toHaveBeenCalledWith({
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

    test(`${label} does not throw error if connector type is not enabled but connector is system action`, async () => {
      if (executeUnsecure) return;
      encryptedSavedObjectsClient.getDecryptedAsInternalUser.mockResolvedValueOnce({
        ...connectorSavedObject,
        attributes: {
          name: '1',
          actionTypeId: '.cases',
          config: {},
          secrets: {},
        },
      });
      connectorTypeRegistry.get.mockReturnValueOnce(systemConnectorType);
      connectorTypeRegistry.ensureActionTypeEnabled.mockImplementationOnce(() => {
        throw new Error('not enabled for test');
      });
      connectorTypeRegistry.isActionExecutable.mockImplementationOnce(() => true);

      await actionExecutor.execute(executeParams);

      expect(connectorTypeRegistry.ensureActionTypeEnabled).toHaveBeenCalledTimes(0);
      expect(systemConnectorType.executor).toHaveBeenCalledWith({
        actionId: '1',
        services: expect.anything(),
        config: {},
        secrets: {},
        params: { foo: true },
        logger: loggerMock,
        request: {},
      });
    });

    test(`${label} throws error if isESOCanEncrypt is false`, async () => {
      const customActionExecutor = new ActionExecutor({ isESOCanEncrypt: false });
      customActionExecutor.initialize({
        ...actionExecutorInitializationParams,
        inMemoryConnectors: [],
      });

      try {
        if (executeUnsecure) {
          await customActionExecutor.executeUnsecured(executeUnsecuredParams);
        } else {
          await customActionExecutor.execute(executeParams);
        }
      } catch (e) {
        expect(e.message).toBe(
          'Unable to execute action because the Encrypted Saved Objects plugin is missing encryption key. Please set xpack.encryptedSavedObjects.encryptionKey in the kibana.yml or use the bin/kibana-encryption-keys command.'
        );
        expect(getErrorSource(e)).toBe(TaskErrorSource.USER);
      }
    });

    test(`${label} does not throw error if isESOCanEncrypt is false but connector is preconfigured`, async () => {
      const customActionExecutor = new ActionExecutor({ isESOCanEncrypt: false });
      customActionExecutor.initialize(actionExecutorInitializationParams);

      connectorTypeRegistry.get.mockReturnValueOnce({
        ...connectorType,
        validate: {
          config: { schema: schema.object({ bar: schema.string() }) },
          secrets: { schema: schema.object({ apiKey: schema.string() }) },
          params: { schema: schema.object({ foo: schema.boolean() }) },
        },
      });

      if (executeUnsecure) {
        await customActionExecutor.executeUnsecured({
          ...executeUnsecuredParams,
          actionId: 'preconfigured',
        });
      } else {
        await customActionExecutor.execute({ ...executeParams, actionId: 'preconfigured' });
      }

      expect(encryptedSavedObjectsClient.getDecryptedAsInternalUser).not.toHaveBeenCalled();

      expect(connectorTypeRegistry.get).toHaveBeenCalledWith('test');
      expect(connectorTypeRegistry.isActionExecutable).toHaveBeenCalledWith(
        'preconfigured',
        'test',
        {
          notifyUsage: true,
        }
      );

      expect(connectorType.executor).toHaveBeenCalledWith({
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
      expect(eventLogger.logEvent).toHaveBeenCalledTimes(2);

      const execStartDoc = getBaseExecuteStartEventLogDoc(executeUnsecure);
      const execDoc = getBaseExecuteEventLogDoc(executeUnsecure);
      expect(eventLogger.logEvent).toHaveBeenNthCalledWith(1, {
        ...execStartDoc,
        kibana: {
          ...execStartDoc.kibana,
          action: {
            ...execStartDoc.kibana.action,
            id: 'preconfigured',
            name: 'Preconfigured',
          },
          saved_objects: [
            {
              id: 'preconfigured',
              namespace: 'some-namespace',
              rel: 'primary',
              type: 'action',
              type_id: 'test',
              space_agnostic: true,
            },
          ],
        },
        message: 'action started: test:preconfigured: Preconfigured',
      });
      expect(eventLogger.logEvent).toHaveBeenNthCalledWith(2, {
        ...execDoc,
        kibana: {
          ...execDoc.kibana,
          action: {
            ...execDoc.kibana.action,
            id: 'preconfigured',
            name: 'Preconfigured',
          },
          saved_objects: [
            {
              id: 'preconfigured',
              namespace: 'some-namespace',
              rel: 'primary',
              type: 'action',
              type_id: 'test',
              space_agnostic: true,
            },
          ],
        },
        message: 'action executed: test:preconfigured: Preconfigured',
      });
    });

    test(`${label} does not throw error if isESOCanEncrypt is false but connector is a system action`, async () => {
      if (executeUnsecure) return;
      const customActionExecutor = new ActionExecutor({ isESOCanEncrypt: false });
      customActionExecutor.initialize(actionExecutorInitializationParams);

      connectorTypeRegistry.get.mockReturnValueOnce(systemConnectorType);
      connectorTypeRegistry.isSystemActionType.mockReturnValueOnce(true);

      await customActionExecutor.execute({
        ...executeParams,
        actionId: 'system-connector-.cases',
      });

      expect(encryptedSavedObjectsClient.getDecryptedAsInternalUser).not.toHaveBeenCalled();

      expect(connectorTypeRegistry.get).toHaveBeenCalledWith('.cases');
      expect(connectorTypeRegistry.isActionExecutable).toHaveBeenCalledWith(
        'system-connector-.cases',
        '.cases',
        {
          notifyUsage: true,
        }
      );

      expect(systemConnectorType.executor).toHaveBeenCalledWith({
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
      expect(eventLogger.logEvent).toHaveBeenCalledTimes(2);

      const execStartDoc = getBaseExecuteStartEventLogDoc(executeUnsecure);
      const execDoc = getBaseExecuteEventLogDoc(executeUnsecure);
      expect(eventLogger.logEvent).toHaveBeenNthCalledWith(1, {
        ...execStartDoc,
        kibana: {
          ...execStartDoc.kibana,
          action: {
            ...execStartDoc.kibana.action,
            id: 'system-connector-.cases',
            name: 'System action: .cases',
          },
          saved_objects: [
            {
              id: 'system-connector-.cases',
              namespace: 'some-namespace',
              rel: 'primary',
              type: 'action',
              type_id: '.cases',
              space_agnostic: true,
            },
          ],
        },
        message: 'action started: .cases:system-connector-.cases: System action: .cases',
      });
      expect(eventLogger.logEvent).toHaveBeenNthCalledWith(2, {
        ...execDoc,
        ...(executeUnsecure
          ? { error: { message: `Cannot execute unsecured system action` } }
          : {}),
        event: {
          ...execDoc.event,
          outcome: executeUnsecure ? 'failure' : 'success',
        },
        kibana: {
          ...execDoc.kibana,
          action: {
            ...execDoc.kibana.action,
            id: 'system-connector-.cases',
            name: 'System action: .cases',
          },
          saved_objects: [
            {
              id: 'system-connector-.cases',
              namespace: 'some-namespace',
              rel: 'primary',
              type: 'action',
              type_id: '.cases',
              space_agnostic: true,
            },
          ],
        },
        message: `action ${
          executeUnsecure ? 'execution failure' : 'executed'
        }: .cases:system-connector-.cases: System action: .cases`,
      });
    });

    test(`${label} does not log warning when executor succeeds`, async () => {
      connectorType.executor.mockResolvedValueOnce({
        actionId: '1',
        status: 'ok',
      });
      encryptedSavedObjectsClient.getDecryptedAsInternalUser.mockResolvedValueOnce(
        connectorSavedObject
      );
      connectorTypeRegistry.get.mockReturnValueOnce(connectorType);

      if (executeUnsecure) {
        await actionExecutor.executeUnsecured(executeUnsecuredParams);
      } else {
        await actionExecutor.execute(executeParams);
      }
      expect(loggerMock.warn).not.toBeCalled();
    });

    test(`${label} logs warning when executor returns error gracefully`, async () => {
      connectorType.executor.mockResolvedValueOnce({
        actionId: '1',
        status: 'error',
        message: 'message for action execution error',
        serviceMessage: 'serviceMessage for action execution error',
      });
      encryptedSavedObjectsClient.getDecryptedAsInternalUser.mockResolvedValueOnce(
        connectorSavedObject
      );
      connectorTypeRegistry.get.mockReturnValueOnce(connectorType);

      if (executeUnsecure) {
        await actionExecutor.executeUnsecured(executeUnsecuredParams);
      } else {
        await actionExecutor.execute(executeParams);
      }
      expect(loggerMock.warn).toBeCalledWith(
        'action execution failure: test:1: 1: message for action execution error: serviceMessage for action execution error'
      );
    });

    test(`${label} logs warning and error when executor throws error`, async () => {
      const err = new Error('this action execution is intended to fail');
      err.stack = 'foo error\n  stack 1\n  stack 2\n  stack 3';
      connectorType.executor.mockRejectedValueOnce(err);
      encryptedSavedObjectsClient.getDecryptedAsInternalUser.mockResolvedValueOnce(
        connectorSavedObject
      );
      connectorTypeRegistry.get.mockReturnValueOnce(connectorType);

      let executorResult;
      if (executeUnsecure) {
        executorResult = await actionExecutor.executeUnsecured(executeUnsecuredParams);
      } else {
        executorResult = await actionExecutor.execute(executeParams);
      }

      expect(executorResult?.errorSource).toBe(TaskErrorSource.FRAMEWORK);
      expect(loggerMock.warn).toBeCalledWith(
        'action execution failure: test:1: 1: an error occurred while running the action: this action execution is intended to fail; retry: true'
      );
      expect(loggerMock.error).toBeCalledWith(err, {
        error: { stack_trace: 'foo error\n  stack 1\n  stack 2\n  stack 3' },
        tags: ['test', '1', 'action-run-failed'],
      });
    });

    test(`${label} logs warning when executor returns invalid status`, async () => {
      connectorType.executor.mockResolvedValueOnce({
        actionId: '1',
        // @ts-expect-error
        status: 'invalid-status',
        message: 'message for action execution error',
        serviceMessage: 'serviceMessage for action execution error',
      });
      encryptedSavedObjectsClient.getDecryptedAsInternalUser.mockResolvedValueOnce(
        connectorSavedObject
      );
      connectorTypeRegistry.get.mockReturnValueOnce(connectorType);

      if (executeUnsecure) {
        await actionExecutor.executeUnsecured(executeUnsecuredParams);
      } else {
        await actionExecutor.execute(executeParams);
      }
      expect(loggerMock.warn).toBeCalledWith(
        'action execution failure: test:1: 1: returned unexpected result "invalid-status"'
      );
    });

    test(`${label} with action type in UNALLOWED_FOR_UNSECURE_EXECUTION_CONNECTOR_TYPE_IDS list`, async () => {
      encryptedSavedObjectsClient.getDecryptedAsInternalUser.mockResolvedValueOnce({
        ...connectorSavedObject,
        attributes: {
          ...connectorSavedObject.attributes,
          actionTypeId: '.index',
        },
      });
      connectorTypeRegistry.get.mockReturnValueOnce(connectorType);
      if (executeUnsecure) {
        const result = await actionExecutor.executeUnsecured(executeUnsecuredParams);
        expect(result).toEqual({
          actionId: CONNECTOR_ID,
          errorSource: 'user',
          message:
            'Cannot execute unsecured ".index" action - execution of this type is not allowed',
          retry: false,
          status: 'error',
        });
        expect(connectorType.executor).not.toHaveBeenCalled();
      } else {
        await actionExecutor.execute(executeParams);

        expect(connectorType.executor).toHaveBeenCalledWith({
          actionId: CONNECTOR_ID,
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
      }
    });
  }
});

describe('System actions', () => {
  test('calls ensureAuthorized on system actions if additional privileges are specified', async () => {
    connectorTypeRegistry.get.mockReturnValueOnce({
      ...systemConnectorType,
      getKibanaPrivileges: () => ['test/create'],
    });
    connectorTypeRegistry.isSystemActionType.mockReturnValueOnce(true);
    connectorTypeRegistry.getSystemActionKibanaPrivileges.mockReturnValueOnce(['test/create']);

    await actionExecutor.execute({ ...executeParams, actionId: 'system-connector-.cases' });

    expect(authorizationMock.ensureAuthorized).toBeCalledWith({
      actionTypeId: '.cases',
      operation: 'execute',
      additionalPrivileges: ['test/create'],
    });
  });

  test('pass the params to the connectorTypeRegistry when authorizing system actions', async () => {
    connectorTypeRegistry.get.mockReturnValueOnce({
      ...systemConnectorType,
      getKibanaPrivileges: () => ['test/create'],
    });
    connectorTypeRegistry.isSystemActionType.mockReturnValueOnce(true);
    connectorTypeRegistry.getSystemActionKibanaPrivileges.mockReturnValueOnce(['test/create']);

    await actionExecutor.execute({
      ...executeParams,
      params: { foo: 'bar' },
      actionId: 'system-connector-.cases',
    });

    expect(connectorTypeRegistry.getSystemActionKibanaPrivileges).toHaveBeenCalledWith('.cases', {
      foo: 'bar',
    });

    expect(authorizationMock.ensureAuthorized).toBeCalledWith({
      actionTypeId: '.cases',
      operation: 'execute',
      additionalPrivileges: ['test/create'],
    });
  });
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

function setupActionExecutorMock(
  actionTypeId = 'test',
  validationOverride?: ConnectorType['validate']
) {
  const thisConnectorType: jest.Mocked<ConnectorType> = {
    ...connectorType,
    ...(validationOverride ? { validate: validationOverride } : {}),
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
  connectorTypeRegistry.get.mockReturnValueOnce(thisConnectorType);
  return thisConnectorType.executor;
}
