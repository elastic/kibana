/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Request } from '@hapi/hapi';
import { alertTypeRegistryMock } from './alert_type_registry.mock';
import { KibanaRequest } from '../../../../src/core/server';
import { savedObjectsClientMock } from '../../../../src/core/server/mocks';
import { securityMock } from '../../security/server/mocks';
import { ALERTS_FEATURE_ID } from '../common';
import {
  AlertingAuthorizationClientFactory,
  AlertingAuthorizationClientFactoryOpts,
} from './alerting_authorization_client_factory';
import { featuresPluginMock } from '../../features/server/mocks';

jest.mock('./authorization/alerts_authorization');
jest.mock('./authorization/audit_logger');

const savedObjectsClient = savedObjectsClientMock.create();
const features = featuresPluginMock.createStart();

const securityPluginSetup = securityMock.createSetup();
const securityPluginStart = securityMock.createStart();

const alertingAuthorizationClientFactoryParams: jest.Mocked<AlertingAuthorizationClientFactoryOpts> = {
  alertTypeRegistry: alertTypeRegistryMock.create(),
  getSpace: jest.fn(),
  features,
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
  const { AlertsAuthorizationAuditLogger } = jest.requireMock('./authorization/audit_logger');

  factory.create(request);

  const { AlertsAuthorization } = jest.requireMock('./authorization/alerts_authorization');
  expect(AlertsAuthorization).toHaveBeenCalledWith({
    request,
    authorization: securityPluginStart.authz,
    alertTypeRegistry: alertingAuthorizationClientFactoryParams.alertTypeRegistry,
    features: alertingAuthorizationClientFactoryParams.features,
    auditLogger: expect.any(AlertsAuthorizationAuditLogger),
    getSpace: expect.any(Function),
    exemptConsumerIds: [],
  });

  expect(AlertsAuthorizationAuditLogger).toHaveBeenCalled();
  expect(securityPluginSetup.audit.getLogger).toHaveBeenCalledWith(ALERTS_FEATURE_ID);
});

test('creates an alerting authorization client with proper constructor arguments when exemptConsumerIds are specified', async () => {
  const factory = new AlertingAuthorizationClientFactory();
  factory.initialize({
    securityPluginSetup,
    securityPluginStart,
    ...alertingAuthorizationClientFactoryParams,
  });
  const request = KibanaRequest.from(fakeRequest);
  const { AlertsAuthorizationAuditLogger } = jest.requireMock('./authorization/audit_logger');

  factory.create(request, ['exemptConsumerA', 'exemptConsumerB']);

  const { AlertsAuthorization } = jest.requireMock('./authorization/alerts_authorization');
  expect(AlertsAuthorization).toHaveBeenCalledWith({
    request,
    authorization: securityPluginStart.authz,
    alertTypeRegistry: alertingAuthorizationClientFactoryParams.alertTypeRegistry,
    features: alertingAuthorizationClientFactoryParams.features,
    auditLogger: expect.any(AlertsAuthorizationAuditLogger),
    getSpace: expect.any(Function),
    exemptConsumerIds: ['exemptConsumerA', 'exemptConsumerB'],
  });

  expect(AlertsAuthorizationAuditLogger).toHaveBeenCalled();
  expect(securityPluginSetup.audit.getLogger).toHaveBeenCalledWith(ALERTS_FEATURE_ID);
});

test('creates an alerting authorization client with proper constructor arguments', async () => {
  const factory = new AlertingAuthorizationClientFactory();
  factory.initialize(alertingAuthorizationClientFactoryParams);
  const request = KibanaRequest.from(fakeRequest);
  const { AlertsAuthorizationAuditLogger } = jest.requireMock('./authorization/audit_logger');

  factory.create(request);

  const { AlertsAuthorization } = jest.requireMock('./authorization/alerts_authorization');
  expect(AlertsAuthorization).toHaveBeenCalledWith({
    request,
    alertTypeRegistry: alertingAuthorizationClientFactoryParams.alertTypeRegistry,
    features: alertingAuthorizationClientFactoryParams.features,
    auditLogger: expect.any(AlertsAuthorizationAuditLogger),
    getSpace: expect.any(Function),
    exemptConsumerIds: [],
  });

  expect(AlertsAuthorizationAuditLogger).toHaveBeenCalled();
  expect(securityPluginSetup.audit.getLogger).not.toHaveBeenCalled();
});
