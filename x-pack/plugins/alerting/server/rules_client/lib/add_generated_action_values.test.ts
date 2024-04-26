/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { addGeneratedActionValues } from './add_generated_action_values';
import { RuleAction, RuleSystemAction } from '../../../common';
import { ActionsAuthorization } from '@kbn/actions-plugin/server';
import { actionsAuthorizationMock } from '@kbn/actions-plugin/server/mocks';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import {
  savedObjectsClientMock,
  savedObjectsRepositoryMock,
} from '@kbn/core-saved-objects-api-server-mocks';
import { uiSettingsServiceMock } from '@kbn/core-ui-settings-server-mocks';
import { encryptedSavedObjectsMock } from '@kbn/encrypted-saved-objects-plugin/server/mocks';
import { taskManagerMock } from '@kbn/task-manager-plugin/server/mocks';
import { AlertingAuthorization } from '../../authorization';
import { alertingAuthorizationMock } from '../../authorization/alerting_authorization.mock';
import { ruleTypeRegistryMock } from '../../rule_type_registry.mock';
import { ConstructorOptions } from '../rules_client';
import { backfillClientMock } from '../../backfill_client/backfill_client.mock';
import { ConnectorAdapterRegistry } from '../../connector_adapters/connector_adapter_registry';

jest.mock('uuid', () => ({
  v4: () => '111-222',
}));

describe('addGeneratedActionValues()', () => {
  const taskManager = taskManagerMock.createStart();
  const ruleTypeRegistry = ruleTypeRegistryMock.create();
  const unsecuredSavedObjectsClient = savedObjectsClientMock.create();

  const encryptedSavedObjects = encryptedSavedObjectsMock.createClient();
  const authorization = alertingAuthorizationMock.create();
  const actionsAuthorization = actionsAuthorizationMock.create();
  const internalSavedObjectsRepository = savedObjectsRepositoryMock.create();

  const kibanaVersion = 'v7.10.0';
  const logger = loggingSystemMock.create().get();

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
    logger,
    internalSavedObjectsRepository,
    encryptedSavedObjectsClient: encryptedSavedObjects,
    getActionsClient: jest.fn(),
    getEventLogClient: jest.fn(),
    kibanaVersion,
    maxScheduledPerMinute: 10000,
    minimumScheduleInterval: { value: '1m', enforce: false },
    isAuthenticationTypeAPIKey: jest.fn(),
    getAuthenticationAPIKey: jest.fn(),
    getAlertIndicesAlias: jest.fn(),
    alertsService: null,
    backfillClient: backfillClientMock.create(),
    uiSettings: uiSettingsServiceMock.createStartContract(),
    connectorAdapterRegistry: new ConnectorAdapterRegistry(),
    isSystemAction: jest.fn(),
  };

  const mockAction: RuleAction = {
    id: '1',
    group: 'default',
    actionTypeId: 'slack',
    params: {},
    frequency: {
      summary: false,
      notifyWhen: 'onActiveAlert',
      throttle: null,
    },
    alertsFilter: {
      query: {
        kql: 'test:testValue',
        filters: [
          {
            meta: { key: 'foo', params: { query: 'bar' } },
            query: { match_phrase: { foo: 'bar ' } },
          },
        ],
      },
      timeframe: {
        days: [1, 2],
        hours: { start: '08:00', end: '17:00' },
        timezone: 'UTC',
      },
    },
  };

  const mockSystemAction: RuleSystemAction = {
    id: '1',
    actionTypeId: 'slack',
    params: {},
  };

  test('adds uuid', async () => {
    const actionWithGeneratedValues = await addGeneratedActionValues(
      [mockAction],
      [mockSystemAction],
      {
        ...rulesClientParams,
        fieldsToExcludeFromPublicApi: [],
        minimumScheduleIntervalInMs: 0,
      }
    );

    expect(actionWithGeneratedValues.actions[0].uuid).toBe('111-222');

    expect(actionWithGeneratedValues.systemActions[0]).toEqual({
      actionTypeId: 'slack',
      id: '1',
      params: {},
      uuid: '111-222',
    });
  });

  test('adds DSL', async () => {
    const actionWithGeneratedValues = await addGeneratedActionValues(
      [mockAction],
      [mockSystemAction],
      {
        ...rulesClientParams,
        fieldsToExcludeFromPublicApi: [],
        minimumScheduleIntervalInMs: 0,
      }
    );

    expect(actionWithGeneratedValues.actions[0].alertsFilter?.query?.dsl).toBe(
      '{"bool":{"must":[],"filter":[{"bool":{"should":[{"match":{"test":"testValue"}}],"minimum_should_match":1}},{"match_phrase":{"foo":"bar "}}],"should":[],"must_not":[]}}'
    );

    expect(actionWithGeneratedValues.systemActions[0]).toEqual({
      actionTypeId: 'slack',
      id: '1',
      params: {},
      uuid: '111-222',
    });
  });

  test('throws error if KQL is not valid', async () => {
    expect(async () =>
      addGeneratedActionValues(
        [
          {
            ...mockAction,
            alertsFilter: { query: { kql: 'foo:bar:1', filters: [] } },
          },
        ],
        [mockSystemAction],
        {
          ...rulesClientParams,
          fieldsToExcludeFromPublicApi: [],
          minimumScheduleIntervalInMs: 0,
        }
      )
    ).rejects.toThrowErrorMatchingSnapshot('"Error creating DSL query: invalid KQL"');
  });
});
