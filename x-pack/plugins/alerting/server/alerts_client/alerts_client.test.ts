/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { elasticsearchServiceMock, loggingSystemMock } from '@kbn/core/server/mocks';
import {
  ALERT_ACTION_GROUP,
  ALERT_ID,
  ALERT_RULE_CATEGORY,
  ALERT_RULE_CONSUMER,
  ALERT_RULE_EXECUTION_UUID,
  ALERT_RULE_NAME,
  ALERT_RULE_PRODUCER,
  ALERT_RULE_TYPE_ID,
  ALERT_RULE_UUID,
  ALERT_STATUS,
  ALERT_UUID,
  SPACE_IDS,
  TIMESTAMP,
} from '@kbn/rule-data-utils';
import { RecoveredActionGroup } from '../types';
import { AlertsClient, AlertsClientParams } from './alerts_client';

const logger = loggingSystemMock.createLogger();
const clusterClient = elasticsearchServiceMock.createClusterClient().asInternalUser;

const defaultAlertsClientParams: AlertsClientParams = {
  logger,
  maxAlerts: 10,
  elasticsearchClientPromise: Promise.resolve(clusterClient),
  resourceInstallationPromise: Promise.resolve(true),
  ruleType: {
    id: 'test',
    name: 'My test rule',
    actionGroups: [{ id: 'default', name: 'Default' }, RecoveredActionGroup],
    defaultActionGroupId: 'default',
    minimumLicenseRequired: 'basic',
    isExportable: true,
    recoveryActionGroup: RecoveredActionGroup,
    executor: jest.fn(),
    producer: 'alerts',
    cancelAlertsOnRuleTimeout: true,
    ruleTaskTimeout: '5m',
    alerts: {
      context: 'test',
      fieldMap: {},
    },
  },
};

describe('Alerts Client', () => {
  let alertsClient: AlertsClient;

  beforeEach(() => {
    jest.resetAllMocks();
    alertsClient = new AlertsClient(defaultAlertsClientParams);
  });
  describe('initialize()', () => {
    test('should query for alerts in the correct index when initialized', async () => {
      clusterClient.search.mockResponse({
        hits: {
          hits: [
            {
              _id: '1',
              _index: '.alerts-test-default-000001',
              _source: {
                [TIMESTAMP]: '2020-01-01T12:00:00.000Z',
                [ALERT_RULE_EXECUTION_UUID]: 'abc',
                [ALERT_RULE_UUID]: 'rule-id',
                [ALERT_ID]: 'TEST_ALERT_3',
                [ALERT_UUID]: 'uuid1',
                [ALERT_RULE_TYPE_ID]: 'test',
                [ALERT_RULE_CONSUMER]: 'alerts',
                [ALERT_RULE_PRODUCER]: 'apm',
                [SPACE_IDS]: ['default'],
                [ALERT_STATUS]: 'active',
                [ALERT_RULE_CATEGORY]: 'Test rule type',
                [ALERT_RULE_NAME]: 'test',
              },
            },
            {
              _id: '2',
              _index: '.alerts-test-default-000001',
              _source: {
                [TIMESTAMP]: '2020-01-01T12:00:00.000Z',
                [ALERT_RULE_EXECUTION_UUID]: 'abc',
                [ALERT_RULE_UUID]: 'rule-id',
                [ALERT_ID]: 'TEST_ALERT_4',
                [ALERT_UUID]: 'uuid2',
                [ALERT_RULE_TYPE_ID]: 'test',
                [ALERT_RULE_CONSUMER]: 'alerts',
                [ALERT_RULE_PRODUCER]: 'apm',
                [SPACE_IDS]: ['default'],
                [ALERT_STATUS]: 'active',
                [ALERT_RULE_CATEGORY]: 'Test rule type',
                [ALERT_RULE_NAME]: 'test',
              },
            },
          ],
          total: { relation: 'eq', value: 10 },
        },
        took: 0,
        timed_out: false,
        _shards: {
          failed: 0,
          successful: 0,
          total: 0,
          skipped: 0,
        },
      });
      await alertsClient.initialize({
        previousRuleExecutionUuid: 'abc',
        rule: {
          id: '1',
          consumer: 'alerts',
          executionId: 'xyz',
          name: 'test-rule',
          tags: [],
          spaceId: 'default',
        },
      });

      expect(logger.debug).toHaveBeenCalledWith(
        `test:1: 'test-rule': AlertsClient.initialize() called for rule ID 1, execution ID abc`
      );

      expect(clusterClient.search).toHaveBeenCalledTimes(1);
      expect(clusterClient.search).toHaveBeenCalledWith({
        body: {
          from: 0,
          query: {
            bool: {
              filter: [
                { term: { 'kibana.alert.rule.uuid': '1' } },
                { term: { 'kibana.alert.rule.execution.uuid': 'abc' } },
              ],
            },
          },
          size: 1000,
        },
        index: '.alerts-test-default-*',
        track_total_hits: true,
      });
    });

    test('should query multiple times if total exceeds single query size', async () => {
      clusterClient.search.mockResponse({
        hits: {
          hits: [
            {
              _id: '1',
              _index: '.alerts-test-default-000001',
              _source: {
                [TIMESTAMP]: '2020-01-01T12:00:00.000Z',
                [ALERT_RULE_EXECUTION_UUID]: 'abc',
                [ALERT_RULE_UUID]: 'rule-id',
                [ALERT_ID]: 'TEST_ALERT_3',
                [ALERT_UUID]: 'uuid1',
                [ALERT_RULE_TYPE_ID]: 'test',
                [ALERT_RULE_CONSUMER]: 'alerts',
                [ALERT_RULE_PRODUCER]: 'apm',
                [SPACE_IDS]: ['default'],
                [ALERT_STATUS]: 'active',
                [ALERT_RULE_CATEGORY]: 'Test rule type',
                [ALERT_RULE_NAME]: 'test',
              },
            },
            {
              _id: '2',
              _index: '.alerts-test-default-000001',
              _source: {
                [TIMESTAMP]: '2020-01-01T12:00:00.000Z',
                [ALERT_RULE_EXECUTION_UUID]: 'abc',
                [ALERT_RULE_UUID]: 'rule-id',
                [ALERT_ID]: 'TEST_ALERT_4',
                [ALERT_UUID]: 'uuid2',
                [ALERT_RULE_TYPE_ID]: 'test',
                [ALERT_RULE_CONSUMER]: 'alerts',
                [ALERT_RULE_PRODUCER]: 'apm',
                [SPACE_IDS]: ['default'],
                [ALERT_STATUS]: 'active',
                [ALERT_RULE_CATEGORY]: 'Test rule type',
                [ALERT_RULE_NAME]: 'test',
              },
            },
          ],
          total: { relation: 'eq', value: 2000 },
        },
        took: 0,
        timed_out: false,
        _shards: {
          failed: 0,
          successful: 0,
          total: 0,
          skipped: 0,
        },
      });
      await alertsClient.initialize({
        previousRuleExecutionUuid: 'abc',
        rule: {
          id: '1',
          consumer: 'alerts',
          executionId: 'xyz',
          name: 'test-rule',
          tags: [],
          spaceId: 'default',
        },
      });

      expect(logger.debug).toHaveBeenCalledWith(
        `test:1: 'test-rule': AlertsClient.initialize() called for rule ID 1, execution ID abc`
      );

      expect(clusterClient.search).toHaveBeenCalledTimes(2);
      expect(clusterClient.search).toHaveBeenCalledWith({
        body: {
          from: 0,
          query: {
            bool: {
              filter: [
                { term: { 'kibana.alert.rule.uuid': '1' } },
                { term: { 'kibana.alert.rule.execution.uuid': 'abc' } },
              ],
            },
          },
          size: 1000,
        },
        index: '.alerts-test-default-*',
        track_total_hits: true,
      });
    });

    test('should log warning and return if previousExecutionUuid is not provided', async () => {
      await alertsClient.initialize({
        previousRuleExecutionUuid: undefined,
        rule: {
          id: '1',
          consumer: 'alerts',
          executionId: 'xyz',
          name: 'test-rule',
          tags: [],
          spaceId: 'default',
        },
      });

      expect(clusterClient.search).not.toHaveBeenCalled();
      expect(logger.warn).toHaveBeenCalledWith(
        `test:1: 'test-rule': AlertsClient.initialize() did not query for existing alerts because previousRuleExecutionUuid is not specified.`
      );
    });

    test('should log warning and return if resources were not installed correctly', async () => {
      alertsClient = new AlertsClient({
        ...defaultAlertsClientParams,
        resourceInstallationPromise: Promise.resolve(false),
      });
      await alertsClient.initialize({
        previousRuleExecutionUuid: 'abc',
        rule: {
          id: '1',
          consumer: 'alerts',
          executionId: 'xyz',
          name: 'test-rule',
          tags: [],
          spaceId: 'default',
        },
      });

      expect(clusterClient.search).not.toHaveBeenCalled();
      expect(logger.warn).toHaveBeenCalledWith(
        `test:1: 'test-rule': Something went wrong installing resources for context test`
      );
    });

    test('should log error and return if query throws error', async () => {
      clusterClient.search.mockImplementation(() => {
        throw new Error('fail');
      });
      await alertsClient.initialize({
        previousRuleExecutionUuid: 'abc',
        rule: {
          id: '1',
          consumer: 'alerts',
          executionId: 'xyz',
          name: 'test-rule',
          tags: [],
          spaceId: 'default',
        },
      });

      expect(clusterClient.search).toHaveBeenCalledTimes(1);
      expect(logger.error).toHaveBeenCalledWith(
        `test:1: 'test-rule': Error searching for alerts from previous execution - fail`
      );
    });
  });

  describe('create()', () => {
    beforeEach(async () => {
      clusterClient.search.mockResponse({
        hits: {
          hits: [
            {
              _id: '1',
              _index: '.alerts-test-default-000001',
              _source: {
                [TIMESTAMP]: '2020-01-01T12:00:00.000Z',
                [ALERT_RULE_EXECUTION_UUID]: 'abc',
                [ALERT_RULE_UUID]: 'rule-id',
                [ALERT_ID]: 'TEST_ALERT_3',
                [ALERT_UUID]: 'uuid1',
                [ALERT_RULE_TYPE_ID]: 'test',
                [ALERT_RULE_CONSUMER]: 'alerts',
                [ALERT_RULE_PRODUCER]: 'apm',
                [SPACE_IDS]: ['default'],
                [ALERT_STATUS]: 'active',
                [ALERT_RULE_CATEGORY]: 'Test rule type',
                [ALERT_RULE_NAME]: 'test',
              },
            },
            {
              _id: '2',
              _index: '.alerts-test-default-000001',
              _source: {
                [TIMESTAMP]: '2020-01-01T12:00:00.000Z',
                [ALERT_RULE_EXECUTION_UUID]: 'abc',
                [ALERT_RULE_UUID]: 'rule-id',
                [ALERT_ID]: 'TEST_ALERT_4',
                [ALERT_UUID]: 'uuid2',
                [ALERT_RULE_TYPE_ID]: 'test',
                [ALERT_RULE_CONSUMER]: 'alerts',
                [ALERT_RULE_PRODUCER]: 'apm',
                [SPACE_IDS]: ['default'],
                [ALERT_STATUS]: 'active',
                [ALERT_RULE_CATEGORY]: 'Test rule type',
                [ALERT_RULE_NAME]: 'test',
              },
            },
          ],
          total: { relation: 'eq', value: 10 },
        },
        took: 0,
        timed_out: false,
        _shards: {
          failed: 0,
          successful: 0,
          total: 0,
          skipped: 0,
        },
      });
      await alertsClient.initialize({
        previousRuleExecutionUuid: 'abc',
        rule: {
          id: '1',
          consumer: 'alerts',
          executionId: 'xyz',
          name: 'test-rule',
          tags: [],
          spaceId: 'default',
        },
      });
    });

    test('should allow creating alerts', () => {
      alertsClient.create({
        [ALERT_ACTION_GROUP]: 'default',
        [ALERT_ID]: 'TEST_ALERT_3',
      });

      alertsClient.create({
        [ALERT_ACTION_GROUP]: 'default',
        [ALERT_ID]: 'TEST_ALERT_4',
      });
    });

    test('should throw error when creating an alert with the same ID multiple times', () => {
      alertsClient.create({
        [ALERT_ACTION_GROUP]: 'default',
        [ALERT_ID]: 'TEST_ALERT_3',
      });

      expect(() => {
        alertsClient.create({
          [ALERT_ACTION_GROUP]: 'default',
          [ALERT_ID]: 'TEST_ALERT_3',
        });
      }).toThrowErrorMatchingInlineSnapshot(
        `"Can't create alert with id TEST_ALERT_3 multiple times!"`
      );
    });

    test('should throw error when creating more than max allowed alerts', () => {
      for (let i = 0; i < 9; ++i) {
        alertsClient.create({
          [ALERT_ACTION_GROUP]: 'default',
          [ALERT_ID]: `TEST_ALERT_${i}`,
        });
      }

      expect(() => {
        alertsClient.create({
          [ALERT_ACTION_GROUP]: 'default',
          [ALERT_ID]: 'TEST_ALERT_10',
        });
      }).toThrowErrorMatchingInlineSnapshot(
        `"Can't create new alerts as max allowed alerts have been created!"`
      );

      expect(alertsClient.hasReachedAlertLimit()).toEqual(true);
    });
  });
});
