/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  savedObjectsClientMock,
  loggingSystemMock,
  savedObjectsRepositoryMock,
  uiSettingsServiceMock,
} from '@kbn/core/server/mocks';
import { taskManagerMock } from '@kbn/task-manager-plugin/server/mocks';
import { ruleTypeRegistryMock } from '../../rule_type_registry.mock';
import { alertingAuthorizationMock } from '../../authorization/alerting_authorization.mock';
import { encryptedSavedObjectsMock } from '@kbn/encrypted-saved-objects-plugin/server/mocks';
import { actionsAuthorizationMock } from '@kbn/actions-plugin/server/mocks';
import { AlertingAuthorization } from '../../authorization/alerting_authorization';
import { ActionsAuthorization } from '@kbn/actions-plugin/server';
import { RawRule } from '../../types';
import { getBeforeSetup, mockedDateString } from '../tests/lib';
import { createNewAPIKeySet } from './create_new_api_key_set';
import { RulesClientContext } from '../types';
import { ConnectorAdapterRegistry } from '../../connector_adapters/connector_adapter_registry';

const taskManager = taskManagerMock.createStart();
const ruleTypeRegistry = ruleTypeRegistryMock.create();
const unsecuredSavedObjectsClient = savedObjectsClientMock.create();
const encryptedSavedObjects = encryptedSavedObjectsMock.createClient();
const authorization = alertingAuthorizationMock.create();
const actionsAuthorization = actionsAuthorizationMock.create();
const internalSavedObjectsRepository = savedObjectsRepositoryMock.create();

const kibanaVersion = 'v8.0.0';
const rulesClientParams: jest.Mocked<RulesClientContext> = {
  taskManager,
  ruleTypeRegistry,
  unsecuredSavedObjectsClient,
  authorization: authorization as unknown as AlertingAuthorization,
  actionsAuthorization: actionsAuthorization as unknown as ActionsAuthorization,
  spaceId: 'default',
  getUserName: jest.fn(),
  createAPIKey: jest.fn(),
  logger: loggingSystemMock.create().get(),
  internalSavedObjectsRepository,
  encryptedSavedObjectsClient: encryptedSavedObjects,
  getActionsClient: jest.fn(),
  getEventLogClient: jest.fn(),
  kibanaVersion,
  maxScheduledPerMinute: 10000,
  minimumScheduleInterval: { value: '1m', enforce: false },
  minimumScheduleIntervalInMs: 1,
  fieldsToExcludeFromPublicApi: [],
  isAuthenticationTypeAPIKey: jest.fn(),
  getAuthenticationAPIKey: jest.fn(),
  connectorAdapterRegistry: new ConnectorAdapterRegistry(),
  getAlertIndicesAlias: jest.fn(),
  alertsService: null,
  uiSettings: uiSettingsServiceMock.createStartContract(),
  isSystemAction: jest.fn(),
};

const username = 'test';
const attributes: RawRule = {
  enabled: true,
  name: 'rule-name',
  tags: ['tag-1', 'tag-2'],
  alertTypeId: '123',
  consumer: 'rule-consumer',
  legacyId: null,
  schedule: { interval: '1s' },
  actions: [],
  params: {},
  createdBy: null,
  updatedBy: null,
  createdAt: mockedDateString,
  updatedAt: mockedDateString,
  apiKey: null,
  apiKeyOwner: null,
  throttle: null,
  notifyWhen: null,
  muteAll: false,
  mutedInstanceIds: [],
  executionStatus: {
    status: 'unknown',
    lastExecutionDate: '2020-08-20T19:23:38Z',
    error: null,
    warning: null,
  },
  revision: 0,
};

describe('createNewAPIKeySet', () => {
  beforeEach(() => {
    getBeforeSetup(rulesClientParams, taskManager, ruleTypeRegistry);
  });

  test('create new api keys', async () => {
    rulesClientParams.createAPIKey.mockResolvedValueOnce({
      apiKeysEnabled: true,
      result: { id: '123', name: '123', api_key: 'abc' },
    });
    const apiKey = await createNewAPIKeySet(rulesClientParams, {
      id: attributes.alertTypeId,
      ruleName: attributes.name,
      username,
      shouldUpdateApiKey: true,
    });
    expect(apiKey).toEqual({
      apiKey: 'MTIzOmFiYw==',
      apiKeyCreatedByUser: undefined,
      apiKeyOwner: 'test',
    });
    expect(rulesClientParams.createAPIKey).toHaveBeenCalledTimes(1);
  });

  test('should get api key from the request if the user is authenticated using api keys', async () => {
    rulesClientParams.getAuthenticationAPIKey.mockReturnValueOnce({
      apiKeysEnabled: true,
      result: { id: '123', name: '123', api_key: 'abc' },
    });
    rulesClientParams.isAuthenticationTypeAPIKey.mockReturnValueOnce(true);
    const apiKey = await createNewAPIKeySet(rulesClientParams, {
      id: attributes.alertTypeId,
      ruleName: attributes.name,
      username,
      shouldUpdateApiKey: true,
    });
    expect(apiKey).toEqual({
      apiKey: 'MTIzOmFiYw==',
      apiKeyCreatedByUser: true,
      apiKeyOwner: 'test',
    });
    expect(rulesClientParams.getAuthenticationAPIKey).toHaveBeenCalledTimes(1);
    expect(rulesClientParams.isAuthenticationTypeAPIKey).toHaveBeenCalledTimes(1);
  });

  test('should throw an error if getting the api key fails', async () => {
    rulesClientParams.createAPIKey.mockRejectedValueOnce(new Error('Test failure'));
    await expect(
      async () =>
        await createNewAPIKeySet(rulesClientParams, {
          id: attributes.alertTypeId,
          ruleName: attributes.name,
          username,
          shouldUpdateApiKey: true,
        })
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      `"Error creating API key for rule - Test failure"`
    );
  });

  test('should throw an error if getting the api key fails and an error message is passed in', async () => {
    rulesClientParams.createAPIKey.mockRejectedValueOnce(new Error('Test failure'));
    await expect(
      async () =>
        await createNewAPIKeySet(rulesClientParams, {
          id: attributes.alertTypeId,
          ruleName: attributes.name,
          username,
          shouldUpdateApiKey: true,
          errorMessage: 'Error updating rule: could not create API key',
        })
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      `"Error updating rule: could not create API key - Test failure"`
    );
  });

  test('should return null if shouldUpdateApiKey: false', async () => {
    const apiKey = await createNewAPIKeySet(rulesClientParams, {
      id: attributes.alertTypeId,
      ruleName: attributes.name,
      username,
      shouldUpdateApiKey: false,
    });
    expect(apiKey).toEqual({
      apiKey: null,
      apiKeyCreatedByUser: null,
      apiKeyOwner: null,
    });
  });
});
