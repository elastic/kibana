/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { RulesClient, ConstructorOptions } from '../../../../rules_client/rules_client';
import { savedObjectsClientMock, savedObjectsRepositoryMock } from '@kbn/core/server/mocks';
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
});
