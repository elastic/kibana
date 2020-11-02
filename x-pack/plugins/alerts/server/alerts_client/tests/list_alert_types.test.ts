/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { AlertsClient, ConstructorOptions } from '../alerts_client';
import { savedObjectsClientMock, loggingSystemMock } from '../../../../../../src/core/server/mocks';
import { taskManagerMock } from '../../../../task_manager/server/mocks';
import { alertTypeRegistryMock } from '../../alert_type_registry.mock';
import { alertsAuthorizationMock } from '../../authorization/alerts_authorization.mock';
import { encryptedSavedObjectsMock } from '../../../../encrypted_saved_objects/server/mocks';
import { actionsAuthorizationMock } from '../../../../actions/server/mocks';
import { AlertsAuthorization } from '../../authorization/alerts_authorization';
import { ActionsAuthorization } from '../../../../actions/server';
import { getBeforeSetup } from './lib';

const taskManager = taskManagerMock.createStart();
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
  const alertingAlertType = {
    actionGroups: [],
    actionVariables: undefined,
    defaultActionGroupId: 'default',
    id: 'alertingAlertType',
    name: 'alertingAlertType',
    producer: 'alerts',
  };
  const myAppAlertType = {
    actionGroups: [],
    actionVariables: undefined,
    defaultActionGroupId: 'default',
    id: 'myAppAlertType',
    name: 'myAppAlertType',
    producer: 'myApp',
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
    authorization.filterByAlertTypeAuthorization.mockResolvedValue(
      new Set([
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
    const listedTypes = new Set([
      {
        actionGroups: [],
        actionVariables: undefined,
        defaultActionGroupId: 'default',
        id: 'myType',
        name: 'myType',
        producer: 'myApp',
      },
      {
        id: 'myOtherType',
        name: 'Test',
        actionGroups: [{ id: 'default', name: 'Default' }],
        defaultActionGroupId: 'default',
        producer: 'alerts',
      },
    ]);
    beforeEach(() => {
      alertTypeRegistry.list.mockReturnValue(listedTypes);
    });

    test('should return a list of AlertTypes that exist in the registry only if the user is authorised to get them', async () => {
      const authorizedTypes = new Set([
        {
          id: 'myType',
          name: 'Test',
          actionGroups: [{ id: 'default', name: 'Default' }],
          defaultActionGroupId: 'default',
          producer: 'alerts',
          authorizedConsumers: {
            myApp: { read: true, all: true },
          },
        },
      ]);
      authorization.filterByAlertTypeAuthorization.mockResolvedValue(authorizedTypes);

      expect(await alertsClient.listAlertTypes()).toEqual(authorizedTypes);
    });
  });
});
