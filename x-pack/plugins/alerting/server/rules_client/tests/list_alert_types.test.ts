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
import {
  AlertingAuthorization,
  RegistryAlertTypeWithAuth,
} from '../../authorization/alerting_authorization';
import { ActionsAuthorization } from '@kbn/actions-plugin/server';
import { getBeforeSetup } from './lib';
import { RecoveredActionGroup } from '../../../common';
import { RegistryRuleType } from '../../rule_type_registry';

const taskManager = taskManagerMock.createStart();
const ruleTypeRegistry = ruleTypeRegistryMock.create();
const unsecuredSavedObjectsClient = savedObjectsClientMock.create();

const encryptedSavedObjects = encryptedSavedObjectsMock.createClient();
const authorization = alertingAuthorizationMock.create();
const actionsAuthorization = actionsAuthorizationMock.create();

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
});

describe('listAlertTypes', () => {
  let rulesClient: RulesClient;
  const alertingAlertType: RegistryRuleType = {
    actionGroups: [],
    actionVariables: undefined,
    defaultActionGroupId: 'default',
    minimumLicenseRequired: 'basic',
    isExportable: true,
    recoveryActionGroup: RecoveredActionGroup,
    id: 'alertingAlertType',
    name: 'alertingAlertType',
    producer: 'alerts',
    enabledInLicense: true,
  };
  const myAppAlertType: RegistryRuleType = {
    actionGroups: [],
    actionVariables: undefined,
    defaultActionGroupId: 'default',
    minimumLicenseRequired: 'basic',
    isExportable: true,
    recoveryActionGroup: RecoveredActionGroup,
    id: 'myAppAlertType',
    name: 'myAppAlertType',
    producer: 'myApp',
    enabledInLicense: true,
  };
  const setOfAlertTypes = new Set([myAppAlertType, alertingAlertType]);

  const authorizedConsumers = {
    alerts: { read: true, all: true },
    myApp: { read: true, all: true },
    myOtherApp: { read: true, all: true },
  };

  beforeEach(() => {
    rulesClient = new RulesClient(rulesClientParams);
  });

  test('should return a list of AlertTypes that exist in the registry', async () => {
    ruleTypeRegistry.list.mockReturnValue(setOfAlertTypes);
    authorization.filterByRuleTypeAuthorization.mockResolvedValue(
      new Set<RegistryAlertTypeWithAuth>([
        { ...myAppAlertType, authorizedConsumers },
        { ...alertingAlertType, authorizedConsumers },
      ])
    );
    expect(await rulesClient.listAlertTypes()).toEqual(
      new Set([
        { ...myAppAlertType, authorizedConsumers },
        { ...alertingAlertType, authorizedConsumers },
      ])
    );
  });

  describe('authorization', () => {
    const listedTypes = new Set<RegistryRuleType>([
      {
        actionGroups: [],
        actionVariables: undefined,
        defaultActionGroupId: 'default',
        minimumLicenseRequired: 'basic',
        isExportable: true,
        recoveryActionGroup: RecoveredActionGroup,
        id: 'myType',
        name: 'myType',
        producer: 'myApp',
        enabledInLicense: true,
      },
      {
        id: 'myOtherType',
        name: 'Test',
        actionGroups: [{ id: 'default', name: 'Default' }],
        defaultActionGroupId: 'default',
        minimumLicenseRequired: 'basic',
        isExportable: true,
        recoveryActionGroup: RecoveredActionGroup,
        producer: 'alerts',
        enabledInLicense: true,
      },
    ]);
    beforeEach(() => {
      ruleTypeRegistry.list.mockReturnValue(listedTypes);
    });

    test('should return a list of AlertTypes that exist in the registry only if the user is authorised to get them', async () => {
      const authorizedTypes = new Set<RegistryAlertTypeWithAuth>([
        {
          id: 'myType',
          name: 'Test',
          actionGroups: [{ id: 'default', name: 'Default' }],
          defaultActionGroupId: 'default',
          minimumLicenseRequired: 'basic',
          isExportable: true,
          recoveryActionGroup: RecoveredActionGroup,
          producer: 'alerts',
          authorizedConsumers: {
            myApp: { read: true, all: true },
          },
          enabledInLicense: true,
        },
      ]);
      authorization.filterByRuleTypeAuthorization.mockResolvedValue(authorizedTypes);

      expect(await rulesClient.listAlertTypes()).toEqual(authorizedTypes);
    });
  });
});
