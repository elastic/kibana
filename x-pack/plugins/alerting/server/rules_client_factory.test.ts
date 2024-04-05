/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RulesClientFactory, RulesClientFactoryOpts } from './rules_client_factory';
import { ruleTypeRegistryMock } from './rule_type_registry.mock';
import { taskManagerMock } from '@kbn/task-manager-plugin/server/mocks';
import {
  savedObjectsClientMock,
  savedObjectsServiceMock,
  loggingSystemMock,
  savedObjectsRepositoryMock,
  uiSettingsServiceMock,
} from '@kbn/core/server/mocks';
import { encryptedSavedObjectsMock } from '@kbn/encrypted-saved-objects-plugin/server/mocks';
import { AuthenticatedUser } from '@kbn/security-plugin/common';
import { securityMock } from '@kbn/security-plugin/server/mocks';
import { PluginStartContract as ActionsStartContract } from '@kbn/actions-plugin/server';
import { actionsMock, actionsAuthorizationMock } from '@kbn/actions-plugin/server/mocks';
import { eventLogMock } from '@kbn/event-log-plugin/server/mocks';
import { alertingAuthorizationMock } from './authorization/alerting_authorization.mock';
import { alertingAuthorizationClientFactoryMock } from './alerting_authorization_client_factory.mock';
import { AlertingAuthorization } from './authorization';
import { AlertingAuthorizationClientFactory } from './alerting_authorization_client_factory';
import { SECURITY_EXTENSION_ID } from '@kbn/core-saved-objects-server';
import { mockRouter } from '@kbn/core-http-router-server-mocks';
import { AD_HOC_RUN_SAVED_OBJECT_TYPE, RULE_SAVED_OBJECT_TYPE } from './saved_objects';
import { backfillClientMock } from './backfill_client/backfill_client.mock';
import { ConnectorAdapterRegistry } from './connector_adapters/connector_adapter_registry';

jest.mock('./rules_client');
jest.mock('./authorization/alerting_authorization');

const savedObjectsClient = savedObjectsClientMock.create();
const savedObjectsService = savedObjectsServiceMock.createInternalStartContract();

const securityPluginSetup = securityMock.createSetup();
const securityPluginStart = securityMock.createStart();

const alertingAuthorization = alertingAuthorizationMock.create();
const alertingAuthorizationClientFactory = alertingAuthorizationClientFactoryMock.createFactory();
const internalSavedObjectsRepository = savedObjectsRepositoryMock.create();
const backfillClient = backfillClientMock.create();

const rulesClientFactoryParams: jest.Mocked<RulesClientFactoryOpts> = {
  logger: loggingSystemMock.create().get(),
  taskManager: taskManagerMock.createStart(),
  ruleTypeRegistry: ruleTypeRegistryMock.create(),
  getSpaceId: jest.fn(),
  spaceIdToNamespace: jest.fn(),
  maxScheduledPerMinute: 10000,
  minimumScheduleInterval: { value: '1m', enforce: false },
  internalSavedObjectsRepository,
  encryptedSavedObjectsClient: encryptedSavedObjectsMock.createClient(),
  actions: actionsMock.createStart(),
  eventLog: eventLogMock.createStart(),
  kibanaVersion: '7.10.0',
  authorization:
    alertingAuthorizationClientFactory as unknown as AlertingAuthorizationClientFactory,
  backfillClient,
  connectorAdapterRegistry: new ConnectorAdapterRegistry(),
  uiSettings: uiSettingsServiceMock.createStartContract(),
  getAlertIndicesAlias: jest.fn(),
  alertsService: null,
};

const actionsAuthorization = actionsAuthorizationMock.create();

beforeEach(() => {
  jest.resetAllMocks();
  rulesClientFactoryParams.actions = actionsMock.createStart();
  (
    rulesClientFactoryParams.actions as jest.Mocked<ActionsStartContract>
  ).getActionsAuthorizationWithRequest.mockReturnValue(actionsAuthorization);
  rulesClientFactoryParams.getSpaceId.mockReturnValue('default');
  rulesClientFactoryParams.spaceIdToNamespace.mockReturnValue('default');
  rulesClientFactoryParams.uiSettings.asScopedToClient =
    uiSettingsServiceMock.createStartContract().asScopedToClient;
});

test('creates a rules client with proper constructor arguments when security is enabled', async () => {
  const factory = new RulesClientFactory();
  factory.initialize({ securityPluginSetup, securityPluginStart, ...rulesClientFactoryParams });
  const request = mockRouter.createKibanaRequest();

  savedObjectsService.getScopedClient.mockReturnValue(savedObjectsClient);
  alertingAuthorizationClientFactory.create.mockReturnValue(
    alertingAuthorization as unknown as AlertingAuthorization
  );

  factory.create(request, savedObjectsService);

  expect(savedObjectsService.getScopedClient).toHaveBeenCalledWith(request, {
    excludedExtensions: [SECURITY_EXTENSION_ID],
    includedHiddenTypes: [
      RULE_SAVED_OBJECT_TYPE,
      'api_key_pending_invalidation',
      AD_HOC_RUN_SAVED_OBJECT_TYPE,
    ],
  });

  expect(alertingAuthorizationClientFactory.create).toHaveBeenCalledWith(request);

  expect(rulesClientFactoryParams.actions.getActionsAuthorizationWithRequest).toHaveBeenCalledWith(
    request
  );

  expect(jest.requireMock('./rules_client').RulesClient).toHaveBeenCalledWith({
    unsecuredSavedObjectsClient: savedObjectsClient,
    authorization: alertingAuthorization,
    actionsAuthorization,
    logger: rulesClientFactoryParams.logger,
    taskManager: rulesClientFactoryParams.taskManager,
    ruleTypeRegistry: rulesClientFactoryParams.ruleTypeRegistry,
    spaceId: 'default',
    namespace: 'default',
    getUserName: expect.any(Function),
    getActionsClient: expect.any(Function),
    getEventLogClient: expect.any(Function),
    createAPIKey: expect.any(Function),
    internalSavedObjectsRepository: rulesClientFactoryParams.internalSavedObjectsRepository,
    encryptedSavedObjectsClient: rulesClientFactoryParams.encryptedSavedObjectsClient,
    kibanaVersion: '7.10.0',
    maxScheduledPerMinute: 10000,
    minimumScheduleInterval: { value: '1m', enforce: false },
    isAuthenticationTypeAPIKey: expect.any(Function),
    getAuthenticationAPIKey: expect.any(Function),
    connectorAdapterRegistry: expect.any(ConnectorAdapterRegistry),
    isSystemAction: expect.any(Function),
    getAlertIndicesAlias: expect.any(Function),
    alertsService: null,
    backfillClient,
    uiSettings: rulesClientFactoryParams.uiSettings,
  });
});

test('creates a rules client with proper constructor arguments', async () => {
  const factory = new RulesClientFactory();
  factory.initialize(rulesClientFactoryParams);
  const request = mockRouter.createKibanaRequest();

  savedObjectsService.getScopedClient.mockReturnValue(savedObjectsClient);
  alertingAuthorizationClientFactory.create.mockReturnValue(
    alertingAuthorization as unknown as AlertingAuthorization
  );

  factory.create(request, savedObjectsService);

  expect(savedObjectsService.getScopedClient).toHaveBeenCalledWith(request, {
    excludedExtensions: [SECURITY_EXTENSION_ID],
    includedHiddenTypes: [
      RULE_SAVED_OBJECT_TYPE,
      'api_key_pending_invalidation',
      AD_HOC_RUN_SAVED_OBJECT_TYPE,
    ],
  });

  expect(alertingAuthorizationClientFactory.create).toHaveBeenCalledWith(request);

  expect(jest.requireMock('./rules_client').RulesClient).toHaveBeenCalledWith({
    unsecuredSavedObjectsClient: savedObjectsClient,
    authorization: alertingAuthorization,
    actionsAuthorization,
    logger: rulesClientFactoryParams.logger,
    taskManager: rulesClientFactoryParams.taskManager,
    ruleTypeRegistry: rulesClientFactoryParams.ruleTypeRegistry,
    spaceId: 'default',
    namespace: 'default',
    getUserName: expect.any(Function),
    createAPIKey: expect.any(Function),
    internalSavedObjectsRepository: rulesClientFactoryParams.internalSavedObjectsRepository,
    encryptedSavedObjectsClient: rulesClientFactoryParams.encryptedSavedObjectsClient,
    getActionsClient: expect.any(Function),
    getEventLogClient: expect.any(Function),
    kibanaVersion: '7.10.0',
    maxScheduledPerMinute: 10000,
    minimumScheduleInterval: { value: '1m', enforce: false },
    isAuthenticationTypeAPIKey: expect.any(Function),
    getAuthenticationAPIKey: expect.any(Function),
    connectorAdapterRegistry: expect.any(ConnectorAdapterRegistry),
    isSystemAction: expect.any(Function),
    getAlertIndicesAlias: expect.any(Function),
    alertsService: null,
    backfillClient,
    uiSettings: rulesClientFactoryParams.uiSettings,
  });
});

test('getUserName() returns null when security is disabled', async () => {
  const factory = new RulesClientFactory();
  factory.initialize(rulesClientFactoryParams);
  factory.create(mockRouter.createKibanaRequest(), savedObjectsService);
  const constructorCall = jest.requireMock('./rules_client').RulesClient.mock.calls[0][0];

  const userNameResult = await constructorCall.getUserName();
  expect(userNameResult).toEqual(null);
});

test('getUserName() returns a name when security is enabled', async () => {
  const factory = new RulesClientFactory();
  factory.initialize({
    ...rulesClientFactoryParams,
    securityPluginSetup,
    securityPluginStart,
  });
  factory.create(mockRouter.createKibanaRequest(), savedObjectsService);
  const constructorCall = jest.requireMock('./rules_client').RulesClient.mock.calls[0][0];

  securityPluginStart.authc.getCurrentUser.mockReturnValueOnce({
    username: 'bob',
  } as unknown as AuthenticatedUser);
  const userNameResult = await constructorCall.getUserName();
  expect(userNameResult).toEqual('bob');
});

test('getActionsClient() returns ActionsClient', async () => {
  const factory = new RulesClientFactory();
  factory.initialize(rulesClientFactoryParams);
  factory.create(mockRouter.createKibanaRequest(), savedObjectsService);
  const constructorCall = jest.requireMock('./rules_client').RulesClient.mock.calls[0][0];

  const actionsClient = await constructorCall.getActionsClient();
  expect(actionsClient).not.toBe(null);
});

test('createAPIKey() returns { apiKeysEnabled: false } when security is disabled', async () => {
  const factory = new RulesClientFactory();
  factory.initialize(rulesClientFactoryParams);
  factory.create(mockRouter.createKibanaRequest(), savedObjectsService);
  const constructorCall = jest.requireMock('./rules_client').RulesClient.mock.calls[0][0];

  const createAPIKeyResult = await constructorCall.createAPIKey();
  expect(createAPIKeyResult).toEqual({ apiKeysEnabled: false });
});

test('createAPIKey() returns { apiKeysEnabled: false } when security is enabled but ES security is disabled', async () => {
  const factory = new RulesClientFactory();
  factory.initialize(rulesClientFactoryParams);
  factory.create(mockRouter.createKibanaRequest(), savedObjectsService);
  const constructorCall = jest.requireMock('./rules_client').RulesClient.mock.calls[0][0];

  securityPluginStart.authc.apiKeys.grantAsInternalUser.mockResolvedValueOnce(null);
  const createAPIKeyResult = await constructorCall.createAPIKey();
  expect(createAPIKeyResult).toEqual({ apiKeysEnabled: false });
});

test('createAPIKey() returns an API key when security is enabled', async () => {
  const factory = new RulesClientFactory();
  factory.initialize({
    ...rulesClientFactoryParams,
    securityPluginSetup,
    securityPluginStart,
  });
  factory.create(mockRouter.createKibanaRequest(), savedObjectsService);
  const constructorCall = jest.requireMock('./rules_client').RulesClient.mock.calls[0][0];

  securityPluginStart.authc.apiKeys.grantAsInternalUser.mockResolvedValueOnce({
    api_key: '123',
    id: 'abc',
    name: '',
  });
  const createAPIKeyResult = await constructorCall.createAPIKey('test');
  expect(createAPIKeyResult).toEqual({
    apiKeysEnabled: true,
    result: { api_key: '123', id: 'abc', name: '' },
  });
  expect(securityPluginStart.authc.apiKeys.grantAsInternalUser).toHaveBeenCalledWith(
    expect.any(Object),
    {
      metadata: { managed: true },
      name: 'test',
      role_descriptors: {},
    }
  );
});

test('createAPIKey() throws when security plugin createAPIKey throws an error', async () => {
  const factory = new RulesClientFactory();
  factory.initialize({
    ...rulesClientFactoryParams,
    securityPluginSetup,
    securityPluginStart,
  });
  factory.create(mockRouter.createKibanaRequest(), savedObjectsService);
  const constructorCall = jest.requireMock('./rules_client').RulesClient.mock.calls[0][0];

  securityPluginStart.authc.apiKeys.grantAsInternalUser.mockRejectedValueOnce(
    new Error('TLS disabled')
  );
  await expect(constructorCall.createAPIKey()).rejects.toThrowErrorMatchingInlineSnapshot(
    `"TLS disabled"`
  );
});
