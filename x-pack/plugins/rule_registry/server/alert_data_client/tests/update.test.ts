/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ALERT_RULE_CONSUMER,
  ALERT_WORKFLOW_STATUS,
  SPACE_IDS,
  ALERT_RULE_TYPE_ID,
} from '@kbn/rule-data-utils';
import { AlertsClient, ConstructorOptions } from '../alerts_client';
import { loggingSystemMock } from '../../../../../../src/core/server/mocks';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { elasticsearchClientMock } from 'src/core/server/elasticsearch/client/mocks';
import { alertingAuthorizationMock } from '../../../../alerting/server/authorization/alerting_authorization.mock';
import { auditLoggerMock } from '../../../../security/server/audit/mocks';
import { AlertingAuthorizationEntity } from '../../../../alerting/server';
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

describe('update()', () => {
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
            _source: {
              [ALERT_RULE_TYPE_ID]: 'apm.error_rate',
              message: 'hello world 1',
              [ALERT_WORKFLOW_STATUS]: 'open',
              [ALERT_RULE_CONSUMER]: 'apm',
              [SPACE_IDS]: [DEFAULT_SPACE],
            },
          },
        ],
      },
    });
    esClientMock.update.mockResponseOnce({
      _index: '.alerts-observability.apm.alerts',
      _id: 'NoxgpHkBqbdrfX07MqXV',
      _version: 2,
      result: 'updated',
      _shards: { total: 2, successful: 1, failed: 0 },
      _seq_no: 1,
      _primary_term: 1,
    });
    const result = await alertsClient.update({
      id: '1',
      status: 'closed',
      _version: undefined,
      index: '.alerts-observability.apm.alerts',
    });
    expect(result).toMatchInlineSnapshot(`
      Object {
        "_id": "NoxgpHkBqbdrfX07MqXV",
        "_index": ".alerts-observability.apm.alerts",
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
              "${ALERT_WORKFLOW_STATUS}": "closed",
            },
          },
          "id": "1",
          "index": ".alerts-observability.apm.alerts",
          "refresh": "wait_for",
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
            _source: {
              [ALERT_RULE_TYPE_ID]: 'apm.error_rate',
              message: 'hello world 1',
              [ALERT_WORKFLOW_STATUS]: 'open',
              [ALERT_RULE_CONSUMER]: 'apm',
              [SPACE_IDS]: [DEFAULT_SPACE],
            },
          },
        ],
      },
    });
    esClientMock.update.mockResponseOnce({
      _index: '.alerts-observability.apm.alerts',
      _id: 'NoxgpHkBqbdrfX07MqXV',
      _version: 2,
      result: 'updated',
      _shards: { total: 2, successful: 1, failed: 0 },
      _seq_no: 1,
      _primary_term: 1,
    });
    await alertsClient.update({
      id: 'NoxgpHkBqbdrfX07MqXV',
      status: 'closed',
      _version: undefined,
      index: '.alerts-observability.apm.alerts',
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

  test('audit error update if user is unauthorized for given alert', async () => {
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
      alertsClient.update({
        id: fakeAlertId,
        status: 'closed',
        _version: '1',
        index: '.alerts-observability.apm.alerts',
      })
    ).rejects.toThrowErrorMatchingInlineSnapshot(`
            "Unable to retrieve alert details for alert with id of \\"myfakeid1\\" or with query \\"undefined\\" and operation update 
            Error: Error: Unauthorized for fake.rule and apm"
          `);

    expect(auditLogger.log).toHaveBeenNthCalledWith(1, {
      message: `Failed attempt to update alert [id=${fakeAlertId}]`,
      event: {
        action: 'alert_update',
        category: ['database'],
        outcome: 'failure',
        type: ['change'],
      },
      error: {
        code: 'Error',
        message: 'Unauthorized for fake.rule and apm',
      },
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
        index: '.alerts-observability.apm.alerts',
      })
    ).rejects.toThrowErrorMatchingInlineSnapshot(`
            "Unable to retrieve alert details for alert with id of \\"NoxgpHkBqbdrfX07MqXV\\" or with query \\"undefined\\" and operation update 
            Error: Error: something went wrong on update"
          `);
  });

  test(`throws an error if ES client update fails`, async () => {
    const error = new Error('something went wrong on update');
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
            _source: {
              [ALERT_RULE_TYPE_ID]: 'apm.error_rate',
              message: 'hello world 1',
              [ALERT_WORKFLOW_STATUS]: 'open',
              [ALERT_RULE_CONSUMER]: 'apm',
              [SPACE_IDS]: [DEFAULT_SPACE],
            },
          },
        ],
      },
    });
    esClientMock.update.mockRejectedValue(error);

    await expect(
      alertsClient.update({
        id: 'NoxgpHkBqbdrfX07MqXV',
        status: 'closed',
        _version: undefined,
        index: '.alerts-observability.apm.alerts',
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
              _version: 2,
              _seq_no: 362,
              _primary_term: 2,
              _source: {
                [ALERT_RULE_TYPE_ID]: 'apm.error_rate',
                message: 'hello world 1',
                [ALERT_RULE_CONSUMER]: 'apm',
                [ALERT_WORKFLOW_STATUS]: 'open',
                [SPACE_IDS]: [DEFAULT_SPACE],
              },
            },
          ],
        },
      });

      esClientMock.update.mockResponseOnce({
        _index: '.alerts-observability.apm.alerts',
        _id: 'NoxgpHkBqbdrfX07MqXV',
        _version: 2,
        result: 'updated',
        _shards: { total: 2, successful: 1, failed: 0 },
        _seq_no: 1,
        _primary_term: 1,
      });
    });

    test('returns alert if user is authorized to update alert under the consumer', async () => {
      const alertsClient = new AlertsClient(alertsClientParams);
      const result = await alertsClient.update({
        id: 'NoxgpHkBqbdrfX07MqXV',
        status: 'closed',
        _version: undefined,
        index: '.alerts-observability.apm.alerts',
      });

      expect(result).toMatchInlineSnapshot(`
        Object {
          "_id": "NoxgpHkBqbdrfX07MqXV",
          "_index": ".alerts-observability.apm.alerts",
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
