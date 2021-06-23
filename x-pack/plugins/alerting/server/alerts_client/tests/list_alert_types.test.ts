/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AlertsClient, ConstructorOptions } from '../alerts_client';
import { savedObjectsClientMock, loggingSystemMock } from '../../../../../../src/core/server/mocks';
import { taskManagerMock } from '../../../../task_manager/server/mocks';
import { alertTypeRegistryMock } from '../../alert_type_registry.mock';
import { alertingAuthorizationMock } from '../../authorization/alerting_authorization.mock';
import { encryptedSavedObjectsMock } from '../../../../encrypted_saved_objects/server/mocks';
import { actionsAuthorizationMock } from '../../../../actions/server/mocks';
import {
  AlertingAuthorization,
  RegistryAlertTypeWithAuth,
} from '../../authorization/alerting_authorization';
import { ActionsAuthorization } from '../../../../actions/server';
import { getBeforeSetup } from './lib';
import { RecoveredActionGroup } from '../../../common';
import { RegistryAlertType } from '../../alert_type_registry';

const taskManager = taskManagerMock.createStart();
const alertTypeRegistry = alertTypeRegistryMock.create();
const unsecuredSavedObjectsClient = savedObjectsClientMock.create();

const encryptedSavedObjects = encryptedSavedObjectsMock.createClient();
const authorization = alertingAuthorizationMock.create();
const actionsAuthorization = actionsAuthorizationMock.create();

const kibanaVersion = 'v7.10.0';
const alertsClientParams: jest.Mocked<ConstructorOptions> = {
  taskManager,
  alertTypeRegistry,
  unsecuredSavedObjectsClient,
  authorization: (authorization as unknown) as AlertingAuthorization,
  actionsAuthorization: (actionsAuthorization as unknown) as ActionsAuthorization,
  spaceId: 'default',
  namespace: 'default',
  getUserName: jest.fn(),
  createAPIKey: jest.fn(),
  logger: loggingSystemMock.create().get(),
  encryptedSavedObjectsClient: encryptedSavedObjects,
  getActionsClient: jest.fn(),
  getEventLogClient: jest.fn(),
  kibanaVersion,
};

beforeEach(() => {
  getBeforeSetup(alertsClientParams, taskManager, alertTypeRegistry);
});

describe('listAlertTypes', () => {
  let alertsClient: AlertsClient;
  const alertingAlertType: RegistryAlertType = {
    actionGroups: [],
    actionVariables: undefined,
    defaultActionGroupId: 'default',
    minimumLicenseRequired: 'basic',
    recoveryActionGroup: RecoveredActionGroup,
    id: 'alertingAlertType',
    name: 'alertingAlertType',
    producer: 'alerts',
    enabledInLicense: true,
  };
  const myAppAlertType: RegistryAlertType = {
    actionGroups: [],
    actionVariables: undefined,
    defaultActionGroupId: 'default',
    minimumLicenseRequired: 'basic',
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
    alertsClient = new AlertsClient(alertsClientParams);
  });

  test('should return a list of AlertTypes that exist in the registry', async () => {
    alertTypeRegistry.list.mockReturnValue(setOfAlertTypes);
    authorization.filterByRuleTypeAuthorization.mockResolvedValue(
      new Set<RegistryAlertTypeWithAuth>([
        { ...myAppAlertType, authorizedConsumers },
        { ...alertingAlertType, authorizedConsumers },
      ])
    );
    expect(await alertsClient.listAlertTypes()).toEqual(
      new Set([
        { ...myAppAlertType, authorizedConsumers },
        { ...alertingAlertType, authorizedConsumers },
      ])
    );
  });

  describe('authorization', () => {
    const listedTypes = new Set<RegistryAlertType>([
      {
        actionGroups: [],
        actionVariables: undefined,
        defaultActionGroupId: 'default',
        minimumLicenseRequired: 'basic',
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
        recoveryActionGroup: RecoveredActionGroup,
        producer: 'alerts',
        enabledInLicense: true,
      },
    ]);
    beforeEach(() => {
      alertTypeRegistry.list.mockReturnValue(listedTypes);
    });

    test('should return a list of AlertTypes that exist in the registry only if the user is authorised to get them', async () => {
      const authorizedTypes = new Set<RegistryAlertTypeWithAuth>([
        {
          id: 'myType',
          name: 'Test',
          actionGroups: [{ id: 'default', name: 'Default' }],
          defaultActionGroupId: 'default',
          minimumLicenseRequired: 'basic',
          recoveryActionGroup: RecoveredActionGroup,
          producer: 'alerts',
          authorizedConsumers: {
            myApp: { read: true, all: true },
          },
          enabledInLicense: true,
        },
      ]);
      authorization.filterByRuleTypeAuthorization.mockResolvedValue(authorizedTypes);

      expect(await alertsClient.listAlertTypes()).toEqual(authorizedTypes);
    });
  });
});
