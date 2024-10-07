/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

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
import { eventLogClientMock } from '@kbn/event-log-plugin/server/event_log_client.mock';

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
const eventLogClient = eventLogClientMock.create();
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
  getEventLogClient.mockResolvedValue(eventLogClient);
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
    preSaveHook: async (params) => {
      preSaveHook(params);
    },
    postSaveHook: async (params) => {
      postSaveHook(params);
    },
    postDeleteHook: async (params) => {
      postDeleteHook(params);
    },
  });
});

describe('connector type hooks', () => {
  describe('successful operation and successful hook', () => {
    test('create', async () => {
      unsecuredSavedObjectsClient.create.mockResolvedValueOnce(ConnectorSavedObject);
      const result = await actionsClient.create({
        action: {
          name: ConnectorSavedObject.attributes.name,
          actionTypeId: ConnectorSavedObject.attributes.actionTypeId,
          config: { foo: 42 },
          secrets: { bar: 2001 },
        },
      });
      expect(result.id).toBe(ConnectorSavedObject.id);

      expect(preSaveHook).toHaveBeenCalledTimes(1);
      expect(postSaveHook).toHaveBeenCalledTimes(1);

      expect(preSaveHook.mock.calls[0]).toEqual([
        {
          connectorId: ConnectorSavedObject.id,
          config: { foo: 42 },
          secrets: { bar: 2001 },
          logger,
          request,
          services: {
            // this will be checked with a function test
            scopedClusterClient: expect.any(Object),
          },
          isUpdate: false,
        },
      ]);
      expect(postSaveHook.mock.calls[0]).toEqual([
        {
          connectorId: ConnectorSavedObject.id,
          config: { foo: 42 },
          secrets: { bar: 2001 },
          logger,
          request,
          services: {
            // this will be checked with a function test
            scopedClusterClient: expect.any(Object),
          },
          isUpdate: false,
          wasSuccessful: true,
        },
      ]);
    });

    test('update', async () => {
      unsecuredSavedObjectsClient.get.mockResolvedValueOnce(ConnectorSavedObject);
      unsecuredSavedObjectsClient.create.mockResolvedValueOnce(ConnectorSavedObject);
      const result = await actionsClient.update({
        id: ConnectorSavedObject.id,
        action: {
          name: ConnectorSavedObject.attributes.name,
          config: { foo: 42 },
          secrets: { bar: 2001 },
        },
      });
      expect(result.id).toBe(ConnectorSavedObject.id);
      expect(preSaveHook).toHaveBeenCalledTimes(1);
      expect(postSaveHook).toHaveBeenCalledTimes(1);

      expect(preSaveHook.mock.calls[0]).toEqual([
        {
          connectorId: ConnectorSavedObject.id,
          config: { foo: 42 },
          secrets: { bar: 2001 },
          logger,
          request,
          services: {
            // this will be checked with a function test
            scopedClusterClient: expect.any(Object),
          },
          isUpdate: true,
        },
      ]);
      expect(postSaveHook.mock.calls[0]).toEqual([
        {
          connectorId: ConnectorSavedObject.id,
          config: { foo: 42 },
          secrets: { bar: 2001 },
          logger,
          request,
          services: {
            // this will be checked with a function test
            scopedClusterClient: expect.any(Object),
          },
          isUpdate: true,
          wasSuccessful: true,
        },
      ]);
    });

    test('delete', async () => {
      const expectedResult = Symbol();
      unsecuredSavedObjectsClient.delete.mockResolvedValueOnce(expectedResult);
      unsecuredSavedObjectsClient.get.mockResolvedValueOnce(ConnectorSavedObject);

      const result = await actionsClient.delete({ id: ConnectorSavedObject.id });
      expect(result).toBe(expectedResult);
      expect(postDeleteHook).toHaveBeenCalledTimes(1);

      expect(postDeleteHook.mock.calls[0]).toEqual([
        {
          connectorId: ConnectorSavedObject.id,
          config: { foo: 42 },
          secrets: { bar: 2001 },
          logger,
          request,
          services: {
            // this will be checked with a function test
            scopedClusterClient: expect.any(Object),
          },
        },
      ]);
    });
  });
});
