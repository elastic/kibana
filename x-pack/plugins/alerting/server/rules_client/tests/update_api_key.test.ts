/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RulesClient, ConstructorOptions } from '../rules_client';
import { savedObjectsClientMock, loggingSystemMock } from '../../../../../../src/core/server/mocks';
import { taskManagerMock } from '../../../../task_manager/server/mocks';
import { ruleTypeRegistryMock } from '../../rule_type_registry.mock';
import { alertingAuthorizationMock } from '../../authorization/alerting_authorization.mock';
import { encryptedSavedObjectsMock } from '../../../../encrypted_saved_objects/server/mocks';
import { actionsAuthorizationMock } from '../../../../actions/server/mocks';
import { AlertingAuthorization } from '../../authorization/alerting_authorization';
import { ActionsAuthorization } from '../../../../actions/server';
import { auditLoggerMock } from '../../../../security/server/audit/mocks';
import { InvalidatePendingApiKey } from '../../types';
import { getBeforeSetup, setGlobalDate } from './lib';

const taskManager = taskManagerMock.createStart();
const ruleTypeRegistry = ruleTypeRegistryMock.create();
const unsecuredSavedObjectsClient = savedObjectsClientMock.create();
const encryptedSavedObjects = encryptedSavedObjectsMock.createClient();
const authorization = alertingAuthorizationMock.create();
const actionsAuthorization = actionsAuthorizationMock.create();
const auditLogger = auditLoggerMock.create();

const kibanaVersion = 'v7.10.0';
const rulesClientParams: jest.Mocked<ConstructorOptions> = {
  taskManager,
  ruleTypeRegistry,
  unsecuredSavedObjectsClient,
  authorization: authorization as unknown as AlertingAuthorization,
  actionsAuthorization: actionsAuthorization as unknown as ActionsAuthorization,
  spaceId: 'default',
  namespace: 'default',
  minimumScheduleInterval: { value: '1m', enforce: false },
  getUserName: jest.fn(),
  createAPIKey: jest.fn(),
  logger: loggingSystemMock.create().get(),
  encryptedSavedObjectsClient: encryptedSavedObjects,
  getActionsClient: jest.fn(),
  getEventLogClient: jest.fn(),
  kibanaVersion,
  auditLogger,
};

beforeEach(() => {
  getBeforeSetup(rulesClientParams, taskManager, ruleTypeRegistry);
  (auditLogger.log as jest.Mock).mockClear();
});

setGlobalDate();

describe('updateApiKey()', () => {
  let rulesClient: RulesClient;
  const existingAlert = {
    id: '1',
    type: 'alert',
    attributes: {
      schedule: { interval: '10s' },
      alertTypeId: 'myType',
      consumer: 'myApp',
      enabled: true,
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
    },
    version: '123',
    references: [],
  };
  const existingEncryptedAlert = {
    ...existingAlert,
    attributes: {
      ...existingAlert.attributes,
      apiKey: Buffer.from('123:abc').toString('base64'),
    },
  };

  beforeEach(() => {
    rulesClient = new RulesClient(rulesClientParams);
    unsecuredSavedObjectsClient.get.mockResolvedValue(existingAlert);
    unsecuredSavedObjectsClient.create.mockResolvedValueOnce({
      id: '1',
      type: 'api_key_pending_invalidation',
      attributes: {
        apiKeyId: '234',
        createdAt: '2019-02-12T21:01:22.479Z',
      },
      references: [],
    });
    encryptedSavedObjects.getDecryptedAsInternalUser.mockResolvedValue(existingEncryptedAlert);
  });

  test('updates the API key for the alert', async () => {
    rulesClientParams.createAPIKey.mockResolvedValueOnce({
      apiKeysEnabled: true,
      result: { id: '234', name: '123', api_key: 'abc' },
    });
    await rulesClient.updateApiKey({ id: '1' });
    expect(unsecuredSavedObjectsClient.get).not.toHaveBeenCalled();
    expect(encryptedSavedObjects.getDecryptedAsInternalUser).toHaveBeenCalledWith('alert', '1', {
      namespace: 'default',
    });
    expect(unsecuredSavedObjectsClient.update).toHaveBeenCalledWith(
      'alert',
      '1',
      {
        schedule: { interval: '10s' },
        alertTypeId: 'myType',
        consumer: 'myApp',
        enabled: true,
        apiKey: Buffer.from('234:abc').toString('base64'),
        apiKeyOwner: 'elastic',
        updatedBy: 'elastic',
        updatedAt: '2019-02-12T21:01:22.479Z',
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
        meta: {
          versionApiKeyLastmodified: kibanaVersion,
        },
      },
      { version: '123' }
    );
    expect(unsecuredSavedObjectsClient.create.mock.calls[0][0]).toBe(
      'api_key_pending_invalidation'
    );
  });

  test('throws an error if API key creation throws', async () => {
    rulesClientParams.createAPIKey.mockImplementation(() => {
      throw new Error('no');
    });
    expect(
      async () => await rulesClient.updateApiKey({ id: '1' })
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      `"Error updating API key for rule: could not create API key - no"`
    );
  });

  test('falls back to SOC when getDecryptedAsInternalUser throws an error', async () => {
    rulesClientParams.createAPIKey.mockResolvedValueOnce({
      apiKeysEnabled: true,
      result: { id: '234', name: '123', api_key: 'abc' },
    });
    encryptedSavedObjects.getDecryptedAsInternalUser.mockRejectedValueOnce(new Error('Fail'));
    unsecuredSavedObjectsClient.create.mockResolvedValueOnce({
      id: '1',
      type: 'api_key_pending_invalidation',
      attributes: {
        apiKeyId: '123',
        createdAt: '2019-02-12T21:01:22.479Z',
      },
      references: [],
    });

    await rulesClient.updateApiKey({ id: '1' });
    expect(unsecuredSavedObjectsClient.get).toHaveBeenCalledWith('alert', '1');
    expect(encryptedSavedObjects.getDecryptedAsInternalUser).toHaveBeenCalledWith('alert', '1', {
      namespace: 'default',
    });
    expect(unsecuredSavedObjectsClient.update).toHaveBeenCalledWith(
      'alert',
      '1',
      {
        schedule: { interval: '10s' },
        alertTypeId: 'myType',
        consumer: 'myApp',
        enabled: true,
        apiKey: Buffer.from('234:abc').toString('base64'),
        apiKeyOwner: 'elastic',
        updatedAt: '2019-02-12T21:01:22.479Z',
        updatedBy: 'elastic',
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
        meta: {
          versionApiKeyLastmodified: kibanaVersion,
        },
      },
      { version: '123' }
    );
    expect(unsecuredSavedObjectsClient.create).not.toHaveBeenCalled();
  });

  test('swallows error when invalidate API key throws', async () => {
    unsecuredSavedObjectsClient.create.mockRejectedValueOnce(new Error('Fail'));

    await rulesClient.updateApiKey({ id: '1' });
    expect(unsecuredSavedObjectsClient.update).toHaveBeenCalled();
    expect(unsecuredSavedObjectsClient.create.mock.calls[0][0]).toBe(
      'api_key_pending_invalidation'
    );
  });

  test('swallows error when getting decrypted object throws', async () => {
    encryptedSavedObjects.getDecryptedAsInternalUser.mockRejectedValueOnce(new Error('Fail'));
    unsecuredSavedObjectsClient.create.mockResolvedValueOnce({
      id: '1',
      type: 'api_key_pending_invalidation',
      attributes: {
        apiKeyId: '234',
        createdAt: '2019-02-12T21:01:22.479Z',
      },
      references: [],
    });

    await rulesClient.updateApiKey({ id: '1' });
    expect(rulesClientParams.logger.error).toHaveBeenCalledWith(
      'updateApiKey(): Failed to load API key to invalidate on alert 1: Fail'
    );
    expect(unsecuredSavedObjectsClient.update).toHaveBeenCalled();
    expect(unsecuredSavedObjectsClient.create).not.toHaveBeenCalled();
  });

  test('throws when unsecuredSavedObjectsClient update fails and invalidates newly created API key', async () => {
    rulesClientParams.createAPIKey.mockResolvedValueOnce({
      apiKeysEnabled: true,
      result: { id: '234', name: '234', api_key: 'abc' },
    });
    unsecuredSavedObjectsClient.update.mockRejectedValueOnce(new Error('Fail'));
    unsecuredSavedObjectsClient.create.mockResolvedValueOnce({
      id: '1',
      type: 'api_key_pending_invalidation',
      attributes: {
        apiKeyId: '234',
        createdAt: '2019-02-12T21:01:22.479Z',
      },
      references: [],
    });

    await expect(rulesClient.updateApiKey({ id: '1' })).rejects.toThrowErrorMatchingInlineSnapshot(
      `"Fail"`
    );
    expect(
      (unsecuredSavedObjectsClient.create.mock.calls[0][1] as InvalidatePendingApiKey).apiKeyId
    ).toBe('234');
  });

  describe('authorization', () => {
    test('ensures user is authorised to updateApiKey this type of alert under the consumer', async () => {
      await rulesClient.updateApiKey({ id: '1' });

      expect(actionsAuthorization.ensureAuthorized).toHaveBeenCalledWith('execute');
      expect(authorization.ensureAuthorized).toHaveBeenCalledWith({
        entity: 'rule',
        consumer: 'myApp',
        operation: 'updateApiKey',
        ruleTypeId: 'myType',
      });
    });

    test('throws when user is not authorised to updateApiKey this type of alert', async () => {
      authorization.ensureAuthorized.mockRejectedValue(
        new Error(`Unauthorized to updateApiKey a "myType" alert for "myApp"`)
      );

      await expect(rulesClient.updateApiKey({ id: '1' })).rejects.toMatchInlineSnapshot(
        `[Error: Unauthorized to updateApiKey a "myType" alert for "myApp"]`
      );

      expect(authorization.ensureAuthorized).toHaveBeenCalledWith({
        entity: 'rule',
        consumer: 'myApp',
        operation: 'updateApiKey',
        ruleTypeId: 'myType',
      });
    });
  });

  describe('auditLogger', () => {
    test('logs audit event when updating the API key of a rule', async () => {
      await rulesClient.updateApiKey({ id: '1' });

      expect(auditLogger.log).toHaveBeenCalledWith(
        expect.objectContaining({
          event: expect.objectContaining({
            action: 'rule_update_api_key',
            outcome: 'unknown',
          }),
          kibana: { saved_object: { id: '1', type: 'alert' } },
        })
      );
    });

    test('logs audit event when not authorised to update the API key of a rule', async () => {
      authorization.ensureAuthorized.mockRejectedValue(new Error('Unauthorized'));

      await expect(rulesClient.updateApiKey({ id: '1' })).rejects.toThrow();
      expect(auditLogger.log).toHaveBeenCalledWith(
        expect.objectContaining({
          event: expect.objectContaining({
            outcome: 'failure',
            action: 'rule_update_api_key',
          }),
          kibana: {
            saved_object: {
              id: '1',
              type: 'alert',
            },
          },
          error: {
            code: 'Error',
            message: 'Unauthorized',
          },
        })
      );
    });
  });
});
