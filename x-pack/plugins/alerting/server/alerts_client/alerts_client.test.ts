/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import sinon from 'sinon';
import { elasticsearchServiceMock, loggingSystemMock } from '@kbn/core/server/mocks';
import {
  ALERT_ACTION_GROUP,
  ALERT_DURATION,
  ALERT_END,
  ALERT_FLAPPING,
  ALERT_FLAPPING_HISTORY,
  ALERT_ID,
  ALERT_RULE_CATEGORY,
  ALERT_RULE_CONSUMER,
  ALERT_RULE_EXECUTION_UUID,
  ALERT_RULE_NAME,
  ALERT_RULE_PARAMETERS,
  ALERT_RULE_PRODUCER,
  ALERT_RULE_TAGS,
  ALERT_RULE_TYPE_ID,
  ALERT_RULE_UUID,
  ALERT_START,
  ALERT_STATUS,
  ALERT_UUID,
  SPACE_IDS,
  TIMESTAMP,
} from '@kbn/rule-data-utils';
import { RuleAlertData, type Alert } from '../../common';
import { RecoveredActionGroup } from '../types';
import { AlertsClient, AlertsClientParams } from './alerts_client';
import { UntypedNormalizedRuleType } from '../rule_type_registry';
import { legacyAlertsClientMock } from './legacy_alerts_client.mock';
import { SearchResponse } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { Alert as LegacyAlert } from '../alert/alert';
import { alertingEventLoggerMock } from '../lib/alerting_event_logger/alerting_event_logger.mock';
import { ruleRunMetricsStoreMock } from '../lib/rule_run_metrics_store.mock';

jest.mock('uuid', () => ({
  v4: () => 'UUID1',
}));

const logger = loggingSystemMock.createLogger();
const clusterClient = elasticsearchServiceMock.createClusterClient().asInternalUser;
const legacyAlertsClient = legacyAlertsClientMock.create();
const alertingEventLogger = alertingEventLoggerMock.create();
const ruleRunMetricsStore = ruleRunMetricsStoreMock.create();

const previousRuleExecutionUuid = 'abc';
const currentRuleExecutionUuid = 'xyz';

const ruleType: jest.Mocked<UntypedNormalizedRuleType> = {
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
};

const defaultAlertsClientParams: AlertsClientParams<{}, {}, 'default', 'recovered'> = {
  logger,
  elasticsearchClientPromise: Promise.resolve(clusterClient),
  ruleType,
  legacyAlertsClient,
};

const ruleData = {
  id: '1',
  consumer: 'alerts',
  executionId: currentRuleExecutionUuid,
  name: 'test-rule',
  tags: [],
  spaceId: 'default',
  parameters: {
    foo: 'bar',
  },
};

interface AlertData extends RuleAlertData {
  additional_alert_field1?: string;
  additional_alert_field2?: string;
}

const generateAlert = (overrides = {}): Alert & AlertData => {
  return {
    [TIMESTAMP]: '1970-01-01T00:00:00.000Z',
    // copy of rule data
    [ALERT_RULE_CATEGORY]: ruleType.name,
    [ALERT_RULE_CONSUMER]: ruleData.consumer,
    [ALERT_RULE_NAME]: ruleData.name,
    [ALERT_RULE_PARAMETERS]: ruleData.parameters,
    [ALERT_RULE_PRODUCER]: ruleType.producer,
    [ALERT_RULE_TAGS]: ruleData.tags,
    [ALERT_RULE_TYPE_ID]: ruleType.id,
    [ALERT_RULE_UUID]: ruleData.id,
    [SPACE_IDS]: [ruleData.spaceId],

    [ALERT_RULE_EXECUTION_UUID]: previousRuleExecutionUuid,
    [ALERT_ID]: '1',
    [ALERT_UUID]: 'UUID1',
    [ALERT_STATUS]: 'active',
    [ALERT_FLAPPING]: false,

    ...overrides,
  } as Alert & AlertData;
};

const generateSearchResponse = (alerts: Alert[], total: number): SearchResponse<Alert> => {
  return {
    hits: {
      hits: alerts.map((alert) => ({
        _id: alert[ALERT_UUID],
        _index: '.alerts-test-default-000001',
        _source: alert,
      })),
      total: { relation: 'eq', value: total },
    },
    took: 0,
    timed_out: false,
    _shards: { failed: 0, successful: 0, total: 0, skipped: 0 },
  };
};

describe('Alerts Client', () => {
  let alertsClient: AlertsClient<AlertData, {}, {}, 'default', 'recovered'>;
  let scheduleActions: jest.Mock;
  let replaceState: jest.Mock;
  let mockCreateAlert: jest.Mock;
  let mockGetRecoveredAlerts: jest.Mock;
  let mockSetLimitReached: jest.Mock;
  let clock: sinon.SinonFakeTimers;

  beforeAll(() => {
    clock = sinon.useFakeTimers();
  });

  beforeEach(() => {
    clock.reset();
    jest.resetAllMocks();

    scheduleActions = jest.fn();
    replaceState = jest.fn(() => ({ scheduleActions }));
    mockCreateAlert = jest.fn(() => ({ replaceState, scheduleActions }));
    mockGetRecoveredAlerts = jest.fn().mockReturnValue([]);
    mockSetLimitReached = jest.fn();
    legacyAlertsClient.getExecutorServices.mockReturnValue({
      create: mockCreateAlert,
      alertLimit: {
        getValue: jest.fn().mockReturnValue(1000),
        setLimitReached: mockSetLimitReached,
      },
      done: () => ({
        getRecoveredAlerts: mockGetRecoveredAlerts,
      }),
    });
    alertsClient = new AlertsClient(defaultAlertsClientParams);
    expect(legacyAlertsClient.getExecutorServices).toHaveBeenCalled();
  });

  afterAll(() => clock.restore());

  describe('initialize()', () => {
    test('should query for alerts when tracked alert UUIDs are available', async () => {
      const trackedAlert1 = new LegacyAlert<{}, {}>('1', {
        meta: { uuid: 'UUID1' },
      });
      const trackedAlert2 = new LegacyAlert<{}, {}>('2', {
        meta: { uuid: 'UUID2' },
      });
      clusterClient.search.mockResponse(
        generateSearchResponse(
          [
            generateAlert({
              [ALERT_ID]: '1',
              [ALERT_UUID]: 'UUID1',
            }),
            generateAlert({
              [ALERT_ID]: '2',
              [ALERT_UUID]: 'UUID2',
            }),
          ],
          2
        )
      );
      legacyAlertsClient.getTrackedAlerts.mockReturnValueOnce({
        active: {
          '1': trackedAlert1,
          '2': trackedAlert2,
        },
        recovered: {},
      });
      await alertsClient.initialize({ rule: ruleData });

      expect(clusterClient.search).toHaveBeenCalledTimes(1);
      expect(clusterClient.search).toHaveBeenCalledWith({
        body: {
          query: {
            bool: {
              filter: [
                { term: { 'kibana.alert.rule.uuid': '1' } },
                { terms: { 'kibana.alert.uuid': ['UUID1', 'UUID2'] } },
              ],
            },
          },
          size: 2,
        },
        index: '.alerts-test-default-*',
      });
    });

    test('should log error and return if query throws error', async () => {
      const trackedAlert1 = new LegacyAlert<{}, {}>('1', {
        meta: { uuid: 'UUID1' },
      });
      const trackedAlert2 = new LegacyAlert<{}, {}>('1', {
        meta: { uuid: 'UUID2' },
      });
      clusterClient.search.mockImplementation(() => {
        throw new Error('fail');
      });
      legacyAlertsClient.getTrackedAlerts.mockReturnValueOnce({
        active: {
          '1': trackedAlert1,
          '2': trackedAlert2,
        },
        recovered: {},
      });
      await alertsClient.initialize({ rule: ruleData });

      expect(clusterClient.search).toHaveBeenCalledTimes(1);
      expect(logger.error).toHaveBeenCalledWith(`Error searching for active alerts by UUID - fail`);
    });
  });

  describe('create()', () => {
    beforeEach(async () => {
      legacyAlertsClient.getTrackedAlerts.mockReturnValueOnce({
        active: {},
        recovered: {},
      });
      await alertsClient.initialize({ rule: ruleData });
    });

    test('should proxy alert creation through alert factory', () => {
      alertsClient.create({
        [ALERT_ACTION_GROUP]: 'default',
        [ALERT_ID]: 'TEST_ALERT_1',
      });

      expect(mockCreateAlert).toHaveBeenCalledWith('TEST_ALERT_1');
      expect(scheduleActions).toHaveBeenCalledWith('default');
    });
  });

  describe('proxies calls to LegacyAlertsClient', () => {
    beforeEach(async () => {
      legacyAlertsClient.getTrackedAlerts.mockReturnValueOnce({
        active: {},
        recovered: {},
      });
      await alertsClient.initialize({ rule: ruleData });
    });

    test('hasReachedAlertLimit()', () => {
      alertsClient.hasReachedAlertLimit();
      expect(legacyAlertsClient.hasReachedAlertLimit).toHaveBeenCalled();
    });

    test('checkLimitUsage()', () => {
      alertsClient.checkLimitUsage();
      expect(legacyAlertsClient.checkLimitUsage).toHaveBeenCalled();
    });

    test('processAndLogAlerts()', () => {
      const opts = {
        eventLogger: alertingEventLogger,
        shouldLogAlerts: true,
        ruleRunMetricsStore,
      };

      alertsClient.processAndLogAlerts(opts);
      expect(legacyAlertsClient.processAndLogAlerts).toHaveBeenCalledWith(opts);
    });

    test('getProcessedAlerts()', () => {
      alertsClient.getProcessedAlerts('new');
      expect(legacyAlertsClient.getProcessedAlerts).toHaveBeenCalledWith('new');
    });
  });

  describe('getAlertsToSerialize()', () => {
    test('should index new alerts', async () => {
      legacyAlertsClient.getTrackedAlerts.mockReturnValueOnce({
        active: {},
        recovered: {},
      });
      legacyAlertsClient.getAlertsToSerialize.mockReturnValueOnce({
        alertsToReturn: {
          '1': {
            meta: {
              flapping: false,
              flappingHistory: [true],
              pendingRecoveredCount: 0,
              uuid: 'UUID1',
            },
            state: {
              duration: '0',
              start: '1970-01-01T00:00:00.000Z',
            },
          },
        },
        recoveredAlertsToReturn: {},
      });
      await alertsClient.initialize({ rule: ruleData });

      // Report an alert
      alertsClient.create({ [ALERT_ACTION_GROUP]: 'default', [ALERT_ID]: '1' });

      alertsClient.processAndLogAlerts({
        eventLogger: alertingEventLogger,
        shouldLogAlerts: true,
        ruleRunMetricsStore,
      });

      await alertsClient.getAlertsToSerialize();
      expect(legacyAlertsClient.getAlertsToSerialize).toHaveBeenCalled();

      expect(clusterClient.bulk).toHaveBeenCalledTimes(1);
      expect(clusterClient.bulk).toHaveBeenCalledWith({
        refresh: 'wait_for',
        body: [
          {
            index: {
              _id: 'UUID1',
            },
          },
          generateAlert({
            [ALERT_RULE_EXECUTION_UUID]: currentRuleExecutionUuid,
            [ALERT_START]: '1970-01-01T00:00:00.000Z',
            [ALERT_DURATION]: '0',
            [ALERT_ACTION_GROUP]: 'default',
            [ALERT_FLAPPING]: false,
            [ALERT_FLAPPING_HISTORY]: [true],
          }),
        ],
      });
    });

    test('should index new alerts when it is a previously recovered alert', async () => {
      legacyAlertsClient.getTrackedAlerts.mockReturnValueOnce({
        active: {},
        recovered: {
          '1': new LegacyAlert<{}, {}>('1', {
            meta: { flappingHistory: [true, true, false, false] },
          }),
        },
      });
      legacyAlertsClient.getAlertsToSerialize.mockReturnValueOnce({
        alertsToReturn: {
          '1': {
            meta: {
              flapping: false,
              flappingHistory: [true, true, false, false, true],
              pendingRecoveredCount: 0,
              uuid: 'UUID1',
            },
            state: {
              duration: '0',
              start: '1970-01-01T00:00:00.000Z',
            },
          },
        },
        recoveredAlertsToReturn: {},
      });
      await alertsClient.initialize({ rule: ruleData });

      // Report an alert
      alertsClient.create({ [ALERT_ACTION_GROUP]: 'default', [ALERT_ID]: '1' });

      alertsClient.processAndLogAlerts({
        eventLogger: alertingEventLogger,
        shouldLogAlerts: true,
        ruleRunMetricsStore,
      });

      await alertsClient.getAlertsToSerialize();
      expect(legacyAlertsClient.getAlertsToSerialize).toHaveBeenCalled();

      expect(clusterClient.bulk).toHaveBeenCalledTimes(1);
      expect(clusterClient.bulk).toHaveBeenCalledWith({
        refresh: 'wait_for',
        body: [
          {
            index: {
              _id: 'UUID1',
            },
          },
          generateAlert({
            [ALERT_RULE_EXECUTION_UUID]: currentRuleExecutionUuid,
            [ALERT_START]: '1970-01-01T00:00:00.000Z',
            [ALERT_DURATION]: '0',
            [ALERT_ACTION_GROUP]: 'default',
            [ALERT_FLAPPING]: false,
            [ALERT_FLAPPING_HISTORY]: [true, true, false, false, true],
          }),
        ],
      });
    });

    test('should index ongoing alerts', async () => {
      legacyAlertsClient.getTrackedAlerts.mockReturnValueOnce({
        active: {
          '1': new LegacyAlert<{}, {}>('1', {
            state: { start: '1969-12-30T00:00:00.000Z', duration: 33000 },
            meta: { flappingHistory: [true, true, false, false] },
          }),
          '2': new LegacyAlert<{}, {}>('2', {
            state: { start: '1969-12-31T07:34:00.000Z', duration: 23532 },
          }),
        },
        recovered: {},
      });
      legacyAlertsClient.getAlertsToSerialize.mockReturnValueOnce({
        alertsToReturn: {
          '1': {
            meta: {
              flapping: false,
              flappingHistory: [true, true, false, false, false],
              pendingRecoveredCount: 0,
              uuid: 'UUID1',
            },
            state: {
              duration: '172800000000000',
              start: '1969-12-30T00:00:00.000Z',
            },
          },
          '2': {
            meta: {
              flapping: false,
              flappingHistory: [false],
              pendingRecoveredCount: 0,
              uuid: 'UUID1',
            },
            state: {
              duration: '59160000000000',
              start: '1969-12-31T07:34:00.000Z',
            },
          },
          '3': {
            meta: {
              flapping: false,
              flappingHistory: [true],
              pendingRecoveredCount: 0,
              uuid: 'UUID1',
            },
            state: {
              duration: '0',
              start: '1970-01-01T00:00:00.000Z',
            },
          },
        },
        recoveredAlertsToReturn: {},
      });
      await alertsClient.initialize({ rule: ruleData });

      // Report some alerts so we have 2 ongoing and 1 new
      alertsClient.create({ [ALERT_ACTION_GROUP]: 'default', [ALERT_ID]: '1' });
      alertsClient.create({ [ALERT_ACTION_GROUP]: 'default', [ALERT_ID]: '2' });
      alertsClient.create({ [ALERT_ACTION_GROUP]: 'default', [ALERT_ID]: '3' });

      alertsClient.processAndLogAlerts({
        eventLogger: alertingEventLogger,
        shouldLogAlerts: true,
        ruleRunMetricsStore,
      });

      await alertsClient.getAlertsToSerialize();
      expect(legacyAlertsClient.getAlertsToSerialize).toHaveBeenCalled();

      expect(clusterClient.bulk).toHaveBeenCalledTimes(1);
      expect(clusterClient.bulk).toHaveBeenCalledWith({
        refresh: 'wait_for',
        body: [
          {
            index: {
              _id: 'UUID1',
            },
          },
          generateAlert({
            [ALERT_RULE_EXECUTION_UUID]: currentRuleExecutionUuid,
            [ALERT_ID]: '1',
            [ALERT_START]: '1969-12-30T00:00:00.000Z',
            [ALERT_DURATION]: '172800000000000',
            [ALERT_ACTION_GROUP]: 'default',
            [ALERT_FLAPPING]: false,
            [ALERT_FLAPPING_HISTORY]: [true, true, false, false, false],
          }),
          {
            index: {
              _id: 'UUID1', // these are all the same due to the jest mock but would normally be unique
            },
          },
          generateAlert({
            [ALERT_RULE_EXECUTION_UUID]: currentRuleExecutionUuid,
            [ALERT_ID]: '2',
            [ALERT_START]: '1969-12-31T07:34:00.000Z',
            [ALERT_DURATION]: '59160000000000',
            [ALERT_ACTION_GROUP]: 'default',
            [ALERT_FLAPPING]: false,
            [ALERT_FLAPPING_HISTORY]: [false],
          }),
          {
            index: {
              _id: 'UUID1', // these are all the same due to the jest mock but would normally be unique
            },
          },
          generateAlert({
            [ALERT_RULE_EXECUTION_UUID]: currentRuleExecutionUuid,
            [ALERT_ID]: '3',
            [ALERT_START]: '1970-01-01T00:00:00.000Z',
            [ALERT_DURATION]: '0',
            [ALERT_ACTION_GROUP]: 'default',
            [ALERT_FLAPPING]: false,
            [ALERT_FLAPPING_HISTORY]: [true],
          }),
        ],
      });
    });

    test('should index ongoing alerts when alert UUID exists for tracked active alerts', async () => {
      legacyAlertsClient.getTrackedAlerts.mockReturnValueOnce({
        active: {
          '1': new LegacyAlert<{}, {}>('1', {
            state: { start: '1969-12-30T00:00:00.000Z', duration: 33000 },
            meta: { flappingHistory: [true, true, false, false], uuid: 'abcdefg' },
          }),
          '2': new LegacyAlert<{}, {}>('2', {
            state: { start: '1969-12-31T07:34:00.000Z', duration: 23532 },
            meta: { uuid: 'xyz1234' },
          }),
        },
        recovered: {},
      });
      legacyAlertsClient.getAlertsToSerialize.mockReturnValueOnce({
        alertsToReturn: {
          '1': {
            meta: {
              flapping: false,
              flappingHistory: [true, true, false, false, false],
              pendingRecoveredCount: 0,
              uuid: 'abcdefg',
            },
            state: {
              duration: '172800000000000',
              start: '1969-12-30T00:00:00.000Z',
            },
          },
          '2': {
            meta: {
              flapping: false,
              flappingHistory: [false],
              pendingRecoveredCount: 0,
              uuid: 'xyz1234',
            },
            state: {
              duration: '59160000000000',
              start: '1969-12-31T07:34:00.000Z',
            },
          },
          '3': {
            meta: {
              flapping: false,
              flappingHistory: [true],
              pendingRecoveredCount: 0,
              uuid: 'UUID1',
            },
            state: {
              duration: '0',
              start: '1970-01-01T00:00:00.000Z',
            },
          },
        },
        recoveredAlertsToReturn: {},
      });
      await alertsClient.initialize({ rule: ruleData });

      // Report some alerts so we have 2 ongoing and 1 new
      alertsClient.create({ [ALERT_ACTION_GROUP]: 'default', [ALERT_ID]: '1' });
      alertsClient.create({ [ALERT_ACTION_GROUP]: 'default', [ALERT_ID]: '2' });
      alertsClient.create({ [ALERT_ACTION_GROUP]: 'default', [ALERT_ID]: '3' });

      alertsClient.processAndLogAlerts({
        eventLogger: alertingEventLogger,
        shouldLogAlerts: true,
        ruleRunMetricsStore,
      });

      await alertsClient.getAlertsToSerialize();
      expect(legacyAlertsClient.getAlertsToSerialize).toHaveBeenCalled();

      expect(clusterClient.bulk).toHaveBeenCalledTimes(1);
      expect(clusterClient.bulk).toHaveBeenCalledWith({
        refresh: 'wait_for',
        body: [
          {
            index: {
              _id: 'abcdefg',
            },
          },
          generateAlert({
            [ALERT_RULE_EXECUTION_UUID]: currentRuleExecutionUuid,
            [ALERT_ID]: '1',
            [ALERT_UUID]: 'abcdefg',
            [ALERT_START]: '1969-12-30T00:00:00.000Z',
            [ALERT_DURATION]: '172800000000000',
            [ALERT_ACTION_GROUP]: 'default',
            [ALERT_FLAPPING]: false,
            [ALERT_FLAPPING_HISTORY]: [true, true, false, false, false],
          }),
          {
            index: {
              _id: 'xyz1234',
            },
          },
          generateAlert({
            [ALERT_RULE_EXECUTION_UUID]: currentRuleExecutionUuid,
            [ALERT_ID]: '2',
            [ALERT_UUID]: 'xyz1234',
            [ALERT_START]: '1969-12-31T07:34:00.000Z',
            [ALERT_DURATION]: '59160000000000',
            [ALERT_ACTION_GROUP]: 'default',
            [ALERT_FLAPPING]: false,
            [ALERT_FLAPPING_HISTORY]: [false],
          }),
          {
            index: {
              _id: 'UUID1', // these are all the same due to the jest mock but would normally be unique
            },
          },
          generateAlert({
            [ALERT_RULE_EXECUTION_UUID]: currentRuleExecutionUuid,
            [ALERT_ID]: '3',
            [ALERT_START]: '1970-01-01T00:00:00.000Z',
            [ALERT_DURATION]: '0',
            [ALERT_ACTION_GROUP]: 'default',
            [ALERT_FLAPPING]: false,
            [ALERT_FLAPPING_HISTORY]: [true],
          }),
        ],
      });
    });

    test('should index ongoing alerts with reported data', async () => {
      legacyAlertsClient.getTrackedAlerts.mockReturnValueOnce({
        active: {
          '1': new LegacyAlert<{}, {}>('1', {
            state: { start: '1969-12-30T00:00:00.000Z', duration: 33000 },
            meta: { flappingHistory: [true, true, false, false], uuid: 'abcdefg' },
          }),
          '2': new LegacyAlert<{}, {}>('2', {
            state: { start: '1969-12-31T07:34:00.000Z', duration: 23532 },
            meta: { uuid: 'xyz1234' },
          }),
        },
        recovered: {},
      });
      legacyAlertsClient.getAlertsToSerialize.mockReturnValueOnce({
        alertsToReturn: {
          '1': {
            meta: {
              flapping: false,
              flappingHistory: [true, true, false, false, false],
              pendingRecoveredCount: 0,
              uuid: 'abcdefg',
            },
            state: {
              duration: '172800000000000',
              start: '1969-12-30T00:00:00.000Z',
            },
          },
          '2': {
            meta: {
              flapping: false,
              flappingHistory: [false],
              pendingRecoveredCount: 0,
              uuid: 'xyz1234',
            },
            state: {
              duration: '59160000000000',
              start: '1969-12-31T07:34:00.000Z',
            },
          },
          '3': {
            meta: {
              flapping: false,
              flappingHistory: [true],
              pendingRecoveredCount: 0,
              uuid: 'UUID1',
            },
            state: {
              duration: '0',
              start: '1970-01-01T00:00:00.000Z',
            },
          },
        },
        recoveredAlertsToReturn: {},
      });
      await alertsClient.initialize({ rule: ruleData });

      // Report some alerts so we have 2 ongoing and 1 new
      alertsClient.create({
        [ALERT_ACTION_GROUP]: 'default',
        [ALERT_ID]: '1',
        additional_alert_field1: 'abc',
      });
      alertsClient.create({
        [ALERT_ACTION_GROUP]: 'default',
        [ALERT_ID]: '2',
        additional_alert_field2: 'xyz',
      });
      alertsClient.create({
        [ALERT_ACTION_GROUP]: 'default',
        [ALERT_ID]: '3',
        additional_alert_field1: 'foo',
        additional_alert_field2: 'bar',
      });

      alertsClient.processAndLogAlerts({
        eventLogger: alertingEventLogger,
        shouldLogAlerts: true,
        ruleRunMetricsStore,
      });

      await alertsClient.getAlertsToSerialize();
      expect(legacyAlertsClient.getAlertsToSerialize).toHaveBeenCalled();

      expect(clusterClient.bulk).toHaveBeenCalledTimes(1);
      expect(clusterClient.bulk).toHaveBeenCalledWith({
        refresh: 'wait_for',
        body: [
          {
            index: {
              _id: 'abcdefg',
            },
          },
          generateAlert({
            [ALERT_RULE_EXECUTION_UUID]: currentRuleExecutionUuid,
            [ALERT_ID]: '1',
            [ALERT_UUID]: 'abcdefg',
            [ALERT_START]: '1969-12-30T00:00:00.000Z',
            [ALERT_DURATION]: '172800000000000',
            [ALERT_ACTION_GROUP]: 'default',
            [ALERT_FLAPPING]: false,
            [ALERT_FLAPPING_HISTORY]: [true, true, false, false, false],
            additional_alert_field1: 'abc',
          }),
          {
            index: {
              _id: 'xyz1234',
            },
          },
          generateAlert({
            [ALERT_RULE_EXECUTION_UUID]: currentRuleExecutionUuid,
            [ALERT_ID]: '2',
            [ALERT_UUID]: 'xyz1234',
            [ALERT_START]: '1969-12-31T07:34:00.000Z',
            [ALERT_DURATION]: '59160000000000',
            [ALERT_ACTION_GROUP]: 'default',
            [ALERT_FLAPPING]: false,
            [ALERT_FLAPPING_HISTORY]: [false],
            additional_alert_field2: 'xyz',
          }),
          {
            index: {
              _id: 'UUID1', // these are all the same due to the jest mock but would normally be unique
            },
          },
          generateAlert({
            [ALERT_RULE_EXECUTION_UUID]: currentRuleExecutionUuid,
            [ALERT_ID]: '3',
            [ALERT_START]: '1970-01-01T00:00:00.000Z',
            [ALERT_DURATION]: '0',
            [ALERT_ACTION_GROUP]: 'default',
            [ALERT_FLAPPING]: false,
            [ALERT_FLAPPING_HISTORY]: [true],
            additional_alert_field1: 'foo',
            additional_alert_field2: 'bar',
          }),
        ],
      });
    });

    test('should index recovered alerts', async () => {
      legacyAlertsClient.getTrackedAlerts.mockReturnValueOnce({
        active: {
          '1': new LegacyAlert<{}, {}>('1', {
            state: { start: '1969-12-30T00:00:00.000Z', duration: 33000 },
            meta: { flappingHistory: [true, true, false, false], uuid: 'abcdefg' },
          }),
          '2': new LegacyAlert<{}, {}>('2', {
            state: { start: '1969-12-31T07:34:00.000Z', duration: 23532 },
            meta: { uuid: 'xyz1234' },
          }),
        },
        recovered: {},
      });
      legacyAlertsClient.getAlertsToSerialize.mockReturnValueOnce({
        alertsToReturn: {},
        recoveredAlertsToReturn: {
          '1': {
            meta: {
              flapping: false,
              flappingHistory: [true, true, false, false],
              uuid: 'abcdefg',
            },
            state: {
              duration: '172800000000000',
              end: '1970-01-01T00:00:00.000Z',
              start: '1969-12-30T00:00:00.000Z',
            },
          },
          '2': {
            meta: {
              flapping: false,
              flappingHistory: [true],
              uuid: 'xyz1234',
            },
            state: {
              duration: '59160000000000',
              end: '1970-01-01T00:00:00.000Z',
              start: '1969-12-31T07:34:00.000Z',
            },
          },
        },
      });
      await alertsClient.initialize({ rule: ruleData });

      // Don't report any alerts so tracked ones recover

      alertsClient.processAndLogAlerts({
        eventLogger: alertingEventLogger,
        shouldLogAlerts: true,
        ruleRunMetricsStore,
      });

      await alertsClient.getAlertsToSerialize();
      expect(legacyAlertsClient.getAlertsToSerialize).toHaveBeenCalled();

      expect(clusterClient.bulk).toHaveBeenCalledTimes(1);
      expect(clusterClient.bulk).toHaveBeenCalledWith({
        refresh: 'wait_for',
        body: [
          {
            index: {
              _id: 'abcdefg',
            },
          },
          generateAlert({
            [ALERT_RULE_EXECUTION_UUID]: currentRuleExecutionUuid,
            [ALERT_ID]: '1',
            [ALERT_UUID]: 'abcdefg',
            [ALERT_START]: '1969-12-30T00:00:00.000Z',
            [ALERT_DURATION]: '172800000000000',
            [ALERT_END]: '1970-01-01T00:00:00.000Z',
            [ALERT_FLAPPING]: false,
            [ALERT_FLAPPING_HISTORY]: [true, true, false, false],
            [ALERT_STATUS]: 'recovered',
          }),
          {
            index: {
              _id: 'xyz1234',
            },
          },
          generateAlert({
            [ALERT_RULE_EXECUTION_UUID]: currentRuleExecutionUuid,
            [ALERT_ID]: '2',
            [ALERT_UUID]: 'xyz1234',
            [ALERT_START]: '1969-12-31T07:34:00.000Z',
            [ALERT_DURATION]: '59160000000000',
            [ALERT_END]: '1970-01-01T00:00:00.000Z',
            [ALERT_FLAPPING]: false,
            [ALERT_FLAPPING_HISTORY]: [true],
            [ALERT_STATUS]: 'recovered',
          }),
        ],
      });
    });
  });
});
