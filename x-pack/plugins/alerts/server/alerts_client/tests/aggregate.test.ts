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
import { getBeforeSetup, setGlobalDate } from './lib';
import { AlertExecutionStatusValues } from '../../types';

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

setGlobalDate();

describe('aggregate()', () => {
  const listedTypes = new Set([
    {
      actionGroups: [],
      actionVariables: undefined,
      defaultActionGroupId: 'default',
      id: 'myType',
      name: 'myType',
      producer: 'myApp',
    },
  ]);
  beforeEach(() => {
    authorization.getFindAuthorizationFilter.mockResolvedValue({
      ensureAlertTypeIsAuthorized() {},
      logSuccessfulAuthorization() {},
    });
    unsecuredSavedObjectsClient.find
      .mockResolvedValueOnce({
        total: 10,
        per_page: 0,
        page: 1,
        saved_objects: [],
      })
      .mockResolvedValueOnce({
        total: 8,
        per_page: 0,
        page: 1,
        saved_objects: [],
      })
      .mockResolvedValueOnce({
        total: 6,
        per_page: 0,
        page: 1,
        saved_objects: [],
      })
      .mockResolvedValueOnce({
        total: 4,
        per_page: 0,
        page: 1,
        saved_objects: [],
      })
      .mockResolvedValueOnce({
        total: 2,
        per_page: 0,
        page: 1,
        saved_objects: [],
      });
    alertTypeRegistry.list.mockReturnValue(listedTypes);
    authorization.filterByAlertTypeAuthorization.mockResolvedValue(
      new Set([
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
      ])
    );
  });

  test('calls saved objects client with given params to perform aggregation', async () => {
    const alertsClient = new AlertsClient(alertsClientParams);
    const result = await alertsClient.aggregate({ options: {} });
    expect(result).toMatchInlineSnapshot(`
      Object {
        "alertExecutionStatus": Object {
          "active": 8,
          "error": 6,
          "ok": 10,
          "pending": 4,
          "unknown": 2,
        },
      }
    `);
    expect(unsecuredSavedObjectsClient.find).toHaveBeenCalledTimes(
      AlertExecutionStatusValues.length
    );
    AlertExecutionStatusValues.forEach((status: string, ndx: number) => {
      expect(unsecuredSavedObjectsClient.find.mock.calls[ndx]).toEqual([
        {
          fields: undefined,
          filter: `alert.attributes.executionStatus.status:(${status})`,
          page: 1,
          perPage: 0,
          type: 'alert',
        },
      ]);
    });
  });

  test('supports filters when aggregating', async () => {
    const alertsClient = new AlertsClient(alertsClientParams);
    await alertsClient.aggregate({ options: { filter: 'someTerm' } });

    expect(unsecuredSavedObjectsClient.find).toHaveBeenCalledTimes(
      AlertExecutionStatusValues.length
    );
    AlertExecutionStatusValues.forEach((status: string, ndx: number) => {
      expect(unsecuredSavedObjectsClient.find.mock.calls[ndx]).toEqual([
        {
          fields: undefined,
          filter: `someTerm and alert.attributes.executionStatus.status:(${status})`,
          page: 1,
          perPage: 0,
          type: 'alert',
        },
      ]);
    });
  });
});
