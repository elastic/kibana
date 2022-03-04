/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Request } from '@hapi/hapi';
import { ruleTypeRegistryMock } from './rule_type_registry.mock';
import { KibanaRequest } from '../../../../src/core/server';
import { savedObjectsClientMock } from '../../../../src/core/server/mocks';
import { securityMock } from '../../security/server/mocks';
import {
  AlertingAuthorizationClientFactory,
  AlertingAuthorizationClientFactoryOpts,
} from './alerting_authorization_client_factory';
import { featuresPluginMock } from '../../features/server/mocks';

jest.mock('./authorization/alerting_authorization');

const savedObjectsClient = savedObjectsClientMock.create();
const features = featuresPluginMock.createStart();

const securityPluginSetup = securityMock.createSetup();
const securityPluginStart = securityMock.createStart();

const alertingAuthorizationClientFactoryParams: jest.Mocked<AlertingAuthorizationClientFactoryOpts> =
  {
    ruleTypeRegistry: ruleTypeRegistryMock.create(),
    getSpace: jest.fn(),
    getSpaceId: jest.fn(),
    features,
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

test('creates an alerting authorization client with proper constructor arguments when security is enabled', async () => {
  const factory = new AlertingAuthorizationClientFactory();
  factory.initialize({
    securityPluginSetup,
    securityPluginStart,
    ...alertingAuthorizationClientFactoryParams,
  });
  const request = KibanaRequest.from(fakeRequest);

  factory.create(request);

  const { AlertingAuthorization } = jest.requireMock('./authorization/alerting_authorization');
  expect(AlertingAuthorization).toHaveBeenCalledWith({
    request,
    authorization: securityPluginStart.authz,
    ruleTypeRegistry: alertingAuthorizationClientFactoryParams.ruleTypeRegistry,
    features: alertingAuthorizationClientFactoryParams.features,
    getSpace: expect.any(Function),
    getSpaceId: expect.any(Function),
  });
});

test('creates an alerting authorization client with proper constructor arguments', async () => {
  const factory = new AlertingAuthorizationClientFactory();
  factory.initialize(alertingAuthorizationClientFactoryParams);
  const request = KibanaRequest.from(fakeRequest);

  factory.create(request);

  const { AlertingAuthorization } = jest.requireMock('./authorization/alerting_authorization');
  expect(AlertingAuthorization).toHaveBeenCalledWith({
    request,
    ruleTypeRegistry: alertingAuthorizationClientFactoryParams.ruleTypeRegistry,
    features: alertingAuthorizationClientFactoryParams.features,
    getSpace: expect.any(Function),
    getSpaceId: expect.any(Function),
  });
});
