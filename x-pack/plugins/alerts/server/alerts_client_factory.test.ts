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
import {
  savedObjectsClientMock,
  savedObjectsServiceMock,
  loggingSystemMock,
} from '../../../../src/core/server/mocks';
import { encryptedSavedObjectsMock } from '../../encrypted_saved_objects/server/mocks';
import { AuthenticatedUser } from '../../../plugins/security/common/model';
import { securityMock } from '../../security/server/mocks';
import { PluginStartContract as ActionsStartContract } from '../../actions/server';
import { actionsMock, actionsAuthorizationMock } from '../../actions/server/mocks';
import { featuresPluginMock } from '../../features/server/mocks';
import { AuditLogger } from '../../security/server';
import { ALERTS_FEATURE_ID } from '../common';
import { eventLogMock } from '../../event_log/server/mocks';

jest.mock('./alerts_client');
jest.mock('./authorization/alerts_authorization');
jest.mock('./authorization/audit_logger');

const savedObjectsClient = savedObjectsClientMock.create();
const savedObjectsService = savedObjectsServiceMock.createInternalStartContract();
const features = featuresPluginMock.createStart();

const securityPluginSetup = securityMock.createSetup();
const alertsClientFactoryParams: jest.Mocked<AlertsClientFactoryOpts> = {
  logger: loggingSystemMock.create().get(),
  taskManager: taskManagerMock.start(),
  alertTypeRegistry: alertTypeRegistryMock.create(),
  getSpaceId: jest.fn(),
  getSpace: jest.fn(),
  spaceIdToNamespace: jest.fn(),
  encryptedSavedObjectsClient: encryptedSavedObjectsMock.createClient(),
  actions: actionsMock.createStart(),
  features,
  eventLog: eventLogMock.createStart(),
};
const fakeRequest = ({
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
} as unknown) as Request;

const actionsAuthorization = actionsAuthorizationMock.create();

beforeEach(() => {
  jest.resetAllMocks();
  alertsClientFactoryParams.actions = actionsMock.createStart();
  (alertsClientFactoryParams.actions as jest.Mocked<
    ActionsStartContract
  >).getActionsAuthorizationWithRequest.mockReturnValue(actionsAuthorization);
  alertsClientFactoryParams.getSpaceId.mockReturnValue('default');
  alertsClientFactoryParams.spaceIdToNamespace.mockReturnValue('default');
});

test('creates an alerts client with proper constructor arguments when security is enabled', async () => {
  const factory = new AlertsClientFactory();
  factory.initialize({ securityPluginSetup, ...alertsClientFactoryParams });
  const request = KibanaRequest.from(fakeRequest);

  const { AlertsAuthorizationAuditLogger } = jest.requireMock('./authorization/audit_logger');
  savedObjectsService.getScopedClient.mockReturnValue(savedObjectsClient);

  const logger = {
    log: jest.fn(),
  } as jest.Mocked<AuditLogger>;
  securityPluginSetup.audit.getLogger.mockReturnValue(logger);

  factory.create(request, savedObjectsService);

  expect(savedObjectsService.getScopedClient).toHaveBeenCalledWith(request, {
    excludedWrappers: ['security'],
    includedHiddenTypes: ['alert'],
  });

  const { AlertsAuthorization } = jest.requireMock('./authorization/alerts_authorization');
  expect(AlertsAuthorization).toHaveBeenCalledWith({
    request,
    authorization: securityPluginSetup.authz,
    alertTypeRegistry: alertsClientFactoryParams.alertTypeRegistry,
    features: alertsClientFactoryParams.features,
    auditLogger: expect.any(AlertsAuthorizationAuditLogger),
    getSpace: expect.any(Function),
  });

  expect(AlertsAuthorizationAuditLogger).toHaveBeenCalledWith(logger);
  expect(securityPluginSetup.audit.getLogger).toHaveBeenCalledWith(ALERTS_FEATURE_ID);

  expect(alertsClientFactoryParams.actions.getActionsAuthorizationWithRequest).toHaveBeenCalledWith(
    request
  );

  expect(jest.requireMock('./alerts_client').AlertsClient).toHaveBeenCalledWith({
    unsecuredSavedObjectsClient: savedObjectsClient,
    authorization: expect.any(AlertsAuthorization),
    actionsAuthorization,
    logger: alertsClientFactoryParams.logger,
    taskManager: alertsClientFactoryParams.taskManager,
    alertTypeRegistry: alertsClientFactoryParams.alertTypeRegistry,
    spaceId: 'default',
    namespace: 'default',
    getUserName: expect.any(Function),
    getActionsClient: expect.any(Function),
    getEventLogClient: expect.any(Function),
    createAPIKey: expect.any(Function),
    invalidateAPIKey: expect.any(Function),
    encryptedSavedObjectsClient: alertsClientFactoryParams.encryptedSavedObjectsClient,
  });
});

test('creates an alerts client with proper constructor arguments', async () => {
  const factory = new AlertsClientFactory();
  factory.initialize(alertsClientFactoryParams);
  const request = KibanaRequest.from(fakeRequest);

  savedObjectsService.getScopedClient.mockReturnValue(savedObjectsClient);

  factory.create(request, savedObjectsService);

  expect(savedObjectsService.getScopedClient).toHaveBeenCalledWith(request, {
    excludedWrappers: ['security'],
    includedHiddenTypes: ['alert'],
  });

  const { AlertsAuthorization } = jest.requireMock('./authorization/alerts_authorization');
  const { AlertsAuthorizationAuditLogger } = jest.requireMock('./authorization/audit_logger');
  expect(AlertsAuthorization).toHaveBeenCalledWith({
    request,
    authorization: undefined,
    alertTypeRegistry: alertsClientFactoryParams.alertTypeRegistry,
    features: alertsClientFactoryParams.features,
    auditLogger: expect.any(AlertsAuthorizationAuditLogger),
    getSpace: expect.any(Function),
  });

  expect(jest.requireMock('./alerts_client').AlertsClient).toHaveBeenCalledWith({
    unsecuredSavedObjectsClient: savedObjectsClient,
    authorization: expect.any(AlertsAuthorization),
    actionsAuthorization,
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
    getEventLogClient: expect.any(Function),
  });
});

test('getUserName() returns null when security is disabled', async () => {
  const factory = new AlertsClientFactory();
  factory.initialize(alertsClientFactoryParams);
  factory.create(KibanaRequest.from(fakeRequest), savedObjectsService);
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
  factory.create(KibanaRequest.from(fakeRequest), savedObjectsService);
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
  factory.create(KibanaRequest.from(fakeRequest), savedObjectsService);
  const constructorCall = jest.requireMock('./alerts_client').AlertsClient.mock.calls[0][0];

  const actionsClient = await constructorCall.getActionsClient();
  expect(actionsClient).not.toBe(null);
});

test('createAPIKey() returns { apiKeysEnabled: false } when security is disabled', async () => {
  const factory = new AlertsClientFactory();
  factory.initialize(alertsClientFactoryParams);
  factory.create(KibanaRequest.from(fakeRequest), savedObjectsService);
  const constructorCall = jest.requireMock('./alerts_client').AlertsClient.mock.calls[0][0];

  const createAPIKeyResult = await constructorCall.createAPIKey();
  expect(createAPIKeyResult).toEqual({ apiKeysEnabled: false });
});

test('createAPIKey() returns { apiKeysEnabled: false } when security is enabled but ES security is disabled', async () => {
  const factory = new AlertsClientFactory();
  factory.initialize(alertsClientFactoryParams);
  factory.create(KibanaRequest.from(fakeRequest), savedObjectsService);
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
  factory.create(KibanaRequest.from(fakeRequest), savedObjectsService);
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
  factory.create(KibanaRequest.from(fakeRequest), savedObjectsService);
  const constructorCall = jest.requireMock('./alerts_client').AlertsClient.mock.calls[0][0];

  securityPluginSetup.authc.grantAPIKeyAsInternalUser.mockRejectedValueOnce(
    new Error('TLS disabled')
  );
  await expect(constructorCall.createAPIKey()).rejects.toThrowErrorMatchingInlineSnapshot(
    `"TLS disabled"`
  );
});
