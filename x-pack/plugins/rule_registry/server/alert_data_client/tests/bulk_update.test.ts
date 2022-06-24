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
  alertingAuthMock.getSpaceId.mockImplementation(() => 'test_default_space_id');
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

const fakeAlertId = 'myfakeid1';
const successfulAuthzHit = 'successfulAuthzHit';
const unsuccessfulAuthzHit = 'unsuccessfulAuthzHit';
// fakeRuleTypeId will cause authz to fail
const fakeRuleTypeId = 'fake.rule';

describe('bulkUpdate()', () => {
  describe('ids', () => {
    describe('audit log', () => {
      test('logs successful event in audit logger', async () => {
        const indexName = '.alerts-observability.apm.alerts';
        const alertsClient = new AlertsClient(alertsClientParams);
        esClientMock.mget.mockResponseOnce({
          docs: [
            {
              found: true,
              _id: fakeAlertId,
              _index: indexName,
              _source: {
                [ALERT_RULE_TYPE_ID]: 'apm.error_rate',
                [ALERT_RULE_CONSUMER]: 'apm',
                [ALERT_STATUS]: ALERT_STATUS_ACTIVE,
                [SPACE_IDS]: [DEFAULT_SPACE],
              },
            },
          ],
        });
        esClientMock.bulk.mockResponseOnce({
          errors: false,
          took: 1,
          items: [
            {
              update: {
                _id: fakeAlertId,
                _index: '.alerts-observability.apm.alerts',
                result: 'updated',
                status: 200,
              },
            },
          ],
        });
        await alertsClient.bulkUpdate({
          ids: [fakeAlertId],
          query: undefined,
          index: indexName,
          status: 'closed',
        });
        expect(auditLogger.log).toHaveBeenNthCalledWith(1, {
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
        const indexName = '.alerts-observability.apm.alerts';
        const alertsClient = new AlertsClient(alertsClientParams);
        esClientMock.mget.mockResponseOnce({
          docs: [
            {
              found: true,
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
        });

        await expect(
          alertsClient.bulkUpdate({
            ids: [fakeAlertId],
            query: undefined,
            index: indexName,
            status: 'closed',
          })
        ).rejects.toThrowErrorMatchingInlineSnapshot(`"Unauthorized for fake.rule and apm"`);

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

      test('logs multiple error events in audit logger', async () => {
        const indexName = '.alerts-observability.apm.alerts';
        const alertsClient = new AlertsClient(alertsClientParams);
        esClientMock.mget.mockResponseOnce({
          docs: [
            {
              found: true,
              _id: successfulAuthzHit,
              _index: indexName,
              _source: {
                [ALERT_RULE_TYPE_ID]: 'apm.error_rate',
                [ALERT_RULE_CONSUMER]: 'apm',
                [ALERT_STATUS]: ALERT_STATUS_ACTIVE,
                [SPACE_IDS]: [DEFAULT_SPACE],
              },
            },
            {
              found: true,
              _id: unsuccessfulAuthzHit,
              _index: indexName,
              _source: {
                [ALERT_RULE_TYPE_ID]: fakeRuleTypeId,
                [ALERT_RULE_CONSUMER]: 'apm',
                [ALERT_STATUS]: ALERT_STATUS_ACTIVE,
                [SPACE_IDS]: [DEFAULT_SPACE],
              },
            },
          ],
        });

        await expect(
          alertsClient.bulkUpdate({
            ids: [successfulAuthzHit, unsuccessfulAuthzHit],
            query: undefined,
            index: indexName,
            status: 'closed',
          })
        ).rejects.toThrowErrorMatchingInlineSnapshot(`"Unauthorized for fake.rule and apm"`);
        expect(auditLogger.log).toHaveBeenCalledTimes(2);
        expect(auditLogger.log).toHaveBeenNthCalledWith(1, {
          message: `Failed attempt to update alert [id=${unsuccessfulAuthzHit}]`,
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
        expect(auditLogger.log).toHaveBeenNthCalledWith(2, {
          message: `Failed attempt to update alert [id=${successfulAuthzHit}]`,
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
    });

    // test('throws an error if ES client fetch fails', async () => {});
    // test('throws an error if ES client bulk update fails', async () => {});
    // test('throws an error if ES client updateByQuery fails', async () => {});
  });
  describe('query', () => {
    describe('audit log', () => {
      test('logs successful event in audit logger', async () => {
        const indexName = '.alerts-observability.apm.alerts';
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
                _id: fakeAlertId,
                _index: '.alerts-observability.apm.alerts',
                _source: {
                  [ALERT_RULE_TYPE_ID]: 'apm.error_rate',
                  [ALERT_RULE_CONSUMER]: 'apm',
                  [ALERT_STATUS]: ALERT_STATUS_ACTIVE,
                  [SPACE_IDS]: [DEFAULT_SPACE],
                },
              },
            ],
          },
        });

        esClientMock.updateByQuery.mockResponseOnce({
          updated: 1,
        });

        await alertsClient.bulkUpdate({
          ids: undefined,
          query: `${ALERT_STATUS}: ${ALERT_STATUS_ACTIVE}`,
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
        const indexName = '.alerts-observability.apm.alerts';
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
                _id: fakeAlertId,
                _index: '.alerts-observability.apm.alerts',
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
        await expect(
          alertsClient.bulkUpdate({
            ids: undefined,
            query: `${ALERT_STATUS}: ${ALERT_STATUS_ACTIVE}`,
            index: indexName,
            status: 'closed',
          })
        ).rejects.toThrowErrorMatchingInlineSnapshot(`
                "queryAndAuditAllAlerts threw an error: Unable to retrieve alerts with query \\"kibana.alert.status: active\\" and operation update 
                 Error: Unable to retrieve alert details for alert with id of \\"null\\" or with query \\"kibana.alert.status: active\\" and operation update 
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

      test('logs multiple error events in audit logger', async () => {
        const indexName = '.alerts-observability.apm.alerts';
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
            total: 2,
            max_score: 999,
            hits: [
              {
                _id: successfulAuthzHit,
                _index: '.alerts-observability.apm.alerts',
                _source: {
                  [ALERT_RULE_TYPE_ID]: 'apm.error_rate',
                  [ALERT_RULE_CONSUMER]: 'apm',
                  [ALERT_STATUS]: ALERT_STATUS_ACTIVE,
                  [SPACE_IDS]: [DEFAULT_SPACE],
                },
              },
              {
                _id: unsuccessfulAuthzHit,
                _index: '.alerts-observability.apm.alerts',
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
        await expect(
          alertsClient.bulkUpdate({
            ids: undefined,
            query: `${ALERT_STATUS}: ${ALERT_STATUS_ACTIVE}`,
            index: indexName,
            status: 'closed',
          })
        ).rejects.toThrowErrorMatchingInlineSnapshot(`
                "queryAndAuditAllAlerts threw an error: Unable to retrieve alerts with query \\"kibana.alert.status: active\\" and operation update 
                 Error: Unable to retrieve alert details for alert with id of \\"null\\" or with query \\"kibana.alert.status: active\\" and operation update 
                Error: Error: Unauthorized for fake.rule and apm"
              `);

        expect(auditLogger.log).toHaveBeenCalledTimes(2);
        expect(auditLogger.log).toHaveBeenNthCalledWith(1, {
          message: `Failed attempt to update alert [id=${unsuccessfulAuthzHit}]`,
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
        expect(auditLogger.log).toHaveBeenNthCalledWith(2, {
          message: `Failed attempt to update alert [id=${successfulAuthzHit}]`,
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
    });
    // test('throws an error if ES client fetch fails', async () => {});
    // test('throws an error if ES client bulk update fails', async () => {});
    // test('throws an error if ES client updateByQuery fails', async () => {});
  });
});
