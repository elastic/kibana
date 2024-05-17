/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { alertingAuthorizationMock } from '@kbn/alerting-plugin/server/authorization/alerting_authorization.mock';
import { elasticsearchClientMock } from '@kbn/core-elasticsearch-client-server-mocks';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import { AlertConsumers } from '@kbn/rule-data-utils';
import { auditLoggerMock } from '@kbn/security-plugin/server/audit/mocks';
import { ruleDataServiceMock } from '../../rule_data_plugin_service/rule_data_plugin_service.mock';
import { AlertsClient, ConstructorOptions } from '../alerts_client';

const alertingAuthMock = alertingAuthorizationMock.create();
const esClientMock = elasticsearchClientMock.createElasticsearchClient();
const auditLogger = auditLoggerMock.create();
const getRuleTypeMock = jest.fn();
const alertsClientParams: jest.Mocked<ConstructorOptions> = {
  logger: loggingSystemMock.create().get(),
  authorization: alertingAuthMock,
  esClient: esClientMock,
  auditLogger,
  ruleDataService: ruleDataServiceMock.create(),
  getRuleType: getRuleTypeMock,
  getRuleList: jest.fn(),
  getAlertIndicesAlias: jest.fn(),
};

const DEFAULT_SPACE = 'test_default_space_id';

beforeEach(() => {
  jest.resetAllMocks();
  alertingAuthMock.getSpaceId.mockImplementation(() => DEFAULT_SPACE);
});

describe('getAADFields()', () => {
  test('should throw an error when a rule type belong to security solution', async () => {
    getRuleTypeMock.mockImplementation(() => ({
      producer: AlertConsumers.SIEM,
      fieldsForAAD: [],
    }));
    const alertsClient = new AlertsClient(alertsClientParams);

    await expect(
      alertsClient.getAADFields({ ruleTypeId: 'security-type' })
    ).rejects.toThrowErrorMatchingInlineSnapshot(`"Security solution rule type is not supported"`);
  });
});
