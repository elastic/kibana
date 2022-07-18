/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ALERT_RULE_CONSUMER,
  ALERT_STATUS,
  ALERT_STATUS_ACTIVE,
  SPACE_IDS,
  ALERT_RULE_TYPE_ID,
} from '@kbn/rule-data-utils';
import { AlertsClient, ConstructorOptions } from '../alerts_client';
import { loggingSystemMock } from '@kbn/core/server/mocks';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { elasticsearchClientMock } from '@kbn/core/server/elasticsearch/client/mocks';
import { alertingAuthorizationMock } from '@kbn/alerting-plugin/server/authorization/alerting_authorization.mock';
import { auditLoggerMock } from '@kbn/security-plugin/server/audit/mocks';
import { AlertingAuthorizationEntity } from '@kbn/alerting-plugin/server';
import { ruleDataServiceMock } from '../../rule_data_plugin_service/rule_data_plugin_service.mock';

const alertingAuthMock = alertingAuthorizationMock.create();
const esClientMock = elasticsearchClientMock.createElasticsearchClient();
const auditLogger = auditLoggerMock.create();

const alertsClientParams: jest.Mocked<ConstructorOptions> = {
  logger: loggingSystemMock.create().get(),
  authorization: alertingAuthMock,
  esClient: esClientMock,
  auditLogger,
  ruleDataService: ruleDataServiceMock.create(),
};

const DEFAULT_SPACE = 'test_default_space_id';

beforeEach(() => {
  jest.resetAllMocks();
  alertingAuthMock.getSpaceId.mockImplementation(() => DEFAULT_SPACE);
  // @ts-expect-error
  alertingAuthMock.getAuthorizationFilter.mockImplementation(async () =>
    Promise.resolve({ filter: [] })
  );

  // @ts-expect-error
  alertingAuthMock.getAugmentedRuleTypesWithAuthorization.mockImplementation(async () => {
    const authorizedRuleTypes = new Set();
    authorizedRuleTypes.add({ producer: 'apm' });
    return Promise.resolve({ authorizedRuleTypes });
  });

  alertingAuthMock.ensureAuthorized.mockImplementation(
    // @ts-expect-error
    async ({
      ruleTypeId,
      consumer,
      operation,
      entity,
    }: {
      ruleTypeId: string;
      consumer: string;
      operation: string;
      entity: typeof AlertingAuthorizationEntity.Alert;
    }) => {
      if (ruleTypeId === 'apm.error_rate' && consumer === 'apm') {
        return Promise.resolve();
      }
      return Promise.reject(new Error(`Unauthorized for ${ruleTypeId} and ${consumer}`));
    }
  );
});

describe('get()', () => {
  test('calls ES client with given params', async () => {
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
              [ALERT_STATUS]: ALERT_STATUS_ACTIVE,
              [SPACE_IDS]: ['test_default_space_id'],
            },
          },
        ],
      },
    });
    const result = await alertsClient.get({ id: '1', index: '.alerts-observability.apm.alerts' });
    expect(result).toMatchInlineSnapshot(`
      Object {
        "kibana.alert.rule.consumer": "apm",
        "kibana.alert.rule.rule_type_id": "apm.error_rate",
        "kibana.alert.status": "active",
        "kibana.space_ids": Array [
          "test_default_space_id",
        ],
        "message": "hello world 1",
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
              [ALERT_STATUS]: ALERT_STATUS_ACTIVE,
              [SPACE_IDS]: ['test_default_space_id'],
            },
          },
        ],
      },
    });
    await alertsClient.get({
      id: 'NoxgpHkBqbdrfX07MqXV',
      index: '.alerts-observability.apm.alerts',
    });

    expect(auditLogger.log).toHaveBeenCalledWith({
      error: undefined,
      event: { action: 'alert_get', category: ['database'], outcome: 'success', type: ['access'] },
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
              [ALERT_STATUS]: ALERT_STATUS_ACTIVE,
              [SPACE_IDS]: [DEFAULT_SPACE],
            },
          },
        ],
      },
    });

    await expect(alertsClient.get({ id: fakeAlertId, index: '.alerts-observability.apm.alerts' }))
      .rejects.toThrowErrorMatchingInlineSnapshot(`
            "Unable to retrieve alert details for alert with id of \\"myfakeid1\\" or with query \\"undefined\\" and operation get 
            Error: Error: Unauthorized for fake.rule and apm"
          `);

    expect(auditLogger.log).toHaveBeenNthCalledWith(1, {
      message: `Failed attempt to access alert [id=${fakeAlertId}]`,
      event: {
        action: 'alert_get',
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
      alertsClient.get({ id: 'NoxgpHkBqbdrfX07MqXV', index: '.alerts-observability.apm.alerts' })
    ).rejects.toThrowErrorMatchingInlineSnapshot(`
            "Unable to retrieve alert details for alert with id of \\"NoxgpHkBqbdrfX07MqXV\\" or with query \\"undefined\\" and operation get 
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
                [ALERT_STATUS]: ALERT_STATUS_ACTIVE,
                [SPACE_IDS]: ['test_default_space_id'],
              },
            },
          ],
        },
      });
    });

    test('returns alert if user is authorized to read alert under the consumer', async () => {
      const alertsClient = new AlertsClient(alertsClientParams);
      const result = await alertsClient.get({
        id: 'NoxgpHkBqbdrfX07MqXV',
        index: '.alerts-observability.apm.alerts',
      });

      expect(result).toMatchInlineSnapshot(`
        Object {
          "kibana.alert.rule.consumer": "apm",
          "kibana.alert.rule.rule_type_id": "apm.error_rate",
          "kibana.alert.status": "active",
          "kibana.space_ids": Array [
            "test_default_space_id",
          ],
          "message": "hello world 1",
        }
      `);
    });
  });
});
