/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RulesClient, ConstructorOptions } from '../rules_client';
import { savedObjectsClientMock, loggingSystemMock } from '../../../../../../src/core/server/mocks';
import { taskManagerMock } from '../../../../task_manager/server/mocks';
import { ruleTypeRegistryMock } from '../../rule_type_registry.mock';
import { alertingAuthorizationMock } from '../../authorization/alerting_authorization.mock';
import { encryptedSavedObjectsMock } from '../../../../encrypted_saved_objects/server/mocks';
import { actionsAuthorizationMock } from '../../../../actions/server/mocks';
import { AlertingAuthorization } from '../../authorization/alerting_authorization';
import { ActionsAuthorization } from '../../../../actions/server';
import { getBeforeSetup, setGlobalDate } from './lib';
import { AlertExecutionStatusValues } from '../../types';
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

setGlobalDate();

describe('aggregate()', () => {
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
  ]);
  beforeEach(() => {
    authorization.getFindAuthorizationFilter.mockResolvedValue({
      ensureRuleTypeIsAuthorized() {},
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
    ruleTypeRegistry.list.mockReturnValue(listedTypes);
    authorization.filterByRuleTypeAuthorization.mockResolvedValue(
      new Set([
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
      ])
    );
  });

  test('calls saved objects client with given params to perform aggregation', async () => {
    const rulesClient = new RulesClient(rulesClientParams);
    const result = await rulesClient.aggregate({ options: {} });
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
    const rulesClient = new RulesClient(rulesClientParams);
    await rulesClient.aggregate({ options: { filter: 'someTerm' } });

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
