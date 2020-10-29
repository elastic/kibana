/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { AlertsClient, ConstructorOptions } from '../alerts_client';
import { savedObjectsClientMock, loggingSystemMock } from '../../../../../../src/core/server/mocks';
import { alertTypeRegistryMock } from '../../alert_type_registry.mock';
import { alertsAuthorizationMock } from '../../authorization/alerts_authorization.mock';
import { encryptedSavedObjectsMock } from '../../../../encrypted_saved_objects/server/mocks';
import { actionsAuthorizationMock } from '../../../../actions/server/mocks';
import { AlertsAuthorization } from '../../authorization/alerts_authorization';
import { ActionsAuthorization } from '../../../../actions/server';
import { getBeforeSetup } from './lib';
import { AlertExecutionStatusErrorReasons, HealthStatus } from '../../types';
import { taskManagerMock } from '../../../../task_manager/server/mocks';

const taskManager = taskManagerMock.createStart();
const alertTypeRegistry = alertTypeRegistryMock.create();
const unsecuredSavedObjectsClient = savedObjectsClientMock.create();
const encryptedSavedObjects = encryptedSavedObjectsMock.createClient();
const authorization = alertsAuthorizationMock.create();
const actionsAuthorization = actionsAuthorizationMock.create();

const kibanaVersion = 'v7.10.0';
const alertsClientParams: jest.Mocked<ConstructorOptions> = {
  taskManager,
  alertTypeRegistry,
  unsecuredSavedObjectsClient,
  authorization: (authorization as unknown) as AlertsAuthorization,
  actionsAuthorization: (actionsAuthorization as unknown) as ActionsAuthorization,
  spaceId: 'default',
  namespace: 'default',
  getUserName: jest.fn(),
  createAPIKey: jest.fn(),
  invalidateAPIKey: jest.fn(),
  logger: loggingSystemMock.create().get(),
  encryptedSavedObjectsClient: encryptedSavedObjects,
  getActionsClient: jest.fn(),
  getEventLogClient: jest.fn(),
  kibanaVersion,
};

beforeEach(() => {
  getBeforeSetup(alertsClientParams, taskManager, alertTypeRegistry);
});

describe('getHealth()', () => {
  const listedTypes = new Set([
    {
      actionGroups: [],
      actionVariables: undefined,
      defaultActionGroupId: 'default',
      id: 'myType',
      name: 'myType',
      producer: 'myApp',
    },
  ]);
  beforeAll(() => {
    alertTypeRegistry.list.mockReturnValue(listedTypes);
  });

  test('return true if some of alerts has a decryption error', async () => {
    const lastExecutionDateError = new Date().toISOString();
    const lastExecutionDate = new Date().toISOString();
    unsecuredSavedObjectsClient.find.mockResolvedValueOnce({
      total: 2,
      per_page: 10,
      page: 1,
      saved_objects: [
        {
          id: '1',
          type: 'alert',
          attributes: {
            alertTypeId: 'myType',
            schedule: { interval: '10s' },
            params: {
              bar: true,
            },
            createdAt: new Date().toISOString(),
            actions: [
              {
                group: 'default',
                actionRef: 'action_0',
                params: {
                  foo: true,
                },
              },
            ],
            executionStatus: {
              status: 'error',
              lastExecutionDate: lastExecutionDateError,
              error: {
                reason: AlertExecutionStatusErrorReasons.Decrypt,
                message: 'Failed decrypt',
              },
            },
          },
          score: 1,
          references: [
            {
              name: 'action_0',
              type: 'action',
              id: '1',
            },
          ],
        },
        {
          id: '2',
          type: 'alert',
          attributes: {
            alertTypeId: 'myType',
            schedule: { interval: '1s' },
            params: {
              bar: true,
            },
            createdAt: new Date().toISOString(),
            actions: [],
            executionStatus: {
              status: 'ok',
              lastExecutionDate,
            },
          },
          score: 1,
          references: [],
        },
      ],
    });
    const alertsClient = new AlertsClient(alertsClientParams);
    const result = await alertsClient.getHealth();
    expect(result).toStrictEqual({
      executionHealth: {
        status: HealthStatus.OK,
        timestamp: lastExecutionDateError,
      },
      readHealth: {
        status: HealthStatus.OK,
        timestamp: lastExecutionDate,
      },
      decryptionHealth: {
        status: HealthStatus.Warning,
        timestamp: lastExecutionDate,
      },
    });
    expect(unsecuredSavedObjectsClient.find).toHaveBeenCalledTimes(1);
  });

  test('return false if no alerts with a decryption error', async () => {
    const lastExecutionDateError = new Date().toISOString();
    const lastExecutionDate = new Date().toISOString();
    unsecuredSavedObjectsClient.find.mockResolvedValueOnce({
      total: 2,
      per_page: 10,
      page: 1,
      saved_objects: [
        {
          id: '1',
          type: 'alert',
          attributes: {
            alertTypeId: 'myType',
            schedule: { interval: '10s' },
            params: {
              bar: true,
            },
            createdAt: new Date().toISOString(),
            actions: [
              {
                group: 'default',
                actionRef: 'action_0',
                params: {
                  foo: true,
                },
              },
            ],
            executionStatus: {
              status: 'error',
              lastExecutionDate: lastExecutionDateError,
              error: {
                reason: AlertExecutionStatusErrorReasons.Execute,
                message: 'Failed',
              },
            },
          },
          score: 1,
          references: [
            {
              name: 'action_0',
              type: 'action',
              id: '1',
            },
          ],
        },
        {
          id: '2',
          type: 'alert',
          attributes: {
            alertTypeId: 'myType',
            schedule: { interval: '1s' },
            params: {
              bar: true,
            },
            createdAt: new Date().toISOString(),
            actions: [],
            executionStatus: {
              status: 'ok',
              lastExecutionDate,
            },
          },
          score: 1,
          references: [],
        },
      ],
    });
    const alertsClient = new AlertsClient(alertsClientParams);
    const result = await alertsClient.getHealth();
    expect(result).toStrictEqual({
      executionHealth: {
        status: HealthStatus.Warning,
        timestamp: lastExecutionDate,
      },
      readHealth: {
        status: HealthStatus.OK,
        timestamp: lastExecutionDate,
      },
      decryptionHealth: {
        status: HealthStatus.OK,
        timestamp: lastExecutionDateError,
      },
    });
  });
});
