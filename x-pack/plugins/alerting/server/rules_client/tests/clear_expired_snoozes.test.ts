/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import sinon from 'sinon';
import { RulesClient, ConstructorOptions } from '../rules_client';
import {
  savedObjectsClientMock,
  loggingSystemMock,
  savedObjectsRepositoryMock,
  uiSettingsServiceMock,
} from '@kbn/core/server/mocks';
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
import { ConnectorAdapterRegistry } from '../../connector_adapters/connector_adapter_registry';
import { RULE_SAVED_OBJECT_TYPE } from '../../saved_objects';
import { backfillClientMock } from '../../backfill_client/backfill_client.mock';

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
const internalSavedObjectsRepository = savedObjectsRepositoryMock.create();

const kibanaVersion = 'v7.10.0';
const rulesClientParams: jest.Mocked<ConstructorOptions> = {
  taskManager,
  ruleTypeRegistry,
  unsecuredSavedObjectsClient,
  authorization: authorization as unknown as AlertingAuthorization,
  actionsAuthorization: actionsAuthorization as unknown as ActionsAuthorization,
  spaceId: 'default',
  namespace: 'default',
  maxScheduledPerMinute: 10000,
  minimumScheduleInterval: { value: '1m', enforce: false },
  getUserName: jest.fn(),
  createAPIKey: jest.fn(),
  logger: loggingSystemMock.create().get(),
  internalSavedObjectsRepository,
  encryptedSavedObjectsClient: encryptedSavedObjects,
  getActionsClient: jest.fn(),
  getEventLogClient: jest.fn(),
  kibanaVersion,
  auditLogger,
  eventLogger,
  isAuthenticationTypeAPIKey: jest.fn(),
  getAuthenticationAPIKey: jest.fn(),
  connectorAdapterRegistry: new ConnectorAdapterRegistry(),
  getAlertIndicesAlias: jest.fn(),
  alertsService: null,
  backfillClient: backfillClientMock.create(),
  uiSettings: uiSettingsServiceMock.createStartContract(),
  isSystemAction: jest.fn(),
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
    const { attributes, id } = setupTestWithSnoozeSchedule([
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
    await rulesClient.clearExpiredSnoozes({ rule: { ...attributes, id } });
    expect(unsecuredSavedObjectsClient.update).toHaveBeenCalledWith(
      RULE_SAVED_OBJECT_TYPE,
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
        refresh: false,
      }
    );
  });
  test('clears expired scheduled snoozes and leaves unexpired ones', async () => {
    const { attributes, id } = setupTestWithSnoozeSchedule([
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
    await rulesClient.clearExpiredSnoozes({ rule: { ...attributes, id } });
    expect(unsecuredSavedObjectsClient.update).toHaveBeenCalledWith(
      RULE_SAVED_OBJECT_TYPE,
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
        refresh: false,
      }
    );
  });
  test('does nothing when no snoozes are expired', async () => {
    const { attributes, id } = setupTestWithSnoozeSchedule([
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
    await rulesClient.clearExpiredSnoozes({ rule: { ...attributes, id } });
    expect(unsecuredSavedObjectsClient.update).not.toHaveBeenCalled();
  });
});

function setupTestWithSnoozeSchedule(snoozeSchedule: RuleSnooze) {
  const rule = {
    id: '1',
    type: RULE_SAVED_OBJECT_TYPE,
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
  return rule;
}
