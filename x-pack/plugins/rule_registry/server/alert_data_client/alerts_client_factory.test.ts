/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mockRouter } from '@kbn/core-http-router-server-mocks';
import { AlertsClientFactory, AlertsClientFactoryProps } from './alerts_client_factory';
import { ElasticsearchClient, KibanaRequest } from '@kbn/core/server';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import { securityMock } from '@kbn/security-plugin/server/mocks';
import { auditLoggerMock } from '@kbn/security-plugin/server/audit/mocks';
import { alertingAuthorizationMock } from '@kbn/alerting-plugin/server/authorization/alerting_authorization.mock';
import { ruleDataServiceMock } from '../rule_data_plugin_service/rule_data_plugin_service.mock';

jest.mock('./alerts_client');

const securityPluginSetup = securityMock.createSetup();
const alertingAuthMock = alertingAuthorizationMock.create();

const alertsClientFactoryParams: AlertsClientFactoryProps = {
  logger: loggingSystemMock.create().get(),
  getAlertingAuthorization: (_: KibanaRequest) => alertingAuthMock,
  securityPluginSetup,
  esClient: {} as ElasticsearchClient,
  ruleDataService: ruleDataServiceMock.create(),
  getRuleType: jest.fn(),
  getAlertIndicesAlias: jest.fn(),
};

const auditLogger = auditLoggerMock.create();

describe('AlertsClientFactory', () => {
  beforeEach(() => {
    jest.resetAllMocks();

    securityPluginSetup.audit.asScoped.mockReturnValue(auditLogger);
  });

  test('creates an alerts client with proper constructor arguments', async () => {
    const factory = new AlertsClientFactory();
    factory.initialize({ ...alertsClientFactoryParams });
    const request = mockRouter.createKibanaRequest({
      headers: {},
      path: '/',
    });
    await factory.create(request);

    expect(jest.requireMock('./alerts_client').AlertsClient).toHaveBeenCalledWith({
      authorization: alertingAuthMock,
      logger: alertsClientFactoryParams.logger,
      auditLogger,
      esClient: {},
      ruleDataService: alertsClientFactoryParams.ruleDataService,
      getRuleType: alertsClientFactoryParams.getRuleType,
      getAlertIndicesAlias: alertsClientFactoryParams.getAlertIndicesAlias,
    });
  });

  test('throws an error if already initialized', () => {
    const factory = new AlertsClientFactory();
    factory.initialize({ ...alertsClientFactoryParams });

    expect(() =>
      factory.initialize({ ...alertsClientFactoryParams })
    ).toThrowErrorMatchingInlineSnapshot(`"AlertsClientFactory (RAC) already initialized"`);
  });
});
