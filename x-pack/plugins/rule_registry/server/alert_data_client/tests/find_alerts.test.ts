/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ALERT_RULE_CONSUMER,
  ALERT_RULE_TYPE_ID,
  SPACE_IDS,
  ALERT_WORKFLOW_STATUS,
} from '@kbn/rule-data-utils';
import { AlertsClient, ConstructorOptions } from '../alerts_client';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import { elasticsearchClientMock } from '@kbn/core-elasticsearch-client-server-mocks';
import { alertingAuthorizationMock } from '@kbn/alerting-plugin/server/authorization/alerting_authorization.mock';
import { auditLoggerMock } from '@kbn/security-plugin/server/audit/mocks';
import { ruleDataServiceMock } from '../../rule_data_plugin_service/rule_data_plugin_service.mock';

describe('find()', () => {
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
    getAlertIndicesAlias: jest.fn(),
  };

  const DEFAULT_SPACE = 'test_default_space_id';
  const authorizedRuleTypes = new Map([
    [
      'apm.error_rate',
      {
        producer: 'apm',
        id: 'apm.error_rate',
        alerts: {
          context: 'observability.apm',
        },
        authorizedConsumers: {},
      },
    ],
  ]);

  beforeEach(() => {
    jest.resetAllMocks();
    alertingAuthMock.getSpaceId.mockImplementation(() => DEFAULT_SPACE);
    alertingAuthMock.getAuthorizationFilter.mockResolvedValue({
      filter: undefined,
      ensureRuleTypeIsAuthorized: jest.fn(),
    });
    alertingAuthMock.getAllAuthorizedRuleTypes.mockResolvedValue({
      hasAllRequested: true,
      authorizedRuleTypes,
    });

    alertingAuthMock.ensureAuthorized.mockImplementation(async ({ ruleTypeId, consumer }) => {
      if (ruleTypeId === 'apm.error_rate' && consumer === 'apm') {
        return Promise.resolve();
      }
      return Promise.reject(new Error(`Unauthorized for ${ruleTypeId} and ${consumer}`));
    });
  });

  test('calls ES client with given params', async () => {
    const alertsClient = new AlertsClient(alertsClientParams);
    const searchAlertsSpy = jest.spyOn(alertsClient as any, 'searchAlerts');
    alertsClient.getAuthorizedAlertsIndices = jest.fn().mockResolvedValue([]);
    esClientMock.search.mockResponseOnce({
      took: 5,
      timed_out: false,
      _shards: {
        total: 1,
        successful: 1,
        failed: 0,
        skipped: 0,
      },
      hits: {
        total: 1,
        max_score: 999,
        hits: [
          {
            // @ts-expect-error incorrect fields
            found: true,
            _type: 'alert',
            _index: '.alerts-observability.apm.alerts',
            _id: 'NoxgpHkBqbdrfX07MqXV',
            _version: 1,
            _seq_no: 362,
            _primary_term: 2,
            _source: {
              [ALERT_RULE_TYPE_ID]: 'apm.error_rate',
              message: 'hello world 1',
              [ALERT_RULE_CONSUMER]: 'apm',
              [ALERT_WORKFLOW_STATUS]: 'open',
              [SPACE_IDS]: ['test_default_space_id'],
            },
          },
        ],
      },
    });
    const query = { match: { [ALERT_WORKFLOW_STATUS]: 'open' } };
    const index = '.alerts-observability.apm.alerts';
    const ruleTypeIds = ['siem.esqlRule', 'siem.eqlRule'];
    const result = await alertsClient.find({
      query,
      index,
      ruleTypeIds,
    });
    expect(searchAlertsSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        query,
        index,
        ruleTypeIds,
      })
    );
    expect(result).toMatchInlineSnapshot(`
      Object {
        "_shards": Object {
          "failed": 0,
          "skipped": 0,
          "successful": 1,
          "total": 1,
        },
        "hits": Object {
          "hits": Array [
            Object {
              "_id": "NoxgpHkBqbdrfX07MqXV",
              "_index": ".alerts-observability.apm.alerts",
              "_primary_term": 2,
              "_seq_no": 362,
              "_source": Object {
                "kibana.alert.rule.consumer": "apm",
                "kibana.alert.rule.rule_type_id": "apm.error_rate",
                "kibana.alert.workflow_status": "open",
                "kibana.space_ids": Array [
                  "test_default_space_id",
                ],
                "message": "hello world 1",
              },
              "_type": "alert",
              "_version": 1,
              "found": true,
            },
          ],
          "max_score": 999,
          "total": 1,
        },
        "timed_out": false,
        "took": 5,
      }
    `);
    expect(esClientMock.search).toHaveBeenCalledTimes(1);
    expect(esClientMock.search.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
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
                    "term": Object {
                      "kibana.space_ids": "test_default_space_id",
                    },
                  },
                ],
                "must": Array [
                  Object {
                    "match": Object {
                      "kibana.alert.workflow_status": "open",
                    },
                  },
                ],
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
          "index": ".alerts-observability.apm.alerts",
          "seq_no_primary_term": true,
        },
      ]
    `);
  });

  test('allows custom sort', async () => {
    const alertsClient = new AlertsClient(alertsClientParams);
    esClientMock.search.mockResponseOnce({
      took: 5,
      timed_out: false,
      _shards: {
        total: 1,
        successful: 1,
        failed: 0,
        skipped: 0,
      },
      hits: {
        total: 1,
        max_score: 999,
        hits: [
          {
            // @ts-expect-error incorrect fields
            found: true,
            _type: 'alert',
            _index: '.alerts-observability.apm.alerts',
            _id: 'NoxgpHkBqbdrfX07MqXV',
            _version: 1,
            _seq_no: 362,
            _primary_term: 2,
            _source: {
              [ALERT_RULE_TYPE_ID]: 'apm.error_rate',
              message: 'hello world 1',
              [ALERT_RULE_CONSUMER]: 'apm',
              [ALERT_WORKFLOW_STATUS]: 'open',
              [SPACE_IDS]: ['test_default_space_id'],
            },
          },
        ],
      },
    });
    const result = await alertsClient.find({
      query: { match: { [ALERT_WORKFLOW_STATUS]: 'open' } },
      index: '.alerts-observability.apm.alerts',
      sort: [
        {
          '@timestamp': 'desc',
        },
      ],
    });
    expect(result).toMatchInlineSnapshot(`
      Object {
        "_shards": Object {
          "failed": 0,
          "skipped": 0,
          "successful": 1,
          "total": 1,
        },
        "hits": Object {
          "hits": Array [
            Object {
              "_id": "NoxgpHkBqbdrfX07MqXV",
              "_index": ".alerts-observability.apm.alerts",
              "_primary_term": 2,
              "_seq_no": 362,
              "_source": Object {
                "kibana.alert.rule.consumer": "apm",
                "kibana.alert.rule.rule_type_id": "apm.error_rate",
                "kibana.alert.workflow_status": "open",
                "kibana.space_ids": Array [
                  "test_default_space_id",
                ],
                "message": "hello world 1",
              },
              "_type": "alert",
              "_version": 1,
              "found": true,
            },
          ],
          "max_score": 999,
          "total": 1,
        },
        "timed_out": false,
        "took": 5,
      }
    `);
    expect(esClientMock.search).toHaveBeenCalledTimes(1);
    expect(esClientMock.search.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
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
                    "term": Object {
                      "kibana.space_ids": "test_default_space_id",
                    },
                  },
                ],
                "must": Array [
                  Object {
                    "match": Object {
                      "kibana.alert.workflow_status": "open",
                    },
                  },
                ],
                "must_not": Array [],
                "should": Array [],
              },
            },
            "runtime_mappings": undefined,
            "size": undefined,
            "sort": Array [
              Object {
                "@timestamp": "desc",
              },
            ],
            "track_total_hits": undefined,
          },
          "ignore_unavailable": true,
          "index": ".alerts-observability.apm.alerts",
          "seq_no_primary_term": true,
        },
      ]
    `);
  });

  test('logs successful event in audit logger', async () => {
    const alertsClient = new AlertsClient(alertsClientParams);
    esClientMock.search.mockResponseOnce({
      took: 5,
      timed_out: false,
      _shards: {
        total: 1,
        successful: 1,
        failed: 0,
        skipped: 0,
      },
      hits: {
        total: 1,
        max_score: 999,
        hits: [
          {
            // @ts-expect-error incorrect fields
            found: true,
            _type: 'alert',
            _index: '.alerts-observability.apm.alerts',
            _id: 'NoxgpHkBqbdrfX07MqXV',
            _version: 1,
            _seq_no: 362,
            _primary_term: 2,
            _source: {
              [ALERT_RULE_TYPE_ID]: 'apm.error_rate',
              message: 'hello world 1',
              [ALERT_RULE_CONSUMER]: 'apm',
              [ALERT_WORKFLOW_STATUS]: 'open',
              [SPACE_IDS]: ['test_default_space_id'],
            },
          },
        ],
      },
    });
    await alertsClient.find({
      query: { match: { [ALERT_WORKFLOW_STATUS]: 'open' } },
      index: '.alerts-observability.apm.alerts',
    });

    expect(auditLogger.log).toHaveBeenCalledWith({
      error: undefined,
      event: { action: 'alert_find', category: ['database'], outcome: 'success', type: ['access'] },
      message: 'User has accessed alert [id=NoxgpHkBqbdrfX07MqXV]',
    });
  });

  test('audit error access if user is unauthorized for given alert', async () => {
    const indexName = '.alerts-observability.apm.alerts';
    const fakeAlertId = 'myfakeid1';
    // fakeRuleTypeId will cause authz to fail
    const fakeRuleTypeId = 'fake.rule';
    const alertsClient = new AlertsClient(alertsClientParams);
    esClientMock.search.mockResponseOnce({
      took: 5,
      timed_out: false,
      _shards: {
        total: 1,
        successful: 1,
        failed: 0,
        skipped: 0,
      },
      hits: {
        total: 1,
        max_score: 999,
        hits: [
          {
            // @ts-expect-error incorrect fields
            found: true,
            _type: 'alert',
            _version: 1,
            _seq_no: 362,
            _primary_term: 2,
            _id: fakeAlertId,
            _index: indexName,
            _source: {
              [ALERT_RULE_TYPE_ID]: fakeRuleTypeId,
              [ALERT_RULE_CONSUMER]: 'apm',
              [ALERT_WORKFLOW_STATUS]: 'open',
              [SPACE_IDS]: [DEFAULT_SPACE],
            },
          },
        ],
      },
    });

    await expect(
      alertsClient.find({
        query: { match: { [ALERT_WORKFLOW_STATUS]: 'open' } },
        index: '.alerts-observability.apm.alerts',
      })
    ).rejects.toThrowErrorMatchingInlineSnapshot(`
      "Unable to retrieve alert details for alert with id of \\"undefined\\" or with query \\"{\\"match\\":{\\"kibana.alert.workflow_status\\":\\"open\\"}}\\" and operation find 
      Error: Error: Unauthorized for fake.rule and apm"
    `);

    expect(auditLogger.log).toHaveBeenNthCalledWith(1, {
      message: `Failed attempt to access alert [id=${fakeAlertId}]`,
      event: {
        action: 'alert_find',
        category: ['database'],
        outcome: 'failure',
        type: ['access'],
      },
      error: {
        code: 'Error',
        message: 'Unauthorized for fake.rule and apm',
      },
    });
  });

  test(`throws an error if ES client get fails`, async () => {
    const error = new Error('something went wrong');
    const alertsClient = new AlertsClient(alertsClientParams);
    esClientMock.search.mockRejectedValue(error);

    await expect(
      alertsClient.find({
        query: { match: { [ALERT_WORKFLOW_STATUS]: 'open' } },
        index: '.alerts-observability.apm.alerts',
      })
    ).rejects.toThrowErrorMatchingInlineSnapshot(`
      "Unable to retrieve alert details for alert with id of \\"undefined\\" or with query \\"{\\"match\\":{\\"kibana.alert.workflow_status\\":\\"open\\"}}\\" and operation find 
      Error: Error: something went wrong"
    `);
  });

  describe('authorization', () => {
    beforeEach(() => {
      esClientMock.search.mockResponseOnce({
        took: 5,
        timed_out: false,
        _shards: {
          total: 1,
          successful: 1,
          failed: 0,
          skipped: 0,
        },
        hits: {
          total: 1,
          max_score: 999,
          hits: [
            {
              // @ts-expect-error incorrect fields
              found: true,
              _type: 'alert',
              _index: '.alerts-observability.apm.alerts',
              _id: 'NoxgpHkBqbdrfX07MqXV',
              _version: 1,
              _seq_no: 362,
              _primary_term: 2,
              _source: {
                [ALERT_RULE_TYPE_ID]: 'apm.error_rate',
                message: 'hello world 1',
                [ALERT_RULE_CONSUMER]: 'apm',
                [ALERT_WORKFLOW_STATUS]: 'open',
                [SPACE_IDS]: ['test_default_space_id'],
              },
            },
          ],
        },
      });
    });

    test('returns alert if user is authorized to read alert under the consumer', async () => {
      const alertsClient = new AlertsClient(alertsClientParams);
      const result = await alertsClient.find({
        query: { match: { [ALERT_WORKFLOW_STATUS]: 'open' } },
        index: '.alerts-observability.apm.alerts',
      });

      expect(result).toMatchInlineSnapshot(`
        Object {
          "_shards": Object {
            "failed": 0,
            "skipped": 0,
            "successful": 1,
            "total": 1,
          },
          "hits": Object {
            "hits": Array [
              Object {
                "_id": "NoxgpHkBqbdrfX07MqXV",
                "_index": ".alerts-observability.apm.alerts",
                "_primary_term": 2,
                "_seq_no": 362,
                "_source": Object {
                  "kibana.alert.rule.consumer": "apm",
                  "kibana.alert.rule.rule_type_id": "apm.error_rate",
                  "kibana.alert.workflow_status": "open",
                  "kibana.space_ids": Array [
                    "test_default_space_id",
                  ],
                  "message": "hello world 1",
                },
                "_type": "alert",
                "_version": 1,
                "found": true,
              },
            ],
            "max_score": 999,
            "total": 1,
          },
          "timed_out": false,
          "took": 5,
        }
      `);
    });
  });
});
