/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { RulesClient, ConstructorOptions } from '../../../../rules_client/rules_client';
import {
  savedObjectsClientMock,
  savedObjectsRepositoryMock,
  uiSettingsServiceMock,
} from '@kbn/core/server/mocks';
import { taskManagerMock } from '@kbn/task-manager-plugin/server/mocks';
import { encryptedSavedObjectsMock } from '@kbn/encrypted-saved-objects-plugin/server/mocks';
import { actionsAuthorizationMock } from '@kbn/actions-plugin/server/mocks';
import { ActionsAuthorization } from '@kbn/actions-plugin/server';
import { auditLoggerMock } from '@kbn/security-plugin/server/audit/mocks';
import { loggerMock } from '@kbn/logging-mocks';
import { ruleTypeRegistryMock } from '../../../../rule_type_registry.mock';
import { alertingAuthorizationMock } from '../../../../authorization/alerting_authorization.mock';
import { AlertingAuthorization } from '../../../../authorization/alerting_authorization';
import { alertsServiceMock } from '../../../../alerts_service/alerts_service.mock';
import { ALERT_RULE_UUID, ALERT_UUID } from '@kbn/rule-data-utils';
import { ConcreteTaskInstance, TaskStatus } from '@kbn/task-manager-plugin/server';
import { ConnectorAdapterRegistry } from '../../../../connector_adapters/connector_adapter_registry';
import { DEFAULT_MAX_ALERTS } from '../../../../config';

const taskManager = taskManagerMock.createStart();
const ruleTypeRegistry = ruleTypeRegistryMock.create();
const unsecuredSavedObjectsClient = savedObjectsClientMock.create();
const encryptedSavedObjects = encryptedSavedObjectsMock.createClient();
const authorization = alertingAuthorizationMock.create();
const actionsAuthorization = actionsAuthorizationMock.create();
const auditLogger = auditLoggerMock.create();
const logger = loggerMock.create();
const internalSavedObjectsRepository = savedObjectsRepositoryMock.create();

const alertsService = alertsServiceMock.create();

const kibanaVersion = 'v8.2.0';
const createAPIKeyMock = jest.fn();
const rulesClientParams: jest.Mocked<ConstructorOptions> = {
  taskManager,
  ruleTypeRegistry,
  unsecuredSavedObjectsClient,
  authorization: authorization as unknown as AlertingAuthorization,
  actionsAuthorization: actionsAuthorization as unknown as ActionsAuthorization,
  spaceId: 'default',
  namespace: 'default',
  getUserName: jest.fn(),
  createAPIKey: createAPIKeyMock,
  logger,
  internalSavedObjectsRepository,
  encryptedSavedObjectsClient: encryptedSavedObjects,
  getActionsClient: jest.fn(),
  getEventLogClient: jest.fn(),
  kibanaVersion,
  auditLogger,
  maxScheduledPerMinute: 10000,
  minimumScheduleInterval: { value: '1m', enforce: false },
  isAuthenticationTypeAPIKey: jest.fn(),
  getAuthenticationAPIKey: jest.fn(),
  getAlertIndicesAlias: jest.fn(),
  alertsService,
  uiSettings: uiSettingsServiceMock.createStartContract(),
  isSystemAction: jest.fn(),
  connectorAdapterRegistry: new ConnectorAdapterRegistry(),
  maxAlertsPerRun: DEFAULT_MAX_ALERTS,
};

describe('bulkUntrackAlerts()', () => {
  let rulesClient: RulesClient;
  beforeEach(async () => {
    rulesClient = new RulesClient(rulesClientParams);
  });

  it('should untrack alert documents and update task states', async () => {
    alertsService.setAlertsToUntracked.mockResolvedValueOnce([
      {
        [ALERT_RULE_UUID]:
          'did you know that you can put whatever you want into these mocked values',
        [ALERT_UUID]: "it's true",
      },
    ]);

    await rulesClient.bulkUntrackAlerts({
      isUsingQuery: true,
      indices: [
        'she had them apple bottom jeans (jeans)',
        'boots with the fur (with the fur)',
        'the whole club was lookin at her',
        'she hit the floor (she hit the floor)',
        'next thing you know',
        'shawty got low, low, low, low, low, low, low, low',
      ],
      alertUuids: [
        'you wake up late for school, man, you dont wanna GO',
        'you ask your mom, please? but she still says NO',
        'you missed two classes and no homeWORK',
        'but your teacher preaches class like youre some kinda JERK',
        'you gotta fight',
        'for your right',
        'to paaaaaaaaaarty',
      ],
    });

    expect(alertsService.setAlertsToUntracked).toHaveBeenCalledTimes(1);
    expect(taskManager.bulkUpdateState).toHaveBeenCalledWith(
      ['did you know that you can put whatever you want into these mocked values'],
      expect.any(Function)
    );
  });

  it('should remove provided uuids from task state', async () => {
    const mockTaskId = 'task';
    const mockAlertUuid = 'alert';

    const trackedAlertsNotToRemove = {
      "we're no strangers to love": { alertUuid: 'you know the rules and so do i' },
      "a full commitment's what i'm thinkin' of": {
        alertUuid: "you wouldn't get this from any other guy",
      },
      "i just wanna tell you how i'm feelin'": { alertUuid: 'got to make you understand' },
      'never gonna give you up': { alertUuid: 'never gonna let you down' },
      'never gonna run around and desert you': { alertUuid: 'never gonna make you cry' },
      'never gonna say goodbye': { alertUuid: 'never gonna tell a lie and hurt you' },
    };

    const mockDate = new Date('2023-10-03T16:00:15.523Z');

    const initialTask: ConcreteTaskInstance = {
      id: mockTaskId,
      state: {
        alertTypeState: {
          trackedAlerts: {
            removeMe: { alertUuid: mockAlertUuid },
            ...trackedAlertsNotToRemove,
          },
          alertInstances: {
            removeMe: { alertUuid: mockAlertUuid },
            ...trackedAlertsNotToRemove,
          },
        },
      },
      scheduledAt: mockDate,
      runAt: mockDate,
      startedAt: mockDate,
      retryAt: mockDate,
      ownerId: 'somebody',
      taskType: "once told me the world was gonna roll me i ain't the sharpest tool in the shed",
      params: {},
      attempts: 0,
      status: TaskStatus.Idle,
    };

    taskManager.bulkUpdateState.mockImplementationOnce(async (taskIds, updater) => ({
      errors: [],
      tasks: [{ ...initialTask, state: updater(initialTask.state, taskIds[0]) }],
    }));

    alertsService.setAlertsToUntracked.mockResolvedValueOnce([
      {
        [ALERT_RULE_UUID]: mockTaskId,
        [ALERT_UUID]: mockAlertUuid,
      },
    ]);

    await rulesClient.bulkUntrackAlerts({
      isUsingQuery: true,
      indices: ["honestly who cares we're not even testing the index right now"],
      alertUuids: [mockAlertUuid],
    });

    const bulkUntrackResults = taskManager.bulkUpdateState.mock.results;
    const lastBulkUntrackResult = await bulkUntrackResults[bulkUntrackResults.length - 1].value;
    expect(lastBulkUntrackResult).toMatchInlineSnapshot(`
      Object {
        "errors": Array [],
        "tasks": Array [
          Object {
            "attempts": 0,
            "id": "task",
            "ownerId": "somebody",
            "params": Object {},
            "retryAt": 2023-10-03T16:00:15.523Z,
            "runAt": 2023-10-03T16:00:15.523Z,
            "scheduledAt": 2023-10-03T16:00:15.523Z,
            "startedAt": 2023-10-03T16:00:15.523Z,
            "state": Object {
              "alertInstances": Object {},
              "alertTypeState": Object {
                "alertInstances": Object {
                  "a full commitment's what i'm thinkin' of": Object {
                    "alertUuid": "you wouldn't get this from any other guy",
                  },
                  "i just wanna tell you how i'm feelin'": Object {
                    "alertUuid": "got to make you understand",
                  },
                  "never gonna give you up": Object {
                    "alertUuid": "never gonna let you down",
                  },
                  "never gonna run around and desert you": Object {
                    "alertUuid": "never gonna make you cry",
                  },
                  "never gonna say goodbye": Object {
                    "alertUuid": "never gonna tell a lie and hurt you",
                  },
                  "removeMe": Object {
                    "alertUuid": "alert",
                  },
                  "we're no strangers to love": Object {
                    "alertUuid": "you know the rules and so do i",
                  },
                },
                "trackedAlerts": Object {
                  "a full commitment's what i'm thinkin' of": Object {
                    "alertUuid": "you wouldn't get this from any other guy",
                  },
                  "i just wanna tell you how i'm feelin'": Object {
                    "alertUuid": "got to make you understand",
                  },
                  "never gonna give you up": Object {
                    "alertUuid": "never gonna let you down",
                  },
                  "never gonna run around and desert you": Object {
                    "alertUuid": "never gonna make you cry",
                  },
                  "never gonna say goodbye": Object {
                    "alertUuid": "never gonna tell a lie and hurt you",
                  },
                  "we're no strangers to love": Object {
                    "alertUuid": "you know the rules and so do i",
                  },
                },
              },
            },
            "status": "idle",
            "taskType": "once told me the world was gonna roll me i ain't the sharpest tool in the shed",
          },
        ],
      }
    `);
  });
});
