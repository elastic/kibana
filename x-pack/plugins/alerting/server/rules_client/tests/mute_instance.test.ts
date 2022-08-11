/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RulesClient, ConstructorOptions } from '../rules_client';
import { savedObjectsClientMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { taskManagerMock } from '@kbn/task-manager-plugin/server/mocks';
import { ruleTypeRegistryMock } from '../../rule_type_registry.mock';
import { alertingAuthorizationMock } from '../../authorization/alerting_authorization.mock';
import { encryptedSavedObjectsMock } from '@kbn/encrypted-saved-objects-plugin/server/mocks';
import { actionsAuthorizationMock } from '@kbn/actions-plugin/server/mocks';
import { AlertingAuthorization } from '../../authorization/alerting_authorization';
import { ActionsAuthorization } from '@kbn/actions-plugin/server';
import { auditLoggerMock } from '@kbn/security-plugin/server/audit/mocks';
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
};

beforeEach(() => {
  getBeforeSetup(rulesClientParams, taskManager, ruleTypeRegistry);
  (auditLogger.log as jest.Mock).mockClear();
});

setGlobalDate();

describe('muteInstance()', () => {
  test('mutes an alert instance', async () => {
    const rulesClient = new RulesClient(rulesClientParams);
    unsecuredSavedObjectsClient.get.mockResolvedValueOnce({
      id: '1',
      type: 'alert',
      attributes: {
        actions: [],
        schedule: { interval: '10s' },
        alertTypeId: '2',
        enabled: true,
        scheduledTaskId: 'task-123',
        mutedInstanceIds: [],
      },
      version: '123',
      references: [],
    });

    await rulesClient.muteInstance({ alertId: '1', alertInstanceId: '2' });
    expect(unsecuredSavedObjectsClient.update).toHaveBeenCalledWith(
      'alert',
      '1',
      {
        mutedInstanceIds: ['2'],
        updatedAt: '2019-02-12T21:01:22.479Z',
        updatedBy: 'elastic',
      },
      {
        version: '123',
      }
    );
  });

  test('skips muting when alert instance already muted', async () => {
    const rulesClient = new RulesClient(rulesClientParams);
    unsecuredSavedObjectsClient.get.mockResolvedValueOnce({
      id: '1',
      type: 'alert',
      attributes: {
        actions: [],
        schedule: { interval: '10s' },
        alertTypeId: '2',
        enabled: true,
        scheduledTaskId: 'task-123',
        mutedInstanceIds: ['2'],
      },
      references: [],
    });

    await rulesClient.muteInstance({ alertId: '1', alertInstanceId: '2' });
    expect(unsecuredSavedObjectsClient.create).not.toHaveBeenCalled();
  });

  test('skips muting when alert is muted', async () => {
    const rulesClient = new RulesClient(rulesClientParams);
    unsecuredSavedObjectsClient.get.mockResolvedValueOnce({
      id: '1',
      type: 'alert',
      attributes: {
        actions: [],
        schedule: { interval: '10s' },
        alertTypeId: '2',
        enabled: true,
        scheduledTaskId: 'task-123',
        mutedInstanceIds: [],
        muteAll: true,
      },
      references: [],
    });

    await rulesClient.muteInstance({ alertId: '1', alertInstanceId: '2' });
    expect(unsecuredSavedObjectsClient.create).not.toHaveBeenCalled();
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
          schedule: { interval: '10s' },
          alertTypeId: 'myType',
          consumer: 'myApp',
          enabled: true,
          scheduledTaskId: 'task-123',
          mutedInstanceIds: [],
        },
        version: '123',
        references: [],
      });
    });

    test('ensures user is authorised to muteInstance this type of alert under the consumer', async () => {
      const rulesClient = new RulesClient(rulesClientParams);
      await rulesClient.muteInstance({ alertId: '1', alertInstanceId: '2' });

      expect(actionsAuthorization.ensureAuthorized).toHaveBeenCalledWith('execute');
      expect(authorization.ensureAuthorized).toHaveBeenCalledWith({
        entity: 'rule',
        consumer: 'myApp',
        operation: 'muteAlert',
        ruleTypeId: 'myType',
      });
    });

    test('throws when user is not authorised to muteInstance this type of alert', async () => {
      const rulesClient = new RulesClient(rulesClientParams);
      authorization.ensureAuthorized.mockRejectedValue(
        new Error(`Unauthorized to muteAlert a "myType" alert for "myApp"`)
      );

      await expect(
        rulesClient.muteInstance({ alertId: '1', alertInstanceId: '2' })
      ).rejects.toMatchInlineSnapshot(
        `[Error: Unauthorized to muteAlert a "myType" alert for "myApp"]`
      );

      expect(authorization.ensureAuthorized).toHaveBeenCalledWith({
        entity: 'rule',
        consumer: 'myApp',
        operation: 'muteAlert',
        ruleTypeId: 'myType',
      });
    });
  });

  describe('auditLogger', () => {
    test('logs audit event when muting an alert', async () => {
      const rulesClient = new RulesClient({ ...rulesClientParams, auditLogger });
      unsecuredSavedObjectsClient.get.mockResolvedValueOnce({
        id: '1',
        type: 'alert',
        attributes: {
          actions: [],
          schedule: { interval: '10s' },
          alertTypeId: '2',
          enabled: true,
          scheduledTaskId: 'task-123',
          mutedInstanceIds: [],
        },
        version: '123',
        references: [],
      });
      await rulesClient.muteInstance({ alertId: '1', alertInstanceId: '2' });
      expect(auditLogger.log).toHaveBeenCalledWith(
        expect.objectContaining({
          event: expect.objectContaining({
            action: 'rule_alert_mute',
            outcome: 'unknown',
          }),
          kibana: { saved_object: { id: '1', type: 'alert' } },
        })
      );
    });

    test('logs audit event when not authorised to mute an alert', async () => {
      const rulesClient = new RulesClient({ ...rulesClientParams, auditLogger });
      unsecuredSavedObjectsClient.get.mockResolvedValueOnce({
        id: '1',
        type: 'alert',
        attributes: {
          actions: [],
          schedule: { interval: '10s' },
          alertTypeId: '2',
          enabled: true,
          scheduledTaskId: 'task-123',
          mutedInstanceIds: [],
        },
        version: '123',
        references: [],
      });
      authorization.ensureAuthorized.mockRejectedValue(new Error('Unauthorized'));

      await expect(
        rulesClient.muteInstance({ alertId: '1', alertInstanceId: '2' })
      ).rejects.toThrow();
      expect(auditLogger.log).toHaveBeenCalledWith(
        expect.objectContaining({
          event: expect.objectContaining({
            action: 'rule_alert_mute',
            outcome: 'failure',
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
