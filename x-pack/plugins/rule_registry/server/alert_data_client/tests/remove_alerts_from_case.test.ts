/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import { elasticsearchClientMock } from '@kbn/core-elasticsearch-client-server-mocks';
import { alertingAuthorizationMock } from '@kbn/alerting-plugin/server/authorization/alerting_authorization.mock';
import { auditLoggerMock } from '@kbn/security-plugin/server/audit/mocks';
import { ALERT_CASE_IDS, ALERT_RULE_CONSUMER, ALERT_RULE_TYPE_ID } from '@kbn/rule-data-utils';
import { AlertsClient, ConstructorOptions } from '../alerts_client';
import { ruleDataServiceMock } from '../../rule_data_plugin_service/rule_data_plugin_service.mock';

describe('removeCaseIdFromAlerts', () => {
  const alertingAuthMock = alertingAuthorizationMock.create();
  const esClientMock = elasticsearchClientMock.createElasticsearchClient();
  const auditLogger = auditLoggerMock.create();
  const caseId = 'test-case';
  const alerts = [
    {
      id: 'alert-id',
      index: 'alert-index',
    },
  ];

  const alertsClientParams: jest.Mocked<ConstructorOptions> = {
    logger: loggingSystemMock.create().get(),
    authorization: alertingAuthMock,
    esClient: esClientMock,
    auditLogger,
    ruleDataService: ruleDataServiceMock.create(),
  };

  beforeEach(() => {
    jest.clearAllMocks();

    esClientMock.mget.mockResponseOnce({
      docs: [
        {
          found: true,
          _id: 'alert-id',
          _index: 'alert-index',
          _source: {
            [ALERT_RULE_TYPE_ID]: 'apm.error_rate',
            [ALERT_RULE_CONSUMER]: 'apm',
            [ALERT_CASE_IDS]: [caseId],
          },
        },
      ],
    });
  });

  it('removes alerts from a case', async () => {
    const alertsClient = new AlertsClient(alertsClientParams);
    await alertsClient.removeCaseIdFromAlerts({ caseId, alerts });

    expect(esClientMock.mget).toHaveBeenCalledWith({
      docs: [{ _id: 'alert-id', _index: 'alert-index' }],
    });

    expect(esClientMock.bulk.mock.calls[0][0]).toMatchInlineSnapshot(`
      Object {
        "body": Array [
          Object {
            "update": Object {
              "_id": "alert-id",
              "_index": "alert-index",
            },
          },
          Object {
            "script": Object {
              "lang": "painless",
              "source": "if (ctx._source['kibana.alert.case_ids'] != null) {
              for (int i=0; i < ctx._source['kibana.alert.case_ids'].length; i++) {
                  if (ctx._source['kibana.alert.case_ids'][i].equals('test-case')) {
                      ctx._source['kibana.alert.case_ids'].remove(i);
                  }
              }
            }",
            },
          },
        ],
        "refresh": "wait_for",
      }
    `);
  });

  it('calls ensureAllAlertsAuthorized correctly', async () => {
    const alertsClient = new AlertsClient(alertsClientParams);
    await alertsClient.removeCaseIdFromAlerts({ caseId, alerts });

    expect(alertingAuthMock.ensureAuthorized).toHaveBeenCalledWith({
      consumer: 'apm',
      entity: 'alert',
      operation: 'get',
      ruleTypeId: 'apm.error_rate',
    });
  });

  it('does not do any calls if there are no alerts', async () => {
    const alertsClient = new AlertsClient(alertsClientParams);
    await alertsClient.removeCaseIdFromAlerts({ caseId, alerts: [] });

    expect(alertingAuthMock.ensureAuthorized).not.toHaveBeenCalled();
    expect(esClientMock.bulk).not.toHaveBeenCalled();
  });
});
