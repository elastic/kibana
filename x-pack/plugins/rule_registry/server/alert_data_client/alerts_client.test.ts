/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { alertingAuthorizationMock } from '@kbn/alerting-plugin/server/authorization/alerting_authorization.mock';
import { ruleDataServiceMock } from '../rule_data_plugin_service/rule_data_plugin_service.mock';
import { AlertsClient, ConstructorOptions } from './alerts_client';
import { fromKueryExpression } from '@kbn/es-query';

describe('AlertsClient', () => {
  const alertingAuthMock = alertingAuthorizationMock.create();
  const ruleDataService = ruleDataServiceMock.create();
  const requestHandlerContext = coreMock.createRequestHandlerContext();
  const esClientMock = requestHandlerContext.elasticsearch.client.asCurrentUser;

  let alertsClient: AlertsClient;

  beforeEach(() => {
    jest.clearAllMocks();
    alertingAuthMock.getSpaceId.mockReturnValue('space-1');
    alertingAuthMock.getAllAuthorizedRuleTypesFindOperation.mockResolvedValue(
      new Map([
        [
          'test-rule-type-1',
          {
            id: 'test-rule-type-1',
            authorizedConsumers: { foo: { all: true, read: true } },
          },
        ],
      ])
    );

    alertingAuthMock.getAuthorizationFilter.mockResolvedValue({
      filter: fromKueryExpression(
        'alert.attributes.alertTypeId: test-rule-type-1 AND alert.attributes.consumer: foo'
      ),
      ensureRuleTypeIsAuthorized: jest.fn(),
    });

    const alertsClientParams: ConstructorOptions = {
      logger: loggingSystemMock.create().get(),
      authorization: alertingAuthMock,
      esClient: esClientMock,
      ruleDataService,
      getRuleType: jest.fn(),
      getRuleList: jest.fn(),
      getAlertIndicesAlias: jest.fn(),
    };

    alertsClient = new AlertsClient(alertsClientParams);
  });

  describe('find', () => {
    it('creates the ruleTypeIds filter correctly', async () => {
      await alertsClient.find({ ruleTypeIds: ['test-rule-type-1', 'test-rule-type-2'] });

      expect(esClientMock.search.mock.calls[0][0]).toMatchInlineSnapshot(`
        Object {
          "body": Object {
            "_source": undefined,
            "aggs": undefined,
            "fields": Array [
              "kibana.alert.rule.rule_type_id",
              "kibana.alert.rule.consumer",
              "kibana.alert.workflow_status",
              "kibana.space_ids",
            ],
            "query": Object {
              "bool": Object {
                "filter": Array [
                  Object {
                    "arguments": Array [
                      Object {
                        "arguments": Array [
                          Object {
                            "isQuoted": false,
                            "type": "literal",
                            "value": "alert.attributes.alertTypeId",
                          },
                          Object {
                            "isQuoted": false,
                            "type": "literal",
                            "value": "test-rule-type-1",
                          },
                        ],
                        "function": "is",
                        "type": "function",
                      },
                      Object {
                        "arguments": Array [
                          Object {
                            "isQuoted": false,
                            "type": "literal",
                            "value": "alert.attributes.consumer",
                          },
                          Object {
                            "isQuoted": false,
                            "type": "literal",
                            "value": "foo",
                          },
                        ],
                        "function": "is",
                        "type": "function",
                      },
                    ],
                    "function": "and",
                    "type": "function",
                  },
                  Object {
                    "term": Object {
                      "kibana.space_ids": "space-1",
                    },
                  },
                  Object {
                    "terms": Object {
                      "kibana.alert.rule.rule_type_id": Array [
                        "test-rule-type-1",
                        "test-rule-type-2",
                      ],
                    },
                  },
                ],
                "must": Array [],
                "must_not": Array [],
                "should": Array [],
              },
            },
            "runtime_mappings": undefined,
            "size": undefined,
            "sort": Array [
              Object {
                "@timestamp": Object {
                  "order": "asc",
                  "unmapped_type": "date",
                },
              },
            ],
            "track_total_hits": undefined,
          },
          "ignore_unavailable": true,
          "index": ".alerts-*",
          "seq_no_primary_term": true,
        }
      `);
    });

    it('creates the consumers filter correctly', async () => {
      await alertsClient.find({ consumers: ['test-consumer-1', 'test-consumer-2'] });

      expect(esClientMock.search.mock.calls[0][0]).toMatchInlineSnapshot(`
        Object {
          "body": Object {
            "_source": undefined,
            "aggs": undefined,
            "fields": Array [
              "kibana.alert.rule.rule_type_id",
              "kibana.alert.rule.consumer",
              "kibana.alert.workflow_status",
              "kibana.space_ids",
            ],
            "query": Object {
              "bool": Object {
                "filter": Array [
                  Object {
                    "arguments": Array [
                      Object {
                        "arguments": Array [
                          Object {
                            "isQuoted": false,
                            "type": "literal",
                            "value": "alert.attributes.alertTypeId",
                          },
                          Object {
                            "isQuoted": false,
                            "type": "literal",
                            "value": "test-rule-type-1",
                          },
                        ],
                        "function": "is",
                        "type": "function",
                      },
                      Object {
                        "arguments": Array [
                          Object {
                            "isQuoted": false,
                            "type": "literal",
                            "value": "alert.attributes.consumer",
                          },
                          Object {
                            "isQuoted": false,
                            "type": "literal",
                            "value": "foo",
                          },
                        ],
                        "function": "is",
                        "type": "function",
                      },
                    ],
                    "function": "and",
                    "type": "function",
                  },
                  Object {
                    "term": Object {
                      "kibana.space_ids": "space-1",
                    },
                  },
                  Object {
                    "terms": Object {
                      "kibana.alert.rule.consumer": Array [
                        "test-consumer-1",
                        "test-consumer-2",
                      ],
                    },
                  },
                ],
                "must": Array [],
                "must_not": Array [],
                "should": Array [],
              },
            },
            "runtime_mappings": undefined,
            "size": undefined,
            "sort": Array [
              Object {
                "@timestamp": Object {
                  "order": "asc",
                  "unmapped_type": "date",
                },
              },
            ],
            "track_total_hits": undefined,
          },
          "ignore_unavailable": true,
          "index": ".alerts-*",
          "seq_no_primary_term": true,
        }
      `);
    });
  });
});
