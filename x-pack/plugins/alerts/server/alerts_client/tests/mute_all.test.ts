/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { AlertsClient, ConstructorOptions } from '../alerts_client';
import { savedObjectsClientMock, loggingSystemMock } from '../../../../../../src/core/server/mocks';
import { taskManagerMock } from '../../../../task_manager/server/task_manager.mock';
import { alertTypeRegistryMock } from '../../alert_type_registry.mock';
import { alertsAuthorizationMock } from '../../authorization/alerts_authorization.mock';
import { encryptedSavedObjectsMock } from '../../../../encrypted_saved_objects/server/mocks';
import { actionsAuthorizationMock } from '../../../../actions/server/mocks';
import { AlertsAuthorization } from '../../authorization/alerts_authorization';
import { ActionsAuthorization } from '../../../../actions/server';
import { getBeforeSetup } from './lib';

const taskManager = taskManagerMock.start();
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

describe('muteAll()', () => {
  test('mutes an alert', async () => {
    const alertsClient = new AlertsClient(alertsClientParams);
    unsecuredSavedObjectsClient.get.mockResolvedValueOnce({
      id: '1',
      type: 'alert',
      attributes: {
        actions: [
          {
            group: 'default',
            id: '1',
            actionTypeId: '1',
            actionRef: '1',
            params: {
              foo: true,
            },
          },
        ],
        muteAll: false,
      },
      references: [],
      version: '123',
    });

    await alertsClient.muteAll({ id: '1' });
    expect(unsecuredSavedObjectsClient.update).toHaveBeenCalledWith(
      'alert',
      '1',
      {
        muteAll: true,
        mutedInstanceIds: [],
        updatedBy: 'elastic',
      },
      {
        version: '123',
      }
    );
  });

  describe('authorization', () => {
    beforeEach(() => {
      unsecuredSavedObjectsClient.get.mockResolvedValueOnce({
        id: '1',
        type: 'alert',
        attributes: {
          actions: [
            {
              group: 'default',
              id: '1',
              actionTypeId: '1',
              actionRef: '1',
              params: {
                foo: true,
              },
            },
          ],
          consumer: 'myApp',
          schedule: { interval: '10s' },
          alertTypeId: 'myType',
          apiKey: null,
          apiKeyOwner: null,
          enabled: false,
          scheduledTaskId: null,
          updatedBy: 'elastic',
          muteAll: false,
        },
        references: [],
      });
    });

    test('ensures user is authorised to muteAll this type of alert under the consumer', async () => {
      const alertsClient = new AlertsClient(alertsClientParams);
      await alertsClient.muteAll({ id: '1' });

      expect(authorization.ensureAuthorized).toHaveBeenCalledWith('myType', 'myApp', 'muteAll');
      expect(actionsAuthorization.ensureAuthorized).toHaveBeenCalledWith('execute');
    });

    test('throws when user is not authorised to muteAll this type of alert', async () => {
      const alertsClient = new AlertsClient(alertsClientParams);
      authorization.ensureAuthorized.mockRejectedValue(
        new Error(`Unauthorized to muteAll a "myType" alert for "myApp"`)
      );

      await expect(alertsClient.muteAll({ id: '1' })).rejects.toMatchInlineSnapshot(
        `[Error: Unauthorized to muteAll a "myType" alert for "myApp"]`
      );

      expect(authorization.ensureAuthorized).toHaveBeenCalledWith('myType', 'myApp', 'muteAll');
    });
  });
});
