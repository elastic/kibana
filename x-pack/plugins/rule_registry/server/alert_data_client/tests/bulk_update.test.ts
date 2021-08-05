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
  alertingAuthMock.getSpaceId.mockImplementation(() => 'test_default_space_id');
  // @ts-expect-error
  alertingAuthMock.getAuthorizationFilter.mockImplementation(async () =>
    Promise.resolve({ filter: [] })
  );
});

describe('bulkUpdate()', () => {
  describe('ids', () => {
    test('logs successful event in audit logger', async () => {
      const fakeAlertId = 'myfakeid1';
      const indexName = '.alerts-observability-apm.alerts';
      const alertsClient = new AlertsClient(alertsClientParams);
      esClientMock.mget.mockResolvedValueOnce(
        elasticsearchClientMock.createApiResponse({
          body: {
            docs: [
              {
                _id: fakeAlertId,
                _index: indexName,
                _source: {
                  [RULE_ID]: 'apm.error_rate',
                  [ALERT_OWNER]: 'apm',
                  [ALERT_STATUS]: 'open',
                  [SPACE_IDS]: [DEFAULT_SPACE],
                },
              },
            ],
          },
        })
      );
      esClientMock.bulk.mockResolvedValueOnce(
        elasticsearchClientMock.createApiResponse({
          body: {
            errors: false,
            took: 1,
            items: [
              {
                update: {
                  _id: fakeAlertId,
                  _index: '.alerts-observability-apm.alerts',
                  result: 'updated',
                  status: 200,
                },
              },
            ],
          },
        })
      );
      await alertsClient.bulkUpdate({
        ids: [fakeAlertId],
        query: undefined,
        index: indexName,
        status: 'closed',
      });
      expect(auditLogger.log).toHaveBeenLastCalledWith({
        message: `User is updating alert [id=${fakeAlertId}]`,
        event: {
          action: 'alert_update',
          category: ['database'],
          outcome: 'unknown',
          type: ['change'],
        },
        error: undefined,
      });
    });

    test('audit error access if user is unauthorized for given alert', async () => {
      const fakeAlertId = 'myfakeid1';
      const indexName = '.alerts-observability-apm.alerts';
      const alertsClient = new AlertsClient(alertsClientParams);
      esClientMock.mget.mockResolvedValueOnce(
        elasticsearchClientMock.createApiResponse({
          body: {
            docs: [
              {
                _id: fakeAlertId,
                _index: indexName,
                _source: {
                  [RULE_ID]: 'apm.error_rate',
                  [ALERT_OWNER]: 'apm',
                  [ALERT_STATUS]: 'open',
                  [SPACE_IDS]: [DEFAULT_SPACE],
                },
              },
            ],
          },
        })
      );
      alertingAuthMock.ensureAuthorized.mockRejectedValueOnce(
        new Error('bulk update by ids test error')
      );
      await expect(
        alertsClient.bulkUpdate({
          ids: [fakeAlertId],
          query: undefined,
          index: indexName,
          status: 'closed',
        })
      ).rejects.toThrowErrorMatchingInlineSnapshot(`"bulk update by ids test error"`);

      expect(auditLogger.log).toHaveBeenLastCalledWith({
        message: `Failed attempt to update alert [id=${fakeAlertId}]`,
        event: {
          action: 'alert_update',
          category: ['database'],
          outcome: 'failure',
          type: ['change'],
        },
        error: {
          code: 'Error',
          message: 'bulk update by ids test error',
        },
      });
    });
    // test('throws an error if ES client fetch fails', async () => {});
    // test('throws an error if ES client bulk update fails', async () => {});
    // test('throws an error if ES client updateByQuery fails', async () => {});
  });
  describe('query', () => {
    test('logs successful event in audit logger', async () => {
      const fakeAlertId = 'myfakeid1';
      const indexName = '.alerts-observability-apm.alerts';
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
                  _id: fakeAlertId,
                  _index: '.alerts-observability-apm.alerts',
                  _source: {
                    [RULE_ID]: 'apm.error_rate',
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

      esClientMock.updateByQuery.mockResolvedValueOnce(
        elasticsearchClientMock.createApiResponse({
          body: {
            updated: 1,
          },
        })
      );

      await alertsClient.bulkUpdate({
        ids: undefined,
        query: `${ALERT_STATUS}: open`,
        index: indexName,
        status: 'closed',
      });
      expect(auditLogger.log).toHaveBeenCalledWith({
        message: `User is updating alert [id=${fakeAlertId}]`,
        event: {
          action: 'alert_update',
          category: ['database'],
          outcome: 'unknown',
          type: ['change'],
        },
        error: undefined,
      });
    });

    test('audit error access if user is unauthorized for given alert', async () => {
      const fakeAlertId = 'myfakeid1';
      const indexName = '.alerts-observability-apm.alerts';
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
                  _id: fakeAlertId,
                  _index: '.alerts-observability-apm.alerts',
                  _source: {
                    [RULE_ID]: 'apm.error_rate',
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
      alertingAuthMock.ensureAuthorized.mockRejectedValueOnce(
        new Error('bulk update by query test error')
      );
      await expect(
        alertsClient.bulkUpdate({
          ids: undefined,
          query: `${ALERT_STATUS}: open`,
          index: indexName,
          status: 'closed',
        })
      ).rejects.toThrowErrorMatchingInlineSnapshot(`
              "queryAndAuditAllAlerts threw an error: Unable to retrieve alerts with query \\"kibana.alert.status: open\\" and operation update 
               Error: Unable to retrieve alert details for alert with id of \\"null\\" or with query \\"kibana.alert.status: open\\" and operation update 
              Error: Error: bulk update by query test error"
            `);

      expect(auditLogger.log).toHaveBeenLastCalledWith({
        message: `Failed attempt to update alert [id=${fakeAlertId}]`,
        event: {
          action: 'alert_update',
          category: ['database'],
          outcome: 'failure',
          type: ['change'],
        },
        error: {
          code: 'Error',
          message: 'bulk update by query test error',
        },
      });
    });
    // test('throws an error if ES client fetch fails', async () => {});
    // test('throws an error if ES client bulk update fails', async () => {});
    // test('throws an error if ES client updateByQuery fails', async () => {});
  });
});
