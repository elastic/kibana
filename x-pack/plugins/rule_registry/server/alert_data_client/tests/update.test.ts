/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALERT_OWNER, ALERT_STATUS, SPACE_IDS, RULE_ID } from '@kbn/rule-data-utils';
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

const DEFAULT_SPACE = 'test_default_space_id';

beforeEach(() => {
  jest.resetAllMocks();
  alertingAuthMock.getSpaceId.mockImplementation(() => DEFAULT_SPACE);
  // @ts-expect-error
  alertingAuthMock.getAuthorizationFilter.mockImplementation(async () =>
    Promise.resolve({ filter: [] })
  );
});

describe('update()', () => {
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
                _source: {
                  [RULE_ID]: 'apm.error_rate',
                  message: 'hello world 1',
                  [ALERT_OWNER]: 'apm',
                  [ALERT_STATUS]: 'open',
                  [SPACE_IDS]: [DEFAULT_SPACE],
                },
              },
            ],
          },
        },
      })
    );
    esClientMock.update.mockResolvedValueOnce(
      elasticsearchClientMock.createApiResponse({
        body: {
          _index: '.alerts-observability-apm',
          _id: 'NoxgpHkBqbdrfX07MqXV',
          _version: 2,
          result: 'updated',
          _shards: { total: 2, successful: 1, failed: 0 },
          _seq_no: 1,
          _primary_term: 1,
        },
      })
    );
    const result = await alertsClient.update({
      id: '1',
      status: 'closed',
      _version: undefined,
      index: '.alerts-observability-apm',
    });
    expect(result).toMatchInlineSnapshot(`
      Object {
        "_id": "NoxgpHkBqbdrfX07MqXV",
        "_index": ".alerts-observability-apm",
        "_primary_term": 1,
        "_seq_no": 1,
        "_shards": Object {
          "failed": 0,
          "successful": 1,
          "total": 2,
        },
        "_version": "WzEsMV0=",
        "result": "updated",
      }
    `);
    expect(esClientMock.update).toHaveBeenCalledTimes(1);
    expect(esClientMock.update.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        Object {
          "body": Object {
            "doc": Object {
              "${ALERT_STATUS}": "closed",
            },
          },
          "id": "1",
          "index": ".alerts-observability-apm",
          "refresh": "wait_for",
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
                _source: {
                  'rule.id': 'apm.error_rate',
                  message: 'hello world 1',
                  [ALERT_OWNER]: 'apm',
                  [ALERT_STATUS]: 'open',
                  [SPACE_IDS]: [DEFAULT_SPACE],
                },
              },
            ],
          },
        },
      })
    );
    esClientMock.update.mockResolvedValueOnce(
      elasticsearchClientMock.createApiResponse({
        body: {
          _index: '.alerts-observability-apm',
          _id: 'NoxgpHkBqbdrfX07MqXV',
          _version: 2,
          result: 'updated',
          _shards: { total: 2, successful: 1, failed: 0 },
          _seq_no: 1,
          _primary_term: 1,
        },
      })
    );
    await alertsClient.update({
      id: 'NoxgpHkBqbdrfX07MqXV',
      status: 'closed',
      _version: undefined,
      index: '.alerts-observability-apm',
    });

    expect(auditLogger.log).toHaveBeenCalledWith({
      error: undefined,
      event: {
        action: 'alert_update',
        category: ['database'],
        outcome: 'unknown',
        type: ['change'],
      },
      message: 'User is updating alert [id=NoxgpHkBqbdrfX07MqXV]',
    });
  });

  test(`throws an error if ES client get fails`, async () => {
    const error = new Error('something went wrong on update');
    const alertsClient = new AlertsClient(alertsClientParams);
    esClientMock.search.mockRejectedValue(error);

    await expect(
      alertsClient.update({
        id: 'NoxgpHkBqbdrfX07MqXV',
        status: 'closed',
        _version: undefined,
        index: '.alerts-observability-apm',
      })
    ).rejects.toThrowErrorMatchingInlineSnapshot(`
            "Unable to retrieve alert details for alert with id of \\"NoxgpHkBqbdrfX07MqXV\\" or with query \\"null\\" and operation update 
            Error: Error: something went wrong on update"
          `);
  });

  test(`throws an error if ES client update fails`, async () => {
    const error = new Error('something went wrong on update');
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
                _source: {
                  'rule.id': 'apm.error_rate',
                  message: 'hello world 1',
                  [ALERT_OWNER]: 'apm',
                  [ALERT_STATUS]: 'open',
                  [SPACE_IDS]: [DEFAULT_SPACE],
                },
              },
            ],
          },
        },
      })
    );
    esClientMock.update.mockRejectedValue(error);

    await expect(
      alertsClient.update({
        id: 'NoxgpHkBqbdrfX07MqXV',
        status: 'closed',
        _version: undefined,
        index: '.alerts-observability-apm',
      })
    ).rejects.toThrowErrorMatchingInlineSnapshot(`"something went wrong on update"`);
    expect(auditLogger.log).toHaveBeenCalledWith({
      error: undefined,
      event: {
        action: 'alert_update',
        category: ['database'],
        outcome: 'unknown',
        type: ['change'],
      },
      message: 'User is updating alert [id=NoxgpHkBqbdrfX07MqXV]',
    });
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
                  _version: 2,
                  _seq_no: 362,
                  _primary_term: 2,
                  _source: {
                    'rule.id': 'apm.error_rate',
                    message: 'hello world 1',
                    [ALERT_OWNER]: 'apm',
                    [ALERT_STATUS]: 'open',
                    [SPACE_IDS]: [DEFAULT_SPACE],
                  },
                },
              ],
            },
          },
        })
      );

      esClientMock.update.mockResolvedValueOnce(
        elasticsearchClientMock.createApiResponse({
          body: {
            _index: '.alerts-observability-apm',
            _id: 'NoxgpHkBqbdrfX07MqXV',
            _version: 2,
            result: 'updated',
            _shards: { total: 2, successful: 1, failed: 0 },
            _seq_no: 1,
            _primary_term: 1,
          },
        })
      );
    });

    test('returns alert if user is authorized to update alert under the consumer', async () => {
      const alertsClient = new AlertsClient(alertsClientParams);
      const result = await alertsClient.update({
        id: 'NoxgpHkBqbdrfX07MqXV',
        status: 'closed',
        _version: undefined,
        index: '.alerts-observability-apm',
      });

      expect(result).toMatchInlineSnapshot(`
        Object {
          "_id": "NoxgpHkBqbdrfX07MqXV",
          "_index": ".alerts-observability-apm",
          "_primary_term": 1,
          "_seq_no": 1,
          "_shards": Object {
            "failed": 0,
            "successful": 1,
            "total": 2,
          },
          "_version": "WzEsMV0=",
          "result": "updated",
        }
      `);
    });
  });
});
