/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALERT_OWNER, ALERT_STATUS, SPACE_IDS } from '@kbn/rule-data-utils';
import { AlertsClient, ConstructorOptions } from '../alerts_client';
import { loggingSystemMock } from '../../../../../../src/core/server/mocks';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { elasticsearchClientMock } from 'src/core/server/elasticsearch/client/mocks';
import { alertingAuthorizationMock } from '../../../../alerting/server/authorization/alerting_authorization.mock';
import { AuditLogger } from '../../../../security/server';

const alertingAuthMock = alertingAuthorizationMock.create();
const esClientMock = elasticsearchClientMock.createElasticsearchClient();
const auditLogger = {
  log: jest.fn(),
} as jest.Mocked<AuditLogger>;

const alertsClientParams: jest.Mocked<ConstructorOptions> = {
  logger: loggingSystemMock.create().get(),
  authorization: alertingAuthMock,
  esClient: esClientMock,
  auditLogger,
};

beforeEach(() => {
  jest.resetAllMocks();
  alertingAuthMock.getSpaceId.mockImplementation(() => 'test_default_space_id');
  // @ts-expect-error
  alertingAuthMock.getAuthorizationFilter.mockImplementation(async () =>
    Promise.resolve({ filter: [] })
  );
});

describe('get()', () => {
  test('calls ES client with given params', async () => {
    const alertsClient = new AlertsClient(alertsClientParams);
    esClientMock.search.mockResolvedValueOnce(
      elasticsearchClientMock.createApiResponse({
        body: {
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
                found: true,
                _type: 'alert',
                _index: '.alerts-observability-apm',
                _id: 'NoxgpHkBqbdrfX07MqXV',
                _version: 1,
                _seq_no: 362,
                _primary_term: 2,
                _source: {
                  'rule.id': 'apm.error_rate',
                  message: 'hello world 1',
                  [ALERT_OWNER]: 'apm',
                  [ALERT_STATUS]: 'open',
                  [SPACE_IDS]: ['test_default_space_id'],
                },
              },
            ],
          },
        },
      })
    );
    const result = await alertsClient.get({ id: '1', index: '.alerts-observability-apm' });
    expect(result).toMatchInlineSnapshot(`
      Object {
        "kibana.alert.owner": "apm",
        "kibana.alert.status": "open",
        "kibana.space_ids": Array [
          "test_default_space_id",
        ],
        "message": "hello world 1",
        "rule.id": "apm.error_rate",
      }
    `);
    expect(esClientMock.search).toHaveBeenCalledTimes(1);
    expect(esClientMock.search.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        Object {
          "body": Object {
            "query": Object {
              "bool": Object {
                "filter": Array [
                  Object {
                    "bool": Object {
                      "minimum_should_match": 1,
                      "should": Array [
                        Object {
                          "match": Object {
                            "_id": "1",
                          },
                        },
                      ],
                    },
                  },
                  Object {},
                  Object {
                    "term": Object {
                      "kibana.space_ids": "test_default_space_id",
                    },
                  },
                ],
                "must": Array [],
                "must_not": Array [],
                "should": Array [],
              },
            },
            "sort": Array [
              Object {
                "@timestamp": Object {
                  "order": "asc",
                  "unmapped_type": "date",
                },
              },
            ],
          },
          "ignore_unavailable": true,
          "index": ".alerts-observability-apm",
          "seq_no_primary_term": true,
        },
      ]
    `);
  });

  test('logs successful event in audit logger', async () => {
    const alertsClient = new AlertsClient(alertsClientParams);
    esClientMock.search.mockResolvedValueOnce(
      elasticsearchClientMock.createApiResponse({
        body: {
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
                found: true,
                _type: 'alert',
                _index: '.alerts-observability-apm',
                _id: 'NoxgpHkBqbdrfX07MqXV',
                _version: 1,
                _seq_no: 362,
                _primary_term: 2,
                _source: {
                  'rule.id': 'apm.error_rate',
                  message: 'hello world 1',
                  [ALERT_OWNER]: 'apm',
                  [ALERT_STATUS]: 'open',
                  [SPACE_IDS]: ['test_default_space_id'],
                },
              },
            ],
          },
        },
      })
    );
    await alertsClient.get({ id: 'NoxgpHkBqbdrfX07MqXV', index: '.alerts-observability-apm' });

    expect(auditLogger.log).toHaveBeenCalledWith({
      error: undefined,
      event: { action: 'alert_get', category: ['database'], outcome: 'unknown', type: ['access'] },
      message: 'User is accessing alert [id=NoxgpHkBqbdrfX07MqXV]',
    });
  });

  test(`throws an error if ES client get fails`, async () => {
    const error = new Error('something went wrong');
    const alertsClient = new AlertsClient(alertsClientParams);
    esClientMock.search.mockRejectedValue(error);

    await expect(
      alertsClient.get({ id: 'NoxgpHkBqbdrfX07MqXV', index: '.alerts-observability-apm' })
    ).rejects.toThrowErrorMatchingInlineSnapshot(`
            "Unable to retrieve alert details for alert with id of \\"NoxgpHkBqbdrfX07MqXV\\" or with query \\"null\\" and operation get 
            Error: Error: something went wrong"
          `);
  });

  describe('authorization', () => {
    beforeEach(() => {
      esClientMock.search.mockResolvedValueOnce(
        elasticsearchClientMock.createApiResponse({
          body: {
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
                  found: true,
                  _type: 'alert',
                  _index: '.alerts-observability-apm',
                  _id: 'NoxgpHkBqbdrfX07MqXV',
                  _version: 1,
                  _seq_no: 362,
                  _primary_term: 2,
                  _source: {
                    'rule.id': 'apm.error_rate',
                    message: 'hello world 1',
                    [ALERT_OWNER]: 'apm',
                    [ALERT_STATUS]: 'open',
                    [SPACE_IDS]: ['test_default_space_id'],
                  },
                },
              ],
            },
          },
        })
      );
    });

    test('returns alert if user is authorized to read alert under the consumer', async () => {
      const alertsClient = new AlertsClient(alertsClientParams);
      const result = await alertsClient.get({
        id: 'NoxgpHkBqbdrfX07MqXV',
        index: '.alerts-observability-apm',
      });

      expect(result).toMatchInlineSnapshot(`
        Object {
          "kibana.alert.owner": "apm",
          "kibana.alert.status": "open",
          "kibana.space_ids": Array [
            "test_default_space_id",
          ],
          "message": "hello world 1",
          "rule.id": "apm.error_rate",
        }
      `);
    });
  });
});
