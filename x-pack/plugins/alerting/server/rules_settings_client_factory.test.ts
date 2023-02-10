/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Request } from '@hapi/hapi';
import { CoreKibanaRequest } from '@kbn/core/server';
import {
  RulesSettingsClientFactory,
  RulesSettingsClientFactoryOpts,
} from './rules_settings_client_factory';
import {
  savedObjectsClientMock,
  savedObjectsServiceMock,
  loggingSystemMock,
} from '@kbn/core/server/mocks';
import { AuthenticatedUser } from '@kbn/security-plugin/common/model';
import { securityMock } from '@kbn/security-plugin/server/mocks';
import { SECURITY_EXTENSION_ID } from '@kbn/core-saved-objects-server';
import { RULES_SETTINGS_SAVED_OBJECT_TYPE } from '../common';

jest.mock('./rules_settings_client');

const savedObjectsClient = savedObjectsClientMock.create();
const savedObjectsService = savedObjectsServiceMock.createInternalStartContract();

const securityPluginStart = securityMock.createStart();

const rulesSettingsClientFactoryParams: jest.Mocked<RulesSettingsClientFactoryOpts> = {
  logger: loggingSystemMock.create().get(),
  savedObjectsService,
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

beforeEach(() => {
  jest.resetAllMocks();
});

test('creates a rules settings client with proper constructor arguments when security is enabled', async () => {
  const factory = new RulesSettingsClientFactory();
  factory.initialize({
    securityPluginStart,
    ...rulesSettingsClientFactoryParams,
  });
  const request = CoreKibanaRequest.from(fakeRequest);

  savedObjectsService.getScopedClient.mockReturnValue(savedObjectsClient);

  factory.createWithAuthorization(request);

  expect(savedObjectsService.getScopedClient).toHaveBeenCalledWith(request, {
    includedHiddenTypes: [RULES_SETTINGS_SAVED_OBJECT_TYPE],
  });

  const { RulesSettingsClient } = jest.requireMock('./rules_settings_client');

  expect(RulesSettingsClient).toHaveBeenCalledWith({
    logger: rulesSettingsClientFactoryParams.logger,
    savedObjectsClient,
    getUserName: expect.any(Function),
  });
});

test('creates a rules settings client with proper constructor arguments', async () => {
  const factory = new RulesSettingsClientFactory();
  factory.initialize(rulesSettingsClientFactoryParams);
  const request = CoreKibanaRequest.from(fakeRequest);

  savedObjectsService.getScopedClient.mockReturnValue(savedObjectsClient);

  factory.createWithAuthorization(request);

  expect(savedObjectsService.getScopedClient).toHaveBeenCalledWith(request, {
    includedHiddenTypes: [RULES_SETTINGS_SAVED_OBJECT_TYPE],
  });

  const { RulesSettingsClient } = jest.requireMock('./rules_settings_client');

  expect(RulesSettingsClient).toHaveBeenCalledWith({
    logger: rulesSettingsClientFactoryParams.logger,
    savedObjectsClient,
    getUserName: expect.any(Function),
  });
});

test('creates an unauthorized rules settings client', async () => {
  const factory = new RulesSettingsClientFactory();
  factory.initialize({
    securityPluginStart,
    ...rulesSettingsClientFactoryParams,
  });
  const request = CoreKibanaRequest.from(fakeRequest);

  savedObjectsService.getScopedClient.mockReturnValue(savedObjectsClient);

  factory.create(request);

  expect(savedObjectsService.getScopedClient).toHaveBeenCalledWith(request, {
    excludedExtensions: [SECURITY_EXTENSION_ID],
    includedHiddenTypes: [RULES_SETTINGS_SAVED_OBJECT_TYPE],
  });

  const { RulesSettingsClient } = jest.requireMock('./rules_settings_client');

  expect(RulesSettingsClient).toHaveBeenCalledWith({
    logger: rulesSettingsClientFactoryParams.logger,
    savedObjectsClient,
    getUserName: expect.any(Function),
  });
});

test('getUserName() returns null when security is disabled', async () => {
  const factory = new RulesSettingsClientFactory();
  factory.initialize(rulesSettingsClientFactoryParams);
  const request = CoreKibanaRequest.from(fakeRequest);

  factory.createWithAuthorization(request);
  const constructorCall =
    jest.requireMock('./rules_settings_client').RulesSettingsClient.mock.calls[0][0];

  const userNameResult = await constructorCall.getUserName();
  expect(userNameResult).toEqual(null);
});

test('getUserName() returns a name when security is enabled', async () => {
  const factory = new RulesSettingsClientFactory();
  factory.initialize({
    securityPluginStart,
    ...rulesSettingsClientFactoryParams,
  });
  const request = CoreKibanaRequest.from(fakeRequest);

  factory.createWithAuthorization(request);

  const constructorCall =
    jest.requireMock('./rules_settings_client').RulesSettingsClient.mock.calls[0][0];

  securityPluginStart.authc.getCurrentUser.mockReturnValueOnce({
    username: 'testname',
  } as unknown as AuthenticatedUser);
  const userNameResult = await constructorCall.getUserName();
  expect(userNameResult).toEqual('testname');
});
