/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import sinon from 'sinon';
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
import { getBeforeSetup, mockedDateString } from './lib';
import { eventLoggerMock } from '@kbn/event-log-plugin/server/event_logger.mock';
import { TaskStatus } from '@kbn/task-manager-plugin/server';
import { RuleSnooze } from '../../types';

jest.mock('../../invalidate_pending_api_keys/bulk_mark_api_keys_for_invalidation', () => ({
  bulkMarkApiKeysForInvalidation: jest.fn(),
}));

jest.mock('uuid', () => ({
  v4: () => '5f6aa57d-3e22-484e-bae8-cbed868f4d28',
}));

let clock: sinon.SinonFakeTimers;

const taskManager = taskManagerMock.createStart();
const ruleTypeRegistry = ruleTypeRegistryMock.create();
const unsecuredSavedObjectsClient = savedObjectsClientMock.create();
const encryptedSavedObjects = encryptedSavedObjectsMock.createClient();
const authorization = alertingAuthorizationMock.create();
const actionsAuthorization = actionsAuthorizationMock.create();
const auditLogger = auditLoggerMock.create();
const eventLogger = eventLoggerMock.create();

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
  eventLogger,
};

describe('clearExpiredSnoozes()', () => {
  let rulesClient: RulesClient;

  beforeAll(() => {
    clock = sinon.useFakeTimers(new Date(mockedDateString));
  });
  afterAll(() => clock.restore());

  beforeEach(() => {
    clock.reset();
    getBeforeSetup(rulesClientParams, taskManager, ruleTypeRegistry);
    (auditLogger.log as jest.Mock).mockClear();
    rulesClient = new RulesClient(rulesClientParams);
    rulesClientParams.createAPIKey.mockResolvedValue({
      apiKeysEnabled: false,
    });
  });

  test('clears expired unscheduled snoozes and leaves unexpired scheduled snoozes', async () => {
    setupTestWithSnoozeSchedule([
      {
        duration: 1000,
        rRule: {
          tzid: 'UTC',
          dtstart: moment().subtract(1, 'd').toISOString(),
          count: 1,
        },
      },
      {
        id: '1',
        duration: 1000,
        rRule: {
          tzid: 'UTC',
          dtstart: moment().add(1, 'd').toISOString(),
          count: 1,
        },
      },
    ]);
    await rulesClient.clearExpiredSnoozes({ id: '1' });
    expect(unsecuredSavedObjectsClient.update).toHaveBeenCalledWith(
      'alert',
      '1',
      {
        updatedAt: '2019-02-12T21:01:22.479Z',
        updatedBy: 'elastic',
        snoozeSchedule: [
          {
            id: '1',
            duration: 1000,
            rRule: {
              tzid: 'UTC',
              dtstart: moment().add(1, 'd').toISOString(),
              count: 1,
            },
          },
        ],
      },
      {
        version: '123',
      }
    );
  });
  test('clears expired scheduled snoozes and leaves unexpired ones', async () => {
    setupTestWithSnoozeSchedule([
      {
        id: '1',
        duration: 1000,
        rRule: {
          tzid: 'UTC',
          dtstart: moment().subtract(1, 'd').toISOString(),
          count: 1,
        },
      },
      {
        id: '2',
        duration: 1000,
        rRule: {
          tzid: 'UTC',
          dtstart: moment().add(1, 'd').toISOString(),
          count: 1,
        },
      },
    ]);
    await rulesClient.clearExpiredSnoozes({ id: '1' });
    expect(unsecuredSavedObjectsClient.update).toHaveBeenCalledWith(
      'alert',
      '1',
      {
        updatedAt: '2019-02-12T21:01:22.479Z',
        updatedBy: 'elastic',
        snoozeSchedule: [
          {
            id: '2',
            duration: 1000,
            rRule: {
              tzid: 'UTC',
              dtstart: moment().add(1, 'd').toISOString(),
              count: 1,
            },
          },
        ],
      },
      {
        version: '123',
      }
    );
  });
  test('does nothing when no snoozes are expired', async () => {
    setupTestWithSnoozeSchedule([
      {
        duration: 1000 * 24 * 60 * 60 * 3, // 3 days
        rRule: {
          tzid: 'UTC',
          dtstart: moment().subtract(1, 'd').toISOString(),
          count: 1,
        },
      },
      {
        id: '2',
        duration: 1000,
        rRule: {
          tzid: 'UTC',
          dtstart: moment().add(1, 'd').toISOString(),
          count: 1,
        },
      },
    ]);
    await rulesClient.clearExpiredSnoozes({ id: '1' });
    expect(unsecuredSavedObjectsClient.update).not.toHaveBeenCalled();
  });
});

function setupTestWithSnoozeSchedule(snoozeSchedule: RuleSnooze) {
  const rule = {
    id: '1',
    type: 'alert',
    attributes: {
      name: 'name',
      consumer: 'myApp',
      schedule: { interval: '10s' },
      alertTypeId: 'myType',
      enabled: true,
      apiKey: 'MTIzOmFiYw==',
      apiKeyOwner: 'elastic',
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
      snoozeSchedule,
    },
    version: '123',
    references: [],
  };

  encryptedSavedObjects.getDecryptedAsInternalUser.mockResolvedValue(rule);
  unsecuredSavedObjectsClient.get.mockResolvedValue(rule);
  taskManager.schedule.mockResolvedValue({
    id: '1',
    scheduledAt: new Date(),
    attempts: 0,
    status: TaskStatus.Idle,
    runAt: new Date(),
    state: {},
    params: {},
    taskType: '',
    startedAt: null,
    retryAt: null,
    ownerId: null,
  });
}
