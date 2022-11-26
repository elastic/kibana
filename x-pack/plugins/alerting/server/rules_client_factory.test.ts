/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Request } from '@hapi/hapi';
import { RulesClientFactory, RulesClientFactoryOpts } from './rules_client_factory';
import { ruleTypeRegistryMock } from './rule_type_registry.mock';
import { taskManagerMock } from '@kbn/task-manager-plugin/server/mocks';
import { CoreKibanaRequest } from '@kbn/core/server';
import {
  savedObjectsClientMock,
  savedObjectsServiceMock,
  loggingSystemMock,
} from '@kbn/core/server/mocks';
import { encryptedSavedObjectsMock } from '@kbn/encrypted-saved-objects-plugin/server/mocks';
import { AuthenticatedUser } from '@kbn/security-plugin/common/model';
import { securityMock } from '@kbn/security-plugin/server/mocks';
import { PluginStartContract as ActionsStartContract } from '@kbn/actions-plugin/server';
import { actionsMock, actionsAuthorizationMock } from '@kbn/actions-plugin/server/mocks';
import { eventLogMock } from '@kbn/event-log-plugin/server/mocks';
import { alertingAuthorizationMock } from './authorization/alerting_authorization.mock';
import { alertingAuthorizationClientFactoryMock } from './alerting_authorization_client_factory.mock';
import { AlertingAuthorization } from './authorization';
import { AlertingAuthorizationClientFactory } from './alerting_authorization_client_factory';
import { SECURITY_EXTENSION_ID } from '@kbn/core-saved-objects-server';

jest.mock('./rules_client');
jest.mock('./authorization/alerting_authorization');

const savedObjectsClient = savedObjectsClientMock.create();
const savedObjectsService = savedObjectsServiceMock.createInternalStartContract();

const securityPluginSetup = securityMock.createSetup();
const securityPluginStart = securityMock.createStart();

const alertingAuthorization = alertingAuthorizationMock.create();
const alertingAuthorizationClientFactory = alertingAuthorizationClientFactoryMock.createFactory();

const rulesClientFactoryParams: jest.Mocked<RulesClientFactoryOpts> = {
  logger: loggingSystemMock.create().get(),
  taskManager: taskManagerMock.createStart(),
  ruleTypeRegistry: ruleTypeRegistryMock.create(),
  getSpaceId: jest.fn(),
  spaceIdToNamespace: jest.fn(),
  minimumScheduleInterval: { value: '1m', enforce: false },
  encryptedSavedObjectsClient: encryptedSavedObjectsMock.createClient(),
  actions: actionsMock.createStart(),
  eventLog: eventLogMock.createStart(),
  kibanaVersion: '7.10.0',
  authorization:
    alertingAuthorizationClientFactory as unknown as AlertingAuthorizationClientFactory,
};

const fakeRequest = {
  app: {},
  headers: {},
  getBasePath: () => '',
  path: '/',
  route: { settings: {} },
  url: {
    href: '/',
  },
  raw: {
    req: {
      url: '/',
    },
  },
  getSavedObjectsClient: () => savedObjectsClient,
} as unknown as Request;

const actionsAuthorization = actionsAuthorizationMock.create();

beforeEach(() => {
  jest.resetAllMocks();
  rulesClientFactoryParams.actions = actionsMock.createStart();
  (
    rulesClientFactoryParams.actions as jest.Mocked<ActionsStartContract>
  ).getActionsAuthorizationWithRequest.mockReturnValue(actionsAuthorization);
  rulesClientFactoryParams.getSpaceId.mockReturnValue('default');
  rulesClientFactoryParams.spaceIdToNamespace.mockReturnValue('default');
});

test('creates a rules client with proper constructor arguments when security is enabled', async () => {
  const factory = new RulesClientFactory();
  factory.initialize({ securityPluginSetup, securityPluginStart, ...rulesClientFactoryParams });
  const request = CoreKibanaRequest.from(fakeRequest);

  savedObjectsService.getScopedClient.mockReturnValue(savedObjectsClient);
  alertingAuthorizationClientFactory.create.mockReturnValue(
    alertingAuthorization as unknown as AlertingAuthorization
  );

  factory.create(request, savedObjectsService);

  expect(savedObjectsService.getScopedClient).toHaveBeenCalledWith(request, {
    excludedExtensions: [SECURITY_EXTENSION_ID],
    includedHiddenTypes: ['alert', 'api_key_pending_invalidation'],
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
    encryptedSavedObjectsClient: rulesClientFactoryParams.encryptedSavedObjectsClient,
    kibanaVersion: '7.10.0',
    minimumScheduleInterval: { value: '1m', enforce: false },
  });
});

test('creates a rules client with proper constructor arguments', async () => {
  const factory = new RulesClientFactory();
  factory.initialize(rulesClientFactoryParams);
  const request = CoreKibanaRequest.from(fakeRequest);

  savedObjectsService.getScopedClient.mockReturnValue(savedObjectsClient);
  alertingAuthorizationClientFactory.create.mockReturnValue(
    alertingAuthorization as unknown as AlertingAuthorization
  );

  factory.create(request, savedObjectsService);

  expect(savedObjectsService.getScopedClient).toHaveBeenCalledWith(request, {
    excludedExtensions: [SECURITY_EXTENSION_ID],
    includedHiddenTypes: ['alert', 'api_key_pending_invalidation'],
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
    encryptedSavedObjectsClient: rulesClientFactoryParams.encryptedSavedObjectsClient,
    getActionsClient: expect.any(Function),
    getEventLogClient: expect.any(Function),
    kibanaVersion: '7.10.0',
    minimumScheduleInterval: { value: '1m', enforce: false },
  });
});

test('getUserName() returns null when security is disabled', async () => {
  const factory = new RulesClientFactory();
  factory.initialize(rulesClientFactoryParams);
  factory.create(CoreKibanaRequest.from(fakeRequest), savedObjectsService);
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
  factory.create(CoreKibanaRequest.from(fakeRequest), savedObjectsService);
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
  factory.create(CoreKibanaRequest.from(fakeRequest), savedObjectsService);
  const constructorCall = jest.requireMock('./rules_client').RulesClient.mock.calls[0][0];

  const actionsClient = await constructorCall.getActionsClient();
  expect(actionsClient).not.toBe(null);
});

test('createAPIKey() returns { apiKeysEnabled: false } when security is disabled', async () => {
  const factory = new RulesClientFactory();
  factory.initialize(rulesClientFactoryParams);
  factory.create(CoreKibanaRequest.from(fakeRequest), savedObjectsService);
  const constructorCall = jest.requireMock('./rules_client').RulesClient.mock.calls[0][0];

  const createAPIKeyResult = await constructorCall.createAPIKey();
  expect(createAPIKeyResult).toEqual({ apiKeysEnabled: false });
});

test('createAPIKey() returns { apiKeysEnabled: false } when security is enabled but ES security is disabled', async () => {
  const factory = new RulesClientFactory();
  factory.initialize(rulesClientFactoryParams);
  factory.create(CoreKibanaRequest.from(fakeRequest), savedObjectsService);
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
  factory.create(CoreKibanaRequest.from(fakeRequest), savedObjectsService);
  const constructorCall = jest.requireMock('./rules_client').RulesClient.mock.calls[0][0];

  securityPluginStart.authc.apiKeys.grantAsInternalUser.mockResolvedValueOnce({
    api_key: '123',
    id: 'abc',
    name: '',
  });
  const createAPIKeyResult = await constructorCall.createAPIKey();
  expect(createAPIKeyResult).toEqual({
    apiKeysEnabled: true,
    result: { api_key: '123', id: 'abc', name: '' },
  });
});

test('createAPIKey() throws when security plugin createAPIKey throws an error', async () => {
  const factory = new RulesClientFactory();
  factory.initialize({
    ...rulesClientFactoryParams,
    securityPluginSetup,
    securityPluginStart,
  });
  factory.create(CoreKibanaRequest.from(fakeRequest), savedObjectsService);
  const constructorCall = jest.requireMock('./rules_client').RulesClient.mock.calls[0][0];

  securityPluginStart.authc.apiKeys.grantAsInternalUser.mockRejectedValueOnce(
    new Error('TLS disabled')
  );
  await expect(constructorCall.createAPIKey()).rejects.toThrowErrorMatchingInlineSnapshot(
    `"TLS disabled"`
  );
});
