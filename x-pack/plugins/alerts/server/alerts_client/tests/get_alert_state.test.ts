/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { AlertsClient, ConstructorOptions } from '../alerts_client';
import { savedObjectsClientMock, loggingSystemMock } from '../../../../../../src/core/server/mocks';
import { taskManagerMock } from '../../../../task_manager/server/mocks';
import { alertTypeRegistryMock } from '../../alert_type_registry.mock';
import { alertsAuthorizationMock } from '../../authorization/alerts_authorization.mock';
import { TaskStatus } from '../../../../task_manager/server';
import { encryptedSavedObjectsMock } from '../../../../encrypted_saved_objects/server/mocks';
import { actionsAuthorizationMock } from '../../../../actions/server/mocks';
import { AlertsAuthorization } from '../../authorization/alerts_authorization';
import { ActionsAuthorization } from '../../../../actions/server';
import { getBeforeSetup } from './lib';

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

describe('getAlertState()', () => {
  test('calls saved objects client with given params', async () => {
    const alertsClient = new AlertsClient(alertsClientParams);
    unsecuredSavedObjectsClient.get.mockResolvedValueOnce({
      id: '1',
      type: 'alert',
      attributes: {
        alertTypeId: '123',
        schedule: { interval: '10s' },
        params: {
          bar: true,
        },
        actions: [
          {
            group: 'default',
            actionRef: 'action_0',
            params: {
              foo: true,
            },
          },
        ],
      },
      references: [
        {
          name: 'action_0',
          type: 'action',
          id: '1',
        },
      ],
    });

    taskManager.get.mockResolvedValueOnce({
      id: '1',
      taskType: 'alerting:123',
      scheduledAt: new Date(),
      attempts: 1,
      status: TaskStatus.Idle,
      runAt: new Date(),
      startedAt: null,
      retryAt: null,
      state: {},
      params: {},
      ownerId: null,
    });

    await alertsClient.getAlertState({ id: '1' });
    expect(unsecuredSavedObjectsClient.get).toHaveBeenCalledTimes(1);
    expect(unsecuredSavedObjectsClient.get.mock.calls[0]).toMatchInlineSnapshot(`
                                                                                                                  Array [
                                                                                                                    "alert",
                                                                                                                    "1",
                                                                                                                  ]
                                                                            `);
  });

  test('gets the underlying task from TaskManager', async () => {
    const alertsClient = new AlertsClient(alertsClientParams);

    const scheduledTaskId = 'task-123';

    unsecuredSavedObjectsClient.get.mockResolvedValueOnce({
      id: '1',
      type: 'alert',
      attributes: {
        alertTypeId: '123',
        schedule: { interval: '10s' },
        params: {
          bar: true,
        },
        actions: [
          {
            group: 'default',
            actionRef: 'action_0',
            params: {
              foo: true,
            },
          },
        ],
        enabled: true,
        scheduledTaskId,
        mutedInstanceIds: [],
        muteAll: true,
      },
      references: [
        {
          name: 'action_0',
          type: 'action',
          id: '1',
        },
      ],
    });

    taskManager.get.mockResolvedValueOnce({
      id: scheduledTaskId,
      taskType: 'alerting:123',
      scheduledAt: new Date(),
      attempts: 1,
      status: TaskStatus.Idle,
      runAt: new Date(),
      startedAt: null,
      retryAt: null,
      state: {},
      params: {
        alertId: '1',
      },
      ownerId: null,
    });

    await alertsClient.getAlertState({ id: '1' });
    expect(taskManager.get).toHaveBeenCalledTimes(1);
    expect(taskManager.get).toHaveBeenCalledWith(scheduledTaskId);
  });

  describe('authorization', () => {
    beforeEach(() => {
      unsecuredSavedObjectsClient.get.mockResolvedValueOnce({
        id: '1',
        type: 'alert',
        attributes: {
          alertTypeId: 'myType',
          consumer: 'myApp',
          schedule: { interval: '10s' },
          params: {
            bar: true,
          },
          actions: [
            {
              group: 'default',
              actionRef: 'action_0',
              params: {
                foo: true,
              },
            },
          ],
        },
        references: [
          {
            name: 'action_0',
            type: 'action',
            id: '1',
          },
        ],
      });

      taskManager.get.mockResolvedValueOnce({
        id: '1',
        taskType: 'alerting:123',
        scheduledAt: new Date(),
        attempts: 1,
        status: TaskStatus.Idle,
        runAt: new Date(),
        startedAt: null,
        retryAt: null,
        state: {},
        params: {},
        ownerId: null,
      });
    });

    test('ensures user is authorised to get this type of alert under the consumer', async () => {
      const alertsClient = new AlertsClient(alertsClientParams);
      await alertsClient.getAlertState({ id: '1' });

      expect(authorization.ensureAuthorized).toHaveBeenCalledWith(
        'myType',
        'myApp',
        'getAlertState'
      );
    });

    test('throws when user is not authorised to getAlertState this type of alert', async () => {
      const alertsClient = new AlertsClient(alertsClientParams);
      // `get` check
      authorization.ensureAuthorized.mockResolvedValueOnce();
      // `getAlertState` check
      authorization.ensureAuthorized.mockRejectedValueOnce(
        new Error(`Unauthorized to getAlertState a "myType" alert for "myApp"`)
      );

      await expect(alertsClient.getAlertState({ id: '1' })).rejects.toMatchInlineSnapshot(
        `[Error: Unauthorized to getAlertState a "myType" alert for "myApp"]`
      );

      expect(authorization.ensureAuthorized).toHaveBeenCalledWith(
        'myType',
        'myApp',
        'getAlertState'
      );
    });
  });
});
