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
import { nodeTypes } from '../../../../../../src/plugins/data/common';
import { esKuery } from '../../../../../../src/plugins/data/server';
import { encryptedSavedObjectsMock } from '../../../../encrypted_saved_objects/server/mocks';
import { actionsAuthorizationMock } from '../../../../actions/server/mocks';
import { AlertsAuthorization } from '../../authorization/alerts_authorization';
import { ActionsAuthorization } from '../../../../actions/server';
import { getBeforeSetup, setGlobalDate } from './lib';

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

describe('find()', () => {
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
    unsecuredSavedObjectsClient.find.mockResolvedValueOnce({
      total: 1,
      per_page: 10,
      page: 1,
      saved_objects: [
        {
          id: '1',
          type: 'alert',
          attributes: {
            alertTypeId: 'myType',
            schedule: { interval: '10s' },
            params: {
              bar: true,
            },
            createdAt: new Date().toISOString(),
            actions: [
              {
                group: 'default',
                actionRef: 'action_0',
                params: {
                  foo: true,
                },
              },
            ],
          },
          score: 1,
          references: [
            {
              name: 'action_0',
              type: 'action',
              id: '1',
            },
          ],
        },
      ],
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

  test('calls saved objects client with given params', async () => {
    const alertsClient = new AlertsClient(alertsClientParams);
    const result = await alertsClient.find({ options: {} });
    expect(result).toMatchInlineSnapshot(`
      Object {
        "data": Array [
          Object {
            "actions": Array [
              Object {
                "group": "default",
                "id": "1",
                "params": Object {
                  "foo": true,
                },
              },
            ],
            "alertTypeId": "myType",
            "createdAt": 2019-02-12T21:01:22.479Z,
            "id": "1",
            "params": Object {
              "bar": true,
            },
            "schedule": Object {
              "interval": "10s",
            },
            "updatedAt": 2019-02-12T21:01:22.479Z,
          },
        ],
        "page": 1,
        "perPage": 10,
        "total": 1,
      }
    `);
    expect(unsecuredSavedObjectsClient.find).toHaveBeenCalledTimes(1);
    expect(unsecuredSavedObjectsClient.find.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        Object {
          "fields": undefined,
          "filter": undefined,
          "type": "alert",
        },
      ]
    `);
  });

  describe('authorization', () => {
    test('ensures user is query filter types down to those the user is authorized to find', async () => {
      const filter = esKuery.fromKueryExpression(
        '((alert.attributes.alertTypeId:myType and alert.attributes.consumer:myApp) or (alert.attributes.alertTypeId:myOtherType and alert.attributes.consumer:myApp) or (alert.attributes.alertTypeId:myOtherType and alert.attributes.consumer:myOtherApp))'
      );
      authorization.getFindAuthorizationFilter.mockResolvedValue({
        filter,
        ensureAlertTypeIsAuthorized() {},
        logSuccessfulAuthorization() {},
      });

      const alertsClient = new AlertsClient(alertsClientParams);
      await alertsClient.find({ options: { filter: 'someTerm' } });

      const [options] = unsecuredSavedObjectsClient.find.mock.calls[0];
      expect(options.filter).toEqual(
        nodeTypes.function.buildNode('and', [esKuery.fromKueryExpression('someTerm'), filter])
      );
      expect(authorization.getFindAuthorizationFilter).toHaveBeenCalledTimes(1);
    });

    test('throws if user is not authorized to find any types', async () => {
      const alertsClient = new AlertsClient(alertsClientParams);
      authorization.getFindAuthorizationFilter.mockRejectedValue(new Error('not authorized'));
      await expect(alertsClient.find({ options: {} })).rejects.toThrowErrorMatchingInlineSnapshot(
        `"not authorized"`
      );
    });

    test('ensures authorization even when the fields required to authorize are omitted from the find', async () => {
      const ensureAlertTypeIsAuthorized = jest.fn();
      const logSuccessfulAuthorization = jest.fn();
      authorization.getFindAuthorizationFilter.mockResolvedValue({
        ensureAlertTypeIsAuthorized,
        logSuccessfulAuthorization,
      });

      unsecuredSavedObjectsClient.find.mockReset();
      unsecuredSavedObjectsClient.find.mockResolvedValue({
        total: 1,
        per_page: 10,
        page: 1,
        saved_objects: [
          {
            id: '1',
            type: 'alert',
            attributes: {
              actions: [],
              alertTypeId: 'myType',
              consumer: 'myApp',
              tags: ['myTag'],
            },
            score: 1,
            references: [],
          },
        ],
      });

      const alertsClient = new AlertsClient(alertsClientParams);
      expect(await alertsClient.find({ options: { fields: ['tags'] } })).toMatchInlineSnapshot(`
        Object {
          "data": Array [
            Object {
              "actions": Array [],
              "id": "1",
              "schedule": undefined,
              "tags": Array [
                "myTag",
              ],
            },
          ],
          "page": 1,
          "perPage": 10,
          "total": 1,
        }
      `);

      expect(unsecuredSavedObjectsClient.find).toHaveBeenCalledWith({
        fields: ['tags', 'alertTypeId', 'consumer'],
        type: 'alert',
      });
      expect(ensureAlertTypeIsAuthorized).toHaveBeenCalledWith('myType', 'myApp');
      expect(logSuccessfulAuthorization).toHaveBeenCalled();
    });
  });
});
