/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Request } from 'hapi';
import { AlertsClientFactory, AlertsClientFactoryOpts } from './alerts_client_factory';
import { alertTypeRegistryMock } from './alert_type_registry.mock';
import { taskManagerMock } from '../../task_manager/server/task_manager.mock';
import { KibanaRequest } from '../../../../src/core/server';
import { loggingSystemMock, savedObjectsClientMock } from '../../../../src/core/server/mocks';
import { encryptedSavedObjectsMock } from '../../encrypted_saved_objects/server/mocks';
import { AuthenticatedUser } from '../../../plugins/security/common/model';
import { securityMock } from '../../security/server/mocks';
import { actionsMock } from '../../actions/server/mocks';

jest.mock('./alerts_client');

const savedObjectsClient = savedObjectsClientMock.create();
const securityPluginSetup = securityMock.createSetup();
const alertsClientFactoryParams: jest.Mocked<AlertsClientFactoryOpts> = {
  logger: loggingSystemMock.create().get(),
  taskManager: taskManagerMock.start(),
  alertTypeRegistry: alertTypeRegistryMock.create(),
  getSpaceId: jest.fn(),
  spaceIdToNamespace: jest.fn(),
  encryptedSavedObjectsClient: encryptedSavedObjectsMock.createClient(),
  actions: actionsMock.createStart(),
};
const fakeRequest = ({
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
} as unknown) as Request;

beforeEach(() => {
  jest.resetAllMocks();
  alertsClientFactoryParams.getSpaceId.mockReturnValue('default');
  alertsClientFactoryParams.spaceIdToNamespace.mockReturnValue('default');
});

test('creates an alerts client with proper constructor arguments', async () => {
  const factory = new AlertsClientFactory();
  factory.initialize(alertsClientFactoryParams);
  factory.create(KibanaRequest.from(fakeRequest), savedObjectsClient);

  expect(jest.requireMock('./alerts_client').AlertsClient).toHaveBeenCalledWith({
    savedObjectsClient,
    logger: alertsClientFactoryParams.logger,
    taskManager: alertsClientFactoryParams.taskManager,
    alertTypeRegistry: alertsClientFactoryParams.alertTypeRegistry,
    spaceId: 'default',
    namespace: 'default',
    getUserName: expect.any(Function),
    createAPIKey: expect.any(Function),
    invalidateAPIKey: expect.any(Function),
    encryptedSavedObjectsClient: alertsClientFactoryParams.encryptedSavedObjectsClient,
    getActionsClient: expect.any(Function),
  });
});

test('getUserName() returns null when security is disabled', async () => {
  const factory = new AlertsClientFactory();
  factory.initialize(alertsClientFactoryParams);
  factory.create(KibanaRequest.from(fakeRequest), savedObjectsClient);
  const constructorCall = jest.requireMock('./alerts_client').AlertsClient.mock.calls[0][0];

  const userNameResult = await constructorCall.getUserName();
  expect(userNameResult).toEqual(null);
});

test('getUserName() returns a name when security is enabled', async () => {
  const factory = new AlertsClientFactory();
  factory.initialize({
    ...alertsClientFactoryParams,
    securityPluginSetup,
  });
  factory.create(KibanaRequest.from(fakeRequest), savedObjectsClient);
  const constructorCall = jest.requireMock('./alerts_client').AlertsClient.mock.calls[0][0];

  securityPluginSetup.authc.getCurrentUser.mockReturnValueOnce(({
    username: 'bob',
  } as unknown) as AuthenticatedUser);
  const userNameResult = await constructorCall.getUserName();
  expect(userNameResult).toEqual('bob');
});

test('getActionsClient() returns ActionsClient', async () => {
  const factory = new AlertsClientFactory();
  factory.initialize(alertsClientFactoryParams);
  factory.create(KibanaRequest.from(fakeRequest), savedObjectsClient);
  const constructorCall = jest.requireMock('./alerts_client').AlertsClient.mock.calls[0][0];

  const actionsClient = await constructorCall.getActionsClient();
  expect(actionsClient).not.toBe(null);
});

test('createAPIKey() returns { apiKeysEnabled: false } when security is disabled', async () => {
  const factory = new AlertsClientFactory();
  factory.initialize(alertsClientFactoryParams);
  factory.create(KibanaRequest.from(fakeRequest), savedObjectsClient);
  const constructorCall = jest.requireMock('./alerts_client').AlertsClient.mock.calls[0][0];

  const createAPIKeyResult = await constructorCall.createAPIKey();
  expect(createAPIKeyResult).toEqual({ apiKeysEnabled: false });
});

test('createAPIKey() returns { apiKeysEnabled: false } when security is enabled but ES security is disabled', async () => {
  const factory = new AlertsClientFactory();
  factory.initialize(alertsClientFactoryParams);
  factory.create(KibanaRequest.from(fakeRequest), savedObjectsClient);
  const constructorCall = jest.requireMock('./alerts_client').AlertsClient.mock.calls[0][0];

  securityPluginSetup.authc.grantAPIKeyAsInternalUser.mockResolvedValueOnce(null);
  const createAPIKeyResult = await constructorCall.createAPIKey();
  expect(createAPIKeyResult).toEqual({ apiKeysEnabled: false });
});

test('createAPIKey() returns an API key when security is enabled', async () => {
  const factory = new AlertsClientFactory();
  factory.initialize({
    ...alertsClientFactoryParams,
    securityPluginSetup,
  });
  factory.create(KibanaRequest.from(fakeRequest), savedObjectsClient);
  const constructorCall = jest.requireMock('./alerts_client').AlertsClient.mock.calls[0][0];

  securityPluginSetup.authc.grantAPIKeyAsInternalUser.mockResolvedValueOnce({
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
  const factory = new AlertsClientFactory();
  factory.initialize({
    ...alertsClientFactoryParams,
    securityPluginSetup,
  });
  factory.create(KibanaRequest.from(fakeRequest), savedObjectsClient);
  const constructorCall = jest.requireMock('./alerts_client').AlertsClient.mock.calls[0][0];

  securityPluginSetup.authc.grantAPIKeyAsInternalUser.mockRejectedValueOnce(
    new Error('TLS disabled')
  );
  await expect(constructorCall.createAPIKey()).rejects.toThrowErrorMatchingInlineSnapshot(
    `"TLS disabled"`
  );
});
