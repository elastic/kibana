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
import { nodeTypes } from '../../../../../../src/plugins/data/common';
import { esKuery } from '../../../../../../src/plugins/data/server';
import { encryptedSavedObjectsMock } from '../../../../encrypted_saved_objects/server/mocks';
import { actionsAuthorizationMock } from '../../../../actions/server/mocks';
import { AlertingAuthorization } from '../../authorization/alerting_authorization';
import { ActionsAuthorization } from '../../../../actions/server';
import { httpServerMock } from '../../../../../../src/core/server/mocks';
import { auditServiceMock } from '../../../../security/server/audit/index.mock';
import { getBeforeSetup, setGlobalDate } from './lib';
import { RecoveredActionGroup } from '../../../common';
import { RegistryAlertType } from '../../alert_type_registry';

const taskManager = taskManagerMock.createStart();
const alertTypeRegistry = alertTypeRegistryMock.create();
const unsecuredSavedObjectsClient = savedObjectsClientMock.create();
const encryptedSavedObjects = encryptedSavedObjectsMock.createClient();
const authorization = alertingAuthorizationMock.create();
const actionsAuthorization = actionsAuthorizationMock.create();
const auditLogger = auditServiceMock.create().asScoped(httpServerMock.createKibanaRequest());

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
  (auditLogger.log as jest.Mock).mockClear();
});

setGlobalDate();

jest.mock('../lib/map_sort_field', () => ({
  mapSortField: jest.fn(),
}));

describe('find()', () => {
  const listedTypes = new Set<RegistryAlertType>([
    {
      actionGroups: [],
      recoveryActionGroup: RecoveredActionGroup,
      actionVariables: undefined,
      defaultActionGroupId: 'default',
      minimumLicenseRequired: 'basic',
      id: 'myType',
      name: 'myType',
      producer: 'myApp',
      enabledInLicense: true,
    },
  ]);
  beforeEach(() => {
    authorization.getFindAuthorizationFilter.mockResolvedValue({
      ensureRuleTypeIsAuthorized() {},
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
            updatedAt: new Date().toISOString(),
            notifyWhen: 'onActiveAlert',
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
    authorization.filterByRuleTypeAuthorization.mockResolvedValue(
      new Set([
        {
          id: 'myType',
          name: 'Test',
          actionGroups: [{ id: 'default', name: 'Default' }],
          recoveryActionGroup: RecoveredActionGroup,
          defaultActionGroupId: 'default',
          minimumLicenseRequired: 'basic',
          producer: 'alerts',
          authorizedConsumers: {
            myApp: { read: true, all: true },
          },
          enabledInLicense: true,
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
            "notifyWhen": "onActiveAlert",
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
          "sortField": undefined,
          "type": "alert",
        },
      ]
    `);
  });

  test('calls mapSortField', async () => {
    const alertsClient = new AlertsClient(alertsClientParams);
    await alertsClient.find({ options: { sortField: 'name' } });
    expect(jest.requireMock('../lib/map_sort_field').mapSortField).toHaveBeenCalledWith('name');
  });

  describe('authorization', () => {
    test('ensures user is query filter types down to those the user is authorized to find', async () => {
      const filter = esKuery.fromKueryExpression(
        '((alert.attributes.alertTypeId:myType and alert.attributes.consumer:myApp) or (alert.attributes.alertTypeId:myOtherType and alert.attributes.consumer:myApp) or (alert.attributes.alertTypeId:myOtherType and alert.attributes.consumer:myOtherApp))'
      );
      authorization.getFindAuthorizationFilter.mockResolvedValue({
        filter,
        ensureRuleTypeIsAuthorized() {},
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
      const ensureRuleTypeIsAuthorized = jest.fn();
      const logSuccessfulAuthorization = jest.fn();
      authorization.getFindAuthorizationFilter.mockResolvedValue({
        ensureRuleTypeIsAuthorized,
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
              "notifyWhen": undefined,
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
      expect(ensureRuleTypeIsAuthorized).toHaveBeenCalledWith('myType', 'myApp', 'rule');
      expect(logSuccessfulAuthorization).toHaveBeenCalled();
    });
  });

  describe('auditLogger', () => {
    test('logs audit event when searching rules', async () => {
      const alertsClient = new AlertsClient({ ...alertsClientParams, auditLogger });
      await alertsClient.find();
      expect(auditLogger.log).toHaveBeenCalledWith(
        expect.objectContaining({
          event: expect.objectContaining({
            action: 'rule_find',
            outcome: 'success',
          }),
          kibana: { saved_object: { id: '1', type: 'alert' } },
        })
      );
    });

    test('logs audit event when not authorised to search rules', async () => {
      const alertsClient = new AlertsClient({ ...alertsClientParams, auditLogger });
      authorization.getFindAuthorizationFilter.mockRejectedValue(new Error('Unauthorized'));

      await expect(alertsClient.find()).rejects.toThrow();
      expect(auditLogger.log).toHaveBeenCalledWith(
        expect.objectContaining({
          event: expect.objectContaining({
            action: 'rule_find',
            outcome: 'failure',
          }),
          error: {
            code: 'Error',
            message: 'Unauthorized',
          },
        })
      );
    });

    test('logs audit event when not authorised to search rule type', async () => {
      const alertsClient = new AlertsClient({ ...alertsClientParams, auditLogger });
      authorization.getFindAuthorizationFilter.mockResolvedValue({
        ensureRuleTypeIsAuthorized: jest.fn(() => {
          throw new Error('Unauthorized');
        }),
        logSuccessfulAuthorization: jest.fn(),
      });

      await expect(async () => await alertsClient.find()).rejects.toThrow();
      expect(auditLogger.log).toHaveBeenCalledWith(
        expect.objectContaining({
          event: expect.objectContaining({
            action: 'rule_find',
            outcome: 'failure',
          }),
          kibana: { saved_object: { id: '1', type: 'alert' } },
          error: {
            code: 'Error',
            message: 'Unauthorized',
          },
        })
      );
    });
  });
});
