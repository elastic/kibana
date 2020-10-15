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

describe('delete()', () => {
  let alertsClient: AlertsClient;
  const existingAlert = {
    id: '1',
    type: 'alert',
    attributes: {
      alertTypeId: 'myType',
      consumer: 'myApp',
      schedule: { interval: '10s' },
      params: {
        bar: true,
      },
      scheduledTaskId: 'task-123',
      actions: [
        {
          group: 'default',
          actionTypeId: '.no-op',
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
  };
  const existingDecryptedAlert = {
    ...existingAlert,
    attributes: {
      ...existingAlert.attributes,
      apiKey: Buffer.from('123:abc').toString('base64'),
    },
  };

  beforeEach(() => {
    alertsClient = new AlertsClient(alertsClientParams);
    unsecuredSavedObjectsClient.get.mockResolvedValue(existingAlert);
    unsecuredSavedObjectsClient.delete.mockResolvedValue({
      success: true,
    });
    encryptedSavedObjects.getDecryptedAsInternalUser.mockResolvedValue(existingDecryptedAlert);
  });

  test('successfully removes an alert', async () => {
    const result = await alertsClient.delete({ id: '1' });
    expect(result).toEqual({ success: true });
    expect(unsecuredSavedObjectsClient.delete).toHaveBeenCalledWith('alert', '1');
    expect(taskManager.remove).toHaveBeenCalledWith('task-123');
    expect(alertsClientParams.invalidateAPIKey).toHaveBeenCalledWith({ id: '123' });
    expect(encryptedSavedObjects.getDecryptedAsInternalUser).toHaveBeenCalledWith('alert', '1', {
      namespace: 'default',
    });
    expect(unsecuredSavedObjectsClient.get).not.toHaveBeenCalled();
  });

  test('falls back to SOC.get when getDecryptedAsInternalUser throws an error', async () => {
    encryptedSavedObjects.getDecryptedAsInternalUser.mockRejectedValue(new Error('Fail'));

    const result = await alertsClient.delete({ id: '1' });
    expect(result).toEqual({ success: true });
    expect(unsecuredSavedObjectsClient.delete).toHaveBeenCalledWith('alert', '1');
    expect(taskManager.remove).toHaveBeenCalledWith('task-123');
    expect(alertsClientParams.invalidateAPIKey).not.toHaveBeenCalled();
    expect(unsecuredSavedObjectsClient.get).toHaveBeenCalledWith('alert', '1');
    expect(alertsClientParams.logger.error).toHaveBeenCalledWith(
      'delete(): Failed to load API key to invalidate on alert 1: Fail'
    );
  });

  test(`doesn't remove a task when scheduledTaskId is null`, async () => {
    encryptedSavedObjects.getDecryptedAsInternalUser.mockResolvedValue({
      ...existingDecryptedAlert,
      attributes: {
        ...existingDecryptedAlert.attributes,
        scheduledTaskId: null,
      },
    });

    await alertsClient.delete({ id: '1' });
    expect(taskManager.remove).not.toHaveBeenCalled();
  });

  test(`doesn't invalidate API key when apiKey is null`, async () => {
    encryptedSavedObjects.getDecryptedAsInternalUser.mockResolvedValue({
      ...existingAlert,
      attributes: {
        ...existingAlert.attributes,
        apiKey: null,
      },
    });

    await alertsClient.delete({ id: '1' });
    expect(alertsClientParams.invalidateAPIKey).not.toHaveBeenCalled();
  });

  test('swallows error when invalidate API key throws', async () => {
    alertsClientParams.invalidateAPIKey.mockRejectedValueOnce(new Error('Fail'));

    await alertsClient.delete({ id: '1' });
    expect(alertsClientParams.invalidateAPIKey).toHaveBeenCalledWith({ id: '123' });
    expect(alertsClientParams.logger.error).toHaveBeenCalledWith(
      'Failed to invalidate API Key: Fail'
    );
  });

  test('swallows error when getDecryptedAsInternalUser throws an error', async () => {
    encryptedSavedObjects.getDecryptedAsInternalUser.mockRejectedValue(new Error('Fail'));

    await alertsClient.delete({ id: '1' });
    expect(alertsClientParams.invalidateAPIKey).not.toHaveBeenCalled();
    expect(alertsClientParams.logger.error).toHaveBeenCalledWith(
      'delete(): Failed to load API key to invalidate on alert 1: Fail'
    );
  });

  test('throws error when unsecuredSavedObjectsClient.get throws an error', async () => {
    encryptedSavedObjects.getDecryptedAsInternalUser.mockRejectedValue(new Error('Fail'));
    unsecuredSavedObjectsClient.get.mockRejectedValue(new Error('SOC Fail'));

    await expect(alertsClient.delete({ id: '1' })).rejects.toThrowErrorMatchingInlineSnapshot(
      `"SOC Fail"`
    );
  });

  test('throws error when taskManager.remove throws an error', async () => {
    taskManager.remove.mockRejectedValue(new Error('TM Fail'));

    await expect(alertsClient.delete({ id: '1' })).rejects.toThrowErrorMatchingInlineSnapshot(
      `"TM Fail"`
    );
  });

  describe('authorization', () => {
    test('ensures user is authorised to delete this type of alert under the consumer', async () => {
      await alertsClient.delete({ id: '1' });

      expect(authorization.ensureAuthorized).toHaveBeenCalledWith('myType', 'myApp', 'delete');
    });

    test('throws when user is not authorised to delete this type of alert', async () => {
      authorization.ensureAuthorized.mockRejectedValue(
        new Error(`Unauthorized to delete a "myType" alert for "myApp"`)
      );

      await expect(alertsClient.delete({ id: '1' })).rejects.toMatchInlineSnapshot(
        `[Error: Unauthorized to delete a "myType" alert for "myApp"]`
      );

      expect(authorization.ensureAuthorized).toHaveBeenCalledWith('myType', 'myApp', 'delete');
    });
  });
});
