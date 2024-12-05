/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AlertsClient, ConstructorOptions } from '../alerts_client';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import { elasticsearchClientMock } from '@kbn/core-elasticsearch-client-server-mocks';
import { alertingAuthorizationMock } from '@kbn/alerting-plugin/server/authorization/alerting_authorization.mock';
import { auditLoggerMock } from '@kbn/security-plugin/server/audit/mocks';
import { ruleDataServiceMock } from '../../rule_data_plugin_service/rule_data_plugin_service.mock';
import { JsonObject } from '@kbn/utility-types';

jest.mock('uuid', () => ({ v4: () => 'unique-value' }));

const alertingAuthMock = alertingAuthorizationMock.create();
const esClientMock = elasticsearchClientMock.createElasticsearchClient();
const auditLogger = auditLoggerMock.create();

const alertsClientParams: jest.Mocked<ConstructorOptions> = {
  logger: loggingSystemMock.create().get(),
  authorization: alertingAuthMock,
  esClient: esClientMock,
  auditLogger,
  ruleDataService: ruleDataServiceMock.create(),
  getRuleType: jest.fn(),
  getRuleList: jest.fn(),
  getAlertIndicesAlias: jest.fn().mockReturnValue(['stack-index']),
};

const DEFAULT_SPACE = 'test_default_space_id';
const authorizedRuleTypes = new Map([
  [
    '.es-query',
    {
      producer: 'stackAlerts',
      id: '.es-query',
      alerts: {
        context: 'stack',
      },
      authorizedConsumers: {},
    },
  ],
]);

const filter = {
  bool: {
    filter: [
      {
        bool: {
          should: [
            {
              bool: {
                filter: [
                  {
                    bool: {
                      should: [{ match: { 'kibana.alert.rule.rule_type_id': '.es-query' } }],
                      minimum_should_match: 1,
                    },
                  },
                  {
                    bool: {
                      should: [
                        {
                          bool: {
                            should: [{ match: { 'kibana.alert.rule.consumer': 'stackAlerts' } }],
                            minimum_should_match: 1,
                          },
                        },
                        {
                          bool: {
                            should: [{ match: { 'kibana.alert.rule.consumer': 'alerts' } }],
                            minimum_should_match: 1,
                          },
                        },
                      ],
                      minimum_should_match: 1,
                    },
                  },
                ],
              },
            },
          ],
          minimum_should_match: 1,
        },
      },
      { term: { 'kibana.space_ids': 'default' } },
      { terms: { 'kibana.alert.rule.rule_type_id': ['.es-query'] } },
    ],
  },
};

describe('getAlertSummary()', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    alertingAuthMock.getSpaceId.mockImplementation(() => DEFAULT_SPACE);
    alertingAuthMock.getAllAuthorizedRuleTypesFindOperation.mockResolvedValue(authorizedRuleTypes);
    alertingAuthMock.getAuthorizationFilter.mockResolvedValue({
      filter: filter as unknown as JsonObject,
      ensureRuleTypeIsAuthorized: jest.fn(),
    });
  });

  test('calls find() with the correct params', async () => {
    const alertsClient = new AlertsClient(alertsClientParams) as jest.Mocked<AlertsClient>;
    alertsClient.find = jest.fn().mockResolvedValue({ aggregations: {} });

    const ruleTypeIds = ['.es-query'];
    const consumers = ['stackAlerts'];

    await alertsClient.getAlertSummary({
      gte: 'now-1d/d',
      lte: 'now/d',
      ruleTypeIds,
      consumers,
    });

    expect(esClientMock.search.mock.calls).toMatchInlineSnapshot(`
      Array [
        Array [
          Object {
            "body": Object {
              "_source": undefined,
              "aggs": Object {
                "active_alerts_bucket": Object {
                  "date_histogram": Object {
                    "extended_bounds": Object {
                      "max": "now/d",
                      "min": "now-1d/d",
                    },
                    "field": "kibana.alert.time_range",
                    "fixed_interval": "1m",
                    "hard_bounds": Object {
                      "max": "now/d",
                      "min": "now-1d/d",
                    },
                    "min_doc_count": 0,
                  },
                },
                "count": Object {
                  "terms": Object {
                    "field": "kibana.alert.status",
                  },
                },
                "recovered_alerts": Object {
                  "aggs": Object {
                    "container": Object {
                      "date_histogram": Object {
                        "extended_bounds": Object {
                          "max": "now/d",
                          "min": "now-1d/d",
                        },
                        "field": "kibana.alert.end",
                        "fixed_interval": "1m",
                        "min_doc_count": 0,
                      },
                    },
                  },
                  "filter": Object {
                    "term": Object {
                      "kibana.alert.status": "recovered",
                    },
                  },
                },
              },
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
                      "bool": Object {
                        "filter": Array [
                          Object {
                            "bool": Object {
                              "minimum_should_match": 1,
                              "should": Array [
                                Object {
                                  "bool": Object {
                                    "filter": Array [
                                      Object {
                                        "bool": Object {
                                          "minimum_should_match": 1,
                                          "should": Array [
                                            Object {
                                              "match": Object {
                                                "kibana.alert.rule.rule_type_id": ".es-query",
                                              },
                                            },
                                          ],
                                        },
                                      },
                                      Object {
                                        "bool": Object {
                                          "minimum_should_match": 1,
                                          "should": Array [
                                            Object {
                                              "bool": Object {
                                                "minimum_should_match": 1,
                                                "should": Array [
                                                  Object {
                                                    "match": Object {
                                                      "kibana.alert.rule.consumer": "stackAlerts",
                                                    },
                                                  },
                                                ],
                                              },
                                            },
                                            Object {
                                              "bool": Object {
                                                "minimum_should_match": 1,
                                                "should": Array [
                                                  Object {
                                                    "match": Object {
                                                      "kibana.alert.rule.consumer": "alerts",
                                                    },
                                                  },
                                                ],
                                              },
                                            },
                                          ],
                                        },
                                      },
                                    ],
                                  },
                                },
                              ],
                            },
                          },
                          Object {
                            "term": Object {
                              "kibana.space_ids": "default",
                            },
                          },
                          Object {
                            "terms": Object {
                              "kibana.alert.rule.rule_type_id": Array [
                                ".es-query",
                              ],
                            },
                          },
                        ],
                      },
                    },
                    Object {
                      "term": Object {
                        "kibana.space_ids": "test_default_space_id",
                      },
                    },
                    Object {
                      "terms": Object {
                        "kibana.alert.rule.rule_type_id": Array [
                          ".es-query",
                        ],
                      },
                    },
                    Object {
                      "terms": Object {
                        "kibana.alert.rule.consumer": Array [
                          "stackAlerts",
                        ],
                      },
                    },
                  ],
                  "must": Array [
                    Object {
                      "bool": Object {
                        "filter": Array [
                          Object {
                            "range": Object {
                              "kibana.alert.time_range": Object {
                                "gt": "now-1d/d",
                                "lt": "now/d",
                              },
                            },
                          },
                        ],
                      },
                    },
                  ],
                  "must_not": Array [],
                  "should": Array [],
                },
              },
              "runtime_mappings": undefined,
              "size": 0,
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
            "index": "stack-index",
            "seq_no_primary_term": true,
          },
        ],
      ]
    `);
  });
});
