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
        "_version": "WzM2MiwyXQ==",
        "${ALERT_OWNER}": "apm",
        "${ALERT_STATUS}": "open",
        "${SPACE_IDS}": Array [
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
                    "term": Object {
                      "_id": "1",
                    },
                  },
                  Object {
                    "term": Object {
                      "kibana.space_ids": "test_default_space_id",
                    },
                  },
                ],
              },
            },
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
    await alertsClient.get({ id: '1', index: '.alerts-observability-apm' });

    expect(auditLogger.log).toHaveBeenCalledWith({
      error: undefined,
      event: { action: 'alert_get', category: ['database'], outcome: 'success', type: ['access'] },
      message: 'User has accessed alert [id=1]',
    });
  });

  test(`throws an error if ES client get fails`, async () => {
    const error = new Error('something went wrong');
    const alertsClient = new AlertsClient(alertsClientParams);
    esClientMock.search.mockRejectedValue(error);

    await expect(
      alertsClient.get({ id: '1', index: '.alerts-observability-apm' })
    ).rejects.toThrowErrorMatchingInlineSnapshot(`"something went wrong"`);
    expect(auditLogger.log).toHaveBeenCalledWith({
      error: { code: 'Error', message: 'something went wrong' },
      event: { action: 'alert_get', category: ['database'], outcome: 'failure', type: ['access'] },
      message: 'Failed attempt to access alert [id=1]',
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
      const result = await alertsClient.get({ id: '1', index: '.alerts-observability-apm' });

      expect(alertingAuthMock.ensureAuthorized).toHaveBeenCalledWith({
        entity: 'alert',
        consumer: 'apm',
        operation: 'get',
        ruleTypeId: 'apm.error_rate',
      });
      expect(result).toMatchInlineSnapshot(`
        Object {
          "_version": "WzM2MiwyXQ==",
          "${ALERT_OWNER}": "apm",
          "${ALERT_STATUS}": "open",
          "${SPACE_IDS}": Array [
            "test_default_space_id",
          ],
          "message": "hello world 1",
          "rule.id": "apm.error_rate",
        }
      `);
    });

    test('throws when user is not authorized to get this type of alert', async () => {
      const alertsClient = new AlertsClient(alertsClientParams);
      alertingAuthMock.ensureAuthorized.mockRejectedValue(
        new Error(`Unauthorized to get a "apm.error_rate" alert for "apm"`)
      );

      await expect(
        alertsClient.get({ id: '1', index: '.alerts-observability-apm' })
      ).rejects.toMatchInlineSnapshot(
        `[Error: Unauthorized to get a "apm.error_rate" alert for "apm"]`
      );

      expect(alertingAuthMock.ensureAuthorized).toHaveBeenCalledWith({
        entity: 'alert',
        consumer: 'apm',
        operation: 'get',
        ruleTypeId: 'apm.error_rate',
      });
    });
  });
});
