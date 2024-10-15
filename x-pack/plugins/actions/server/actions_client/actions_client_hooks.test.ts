/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { omit } from 'lodash';
import { schema } from '@kbn/config-schema';
import { MockedLogger, loggerMock } from '@kbn/logging-mocks';
import { ActionTypeRegistry, ActionTypeRegistryOpts } from '../action_type_registry';
import { ActionsClient } from './actions_client';
import { ExecutorType } from '../types';
import { ActionExecutor, TaskRunnerFactory, ILicenseState } from '../lib';
import { taskManagerMock } from '@kbn/task-manager-plugin/server/mocks';
import { actionsConfigMock } from '../actions_config.mock';
import { licenseStateMock } from '../lib/license_state.mock';
import { licensingMock } from '@kbn/licensing-plugin/server/mocks';
import {
  httpServerMock,
  elasticsearchServiceMock,
  savedObjectsClientMock,
} from '@kbn/core/server/mocks';
import { auditLoggerMock } from '@kbn/security-plugin/server/audit/mocks';
import { usageCountersServiceMock } from '@kbn/usage-collection-plugin/server/usage_counters/usage_counters_service.mock';
import { actionExecutorMock } from '../lib/action_executor.mock';
import { ActionsAuthorization } from '../authorization/actions_authorization';
import { actionsAuthorizationMock } from '../authorization/actions_authorization.mock';
import { connectorTokenClientMock } from '../lib/connector_token_client.mock';
import { inMemoryMetricsMock } from '../monitoring/in_memory_metrics.mock';

jest.mock('uuid', () => ({
  v4: () => ConnectorSavedObject.id,
}));

const kibanaIndices = ['.kibana'];
const unsecuredSavedObjectsClient = savedObjectsClientMock.create();
const scopedClusterClient = elasticsearchServiceMock.createScopedClusterClient();
const actionExecutor = actionExecutorMock.create();
const authorization = actionsAuthorizationMock.create();
const ephemeralExecutionEnqueuer = jest.fn();
const bulkExecutionEnqueuer = jest.fn();
const request = httpServerMock.createKibanaRequest();
const auditLogger = auditLoggerMock.create();
const mockUsageCountersSetup = usageCountersServiceMock.createSetupContract();
const mockUsageCounter = mockUsageCountersSetup.createUsageCounter('test');
const mockTaskManager = taskManagerMock.createSetup();
const getEventLogClient = jest.fn();
const preSaveHook = jest.fn();
const postSaveHook = jest.fn();
const postDeleteHook = jest.fn();

let actionsClient: ActionsClient;
let mockedLicenseState: jest.Mocked<ILicenseState>;
let actionTypeRegistry: ActionTypeRegistry;
let actionTypeRegistryParams: ActionTypeRegistryOpts;
const executor: ExecutorType<{}, {}, {}, void> = async (options) => {
  return { status: 'ok', actionId: options.actionId };
};

const ConnectorSavedObject = {
  id: 'connector-id-uuid',
  type: 'action',
  attributes: {
    actionTypeId: 'hooked-action-type',
    isMissingSecrets: false,
    name: 'Hooked Action',
    config: { foo: 42 },
    secrets: { bar: 2001 },
  },
  references: [],
};

const CreateParms = {
  action: {
    name: ConnectorSavedObject.attributes.name,
    actionTypeId: ConnectorSavedObject.attributes.actionTypeId,
    config: ConnectorSavedObject.attributes.config,
    secrets: ConnectorSavedObject.attributes.secrets,
  },
};

const UpdateParms = {
  id: ConnectorSavedObject.id,
  action: {
    name: ConnectorSavedObject.attributes.name,
    config: ConnectorSavedObject.attributes.config,
    secrets: ConnectorSavedObject.attributes.secrets,
  },
};

const CoreHookParams = {
  connectorId: ConnectorSavedObject.id,
  config: ConnectorSavedObject.attributes.config,
  secrets: ConnectorSavedObject.attributes.secrets,
  request,
  services: {
    // this will be checked with a function test
    scopedClusterClient: expect.any(Object),
  },
};

const connectorTokenClient = connectorTokenClientMock.create();
const inMemoryMetrics = inMemoryMetricsMock.create();

let logger: MockedLogger;

beforeEach(() => {
  jest.resetAllMocks();
  logger = loggerMock.create();
  mockedLicenseState = licenseStateMock.create();

  actionTypeRegistryParams = {
    licensing: licensingMock.createSetup(),
    taskManager: mockTaskManager,
    taskRunnerFactory: new TaskRunnerFactory(
      new ActionExecutor({ isESOCanEncrypt: true }),
      inMemoryMetrics
    ),
    actionsConfigUtils: actionsConfigMock.create(),
    licenseState: mockedLicenseState,
    inMemoryConnectors: [],
  };

  actionTypeRegistry = new ActionTypeRegistry(actionTypeRegistryParams);
  actionsClient = new ActionsClient({
    logger,
    actionTypeRegistry,
    unsecuredSavedObjectsClient,
    scopedClusterClient,
    kibanaIndices,
    inMemoryConnectors: [],
    actionExecutor,
    ephemeralExecutionEnqueuer,
    bulkExecutionEnqueuer,
    request,
    authorization: authorization as unknown as ActionsAuthorization,
    auditLogger,
    usageCounter: mockUsageCounter,
    connectorTokenClient,
    getEventLogClient,
  });

  actionTypeRegistry.register({
    id: 'hooked-action-type',
    name: 'Hooked action type',
    minimumLicenseRequired: 'gold',
    supportedFeatureIds: ['alerting'],
    validate: {
      config: { schema: schema.object({ foo: schema.number() }) },
      secrets: { schema: schema.object({ bar: schema.number() }) },
      params: { schema: schema.object({}) },
    },
    executor,
    preSaveHook,
    postSaveHook,
    postDeleteHook,
  });
});

describe('connector type hooks', () => {
  describe('successful operation and successful hook', () => {
    test('for create', async () => {
      unsecuredSavedObjectsClient.create.mockResolvedValueOnce(ConnectorSavedObject);
      const result = await actionsClient.create(CreateParms);
      expect(result.id).toBe(ConnectorSavedObject.id);

      const preParams = { ...CoreHookParams, logger, isUpdate: false };
      const postParams = { ...preParams, wasSuccessful: true };

      expect(preSaveHook).toHaveBeenCalledTimes(1);
      expect(preSaveHook.mock.calls[0]).toStrictEqual([preParams]);

      expect(postSaveHook).toHaveBeenCalledTimes(1);
      expect(postSaveHook.mock.calls[0]).toStrictEqual([postParams]);
    });

    test('for update', async () => {
      unsecuredSavedObjectsClient.get.mockResolvedValueOnce(ConnectorSavedObject);
      unsecuredSavedObjectsClient.create.mockResolvedValueOnce(ConnectorSavedObject);
      const result = await actionsClient.update(UpdateParms);
      expect(result.id).toBe(ConnectorSavedObject.id);

      const preParams = { ...CoreHookParams, logger, isUpdate: true };
      const postParams = { ...preParams, wasSuccessful: true };

      expect(preSaveHook).toHaveBeenCalledTimes(1);
      expect(preSaveHook.mock.calls[0]).toStrictEqual([preParams]);

      expect(postSaveHook).toHaveBeenCalledTimes(1);
      expect(postSaveHook.mock.calls[0]).toStrictEqual([postParams]);
    });

    test('for delete', async () => {
      const expectedResult = Symbol();
      unsecuredSavedObjectsClient.delete.mockResolvedValueOnce(expectedResult);
      unsecuredSavedObjectsClient.get.mockResolvedValueOnce(ConnectorSavedObject);

      const result = await actionsClient.delete({ id: ConnectorSavedObject.id });
      expect(result).toBe(expectedResult);

      const postParamsWithSecrets = { ...CoreHookParams, logger };
      const postParams = omit(postParamsWithSecrets, 'secrets');

      expect(postDeleteHook).toHaveBeenCalledTimes(1);
      expect(postDeleteHook.mock.calls[0]).toEqual([postParams]);
    });
  });

  describe('unsuccessful operation and successful hook', () => {
    test('for create', async () => {
      unsecuredSavedObjectsClient.create.mockRejectedValueOnce(new Error('OMG create'));
      await expect(actionsClient.create(CreateParms)).rejects.toMatchInlineSnapshot(
        `[Error: OMG create]`
      );

      const preParams = { ...CoreHookParams, logger, isUpdate: false };
      const postParams = { ...preParams, wasSuccessful: false };

      expect(preSaveHook).toHaveBeenCalledTimes(1);
      expect(preSaveHook.mock.calls[0]).toStrictEqual([preParams]);

      expect(postSaveHook).toHaveBeenCalledTimes(1);
      expect(postSaveHook.mock.calls[0]).toStrictEqual([postParams]);
    });

    test('for update', async () => {
      unsecuredSavedObjectsClient.get.mockResolvedValueOnce(ConnectorSavedObject);
      unsecuredSavedObjectsClient.create.mockRejectedValueOnce(new Error('OMG update'));
      await expect(actionsClient.update(UpdateParms)).rejects.toMatchInlineSnapshot(
        `[Error: OMG update]`
      );

      const preParams = { ...CoreHookParams, logger, isUpdate: true };
      const postParams = { ...preParams, wasSuccessful: false };

      expect(preSaveHook).toHaveBeenCalledTimes(1);
      expect(preSaveHook.mock.calls[0]).toStrictEqual([preParams]);

      expect(postSaveHook).toHaveBeenCalledTimes(1);
      expect(postSaveHook.mock.calls[0]).toStrictEqual([postParams]);
    });

    test('for delete', async () => {
      unsecuredSavedObjectsClient.get.mockResolvedValueOnce(ConnectorSavedObject);
      unsecuredSavedObjectsClient.delete.mockRejectedValueOnce(new Error('OMG delete'));

      await expect(
        actionsClient.delete({ id: ConnectorSavedObject.id })
      ).rejects.toMatchInlineSnapshot(`[Error: OMG delete]`);

      expect(postDeleteHook).toHaveBeenCalledTimes(0);
    });
  });

  describe('successful operation and unsuccessful hook', () => {
    test('for create pre hook', async () => {
      preSaveHook.mockRejectedValueOnce(new Error('OMG create pre save'));

      await expect(actionsClient.create(CreateParms)).rejects.toMatchInlineSnapshot(
        `[Error: OMG create pre save]`
      );

      const preParams = { ...CoreHookParams, logger, isUpdate: false };

      expect(preSaveHook).toHaveBeenCalledTimes(1);
      expect(preSaveHook.mock.calls[0]).toStrictEqual([preParams]);

      expect(unsecuredSavedObjectsClient.create).toHaveBeenCalledTimes(0);
      expect(postSaveHook).toHaveBeenCalledTimes(0);
    });

    test('for create post hook', async () => {
      postSaveHook.mockRejectedValueOnce(new Error('OMG create post save'));

      unsecuredSavedObjectsClient.create.mockResolvedValueOnce(ConnectorSavedObject);
      const result = await actionsClient.create(CreateParms);
      expect(result.id).toBe(ConnectorSavedObject.id);

      const preParams = { ...CoreHookParams, logger, isUpdate: false };
      const postParams = { ...preParams, wasSuccessful: true };

      expect(preSaveHook).toHaveBeenCalledTimes(1);
      expect(preSaveHook.mock.calls[0]).toStrictEqual([preParams]);

      expect(postSaveHook).toHaveBeenCalledTimes(1);
      expect(postSaveHook.mock.calls[0]).toStrictEqual([postParams]);
      expect(logger.error).toHaveBeenCalledTimes(1);
      expect(logger.error.mock.calls).toMatchInlineSnapshot(`
        Array [
          Array [
            "postSaveHook create error for connectorId: \\"connector-id-uuid\\"; type: hooked-action-type: OMG create post save",
            Object {
              "tags": Array [
                "post-save-hook",
                "connector-id-uuid",
              ],
            },
          ],
        ]
      `);
    });

    test('for update pre hook', async () => {
      preSaveHook.mockRejectedValueOnce(new Error('OMG update pre save'));

      unsecuredSavedObjectsClient.get.mockResolvedValueOnce(ConnectorSavedObject);
      unsecuredSavedObjectsClient.create.mockResolvedValueOnce(ConnectorSavedObject);
      await expect(actionsClient.update(UpdateParms)).rejects.toMatchInlineSnapshot(
        `[Error: OMG update pre save]`
      );

      const preParams = { ...CoreHookParams, logger, isUpdate: true };

      expect(preSaveHook).toHaveBeenCalledTimes(1);
      expect(preSaveHook.mock.calls[0]).toStrictEqual([preParams]);

      expect(unsecuredSavedObjectsClient.create).toHaveBeenCalledTimes(0);
      expect(postSaveHook).toHaveBeenCalledTimes(0);
    });

    test('for update post hook', async () => {
      postSaveHook.mockRejectedValueOnce(new Error('OMG update post save'));

      unsecuredSavedObjectsClient.get.mockResolvedValueOnce(ConnectorSavedObject);
      unsecuredSavedObjectsClient.create.mockResolvedValueOnce(ConnectorSavedObject);
      const result = await actionsClient.update(UpdateParms);
      expect(result.id).toBe(ConnectorSavedObject.id);

      const preParams = { ...CoreHookParams, logger, isUpdate: true };
      const postParams = { ...preParams, wasSuccessful: true };

      expect(preSaveHook).toHaveBeenCalledTimes(1);
      expect(preSaveHook.mock.calls[0]).toStrictEqual([preParams]);

      expect(postSaveHook).toHaveBeenCalledTimes(1);
      expect(postSaveHook.mock.calls[0]).toStrictEqual([postParams]);
      expect(logger.error).toHaveBeenCalledTimes(1);
      expect(logger.error.mock.calls).toMatchInlineSnapshot(`
        Array [
          Array [
            "postSaveHook update error for connectorId: \\"connector-id-uuid\\"; type: hooked-action-type: OMG update post save",
            Object {
              "tags": Array [
                "post-save-hook",
                "connector-id-uuid",
              ],
            },
          ],
        ]
      `);
    });

    test('for delete post hook', async () => {
      postDeleteHook.mockRejectedValueOnce(new Error('OMG delete post delete'));

      const expectedResult = Symbol();
      unsecuredSavedObjectsClient.delete.mockResolvedValueOnce(expectedResult);
      unsecuredSavedObjectsClient.get.mockResolvedValueOnce(ConnectorSavedObject);

      const result = await actionsClient.delete({ id: ConnectorSavedObject.id });
      expect(result).toBe(expectedResult);

      const postParamsWithSecrets = { ...CoreHookParams, logger };
      const postParams = omit(postParamsWithSecrets, 'secrets');

      expect(postDeleteHook).toHaveBeenCalledTimes(1);
      expect(postDeleteHook.mock.calls[0]).toEqual([postParams]);
      expect(logger.error).toHaveBeenCalledTimes(1);
      expect(logger.error.mock.calls).toMatchInlineSnapshot(`
        Array [
          Array [
            "The post delete hook failed for for connector \\"connector-id-uuid\\": OMG delete post delete",
            Object {
              "tags": Array [
                "post-delete-hook",
                "connector-id-uuid",
              ],
            },
          ],
        ]
      `);
    });
  });
});
