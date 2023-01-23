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
import { type Alert } from '../../common';
import { RecoveredActionGroup } from '../types';
import { AlertsClient, AlertsClientParams } from './alerts_client';
import { alertingEventLoggerMock } from '../lib/alerting_event_logger/alerting_event_logger.mock';
import { ruleRunMetricsStoreMock } from '../lib/rule_run_metrics_store.mock';
import { UntypedNormalizedRuleType } from '../rule_type_registry';
import { EVENT_LOG_ACTIONS } from '../plugin';
import { LegacyAlertsClient } from './legacy_alerts_client';

jest.mock('uuid', () => ({
  v4: () => 'UUID1',
}));

const logger = loggingSystemMock.createLogger();
const clusterClient = elasticsearchServiceMock.createClusterClient().asInternalUser;
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

const legacyAlertsClient = new LegacyAlertsClient({ logger, maxAlerts: 10, ruleType });
legacyAlertsClient.initialize({ ruleLabel });

const defaultAlertsClientParams: AlertsClientParams = {
  logger,
  maxAlerts: 10,
  elasticsearchClientPromise: Promise.resolve(clusterClient),
  resourceInstallationPromise: Promise.resolve(true),
  ruleType,
  eventLogger: alertingEventLogger,
  legacyAlertsClient: new LegacyAlertsClient({ logger, maxAlerts: 10, ruleType }),
};

const ruleData = {
  id: '1',
  consumer: 'alerts',
  executionId: currentRuleExecutionUuid,
  name: 'test-rule',
  tags: [],
  spaceId: 'default',
};

const generateAlert = (overrides = {}): Alert => {
  return {
    [TIMESTAMP]: '1970-01-01T00:00:00.000Z',
    // copy of rule data
    [ALERT_RULE_CATEGORY]: ruleType.name,
    [ALERT_RULE_CONSUMER]: ruleData.consumer,
    [ALERT_RULE_NAME]: ruleData.name,
    [ALERT_RULE_PRODUCER]: ruleType.producer,
    [ALERT_RULE_TAGS]: ruleData.tags,
    [ALERT_RULE_TYPE_ID]: ruleType.id,
    [ALERT_RULE_UUID]: ruleData.id,
    [SPACE_IDS]: [ruleData.spaceId],

    [ALERT_RULE_EXECUTION_UUID]: previousRuleExecutionUuid,
    [ALERT_ID]: '1',
    [ALERT_UUID]: 'UUID1',
    [ALERT_STATUS]: 'active',
    [ALERT_ACTION_GROUP]: 'default',
    [ALERT_FLAPPING]: false,

    ...overrides,
  } as Alert;
};

describe('Alerts Client', () => {
  let alertsClient: AlertsClient<{}>;

  let clock: sinon.SinonFakeTimers;

  beforeAll(() => {
    clock = sinon.useFakeTimers();
  });

  beforeEach(() => {
    clock.reset();
    jest.resetAllMocks();
    alertsClient = new AlertsClient(defaultAlertsClientParams);
  });

  afterAll(() => clock.restore());

  describe('initialize()', () => {
    test('should log warning and return if resources were not installed correctly', async () => {
      alertsClient = new AlertsClient({
        ...defaultAlertsClientParams,
        resourceInstallationPromise: Promise.resolve(false),
      });
      await alertsClient.initialize({ rule: ruleData });

      expect(logger.warn).toHaveBeenCalledWith(
        `test:1: 'test-rule': Something went wrong installing resources for context test`
      );
    });
  });

  describe('create()', () => {
    beforeEach(async () => {
      await alertsClient.initialize({ rule: ruleData });
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
      for (let i = 0; i < 10; ++i) {
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
        `"Can't create more than 10 alerts in a single rule run!"`
      );

      expect(alertsClient.hasReachedAlertLimit()).toEqual(true);
    });
  });

  describe('processAndLogAlerts()', () => {
    const testParams: Array<{
      shouldLogAlerts: boolean;
    }> = [{ shouldLogAlerts: true }, { shouldLogAlerts: false }];

    test.each(testParams)(
      'should correctly process and log new alerts %s',
      async ({ shouldLogAlerts }) => {
        clusterClient.search.mockResponse(generateSearchResponse([], 0));

        // Initialize with no tracked alerts so all reported alerts are new
        await alertsClient.initialize({ previousRuleExecutionUuid, rule: ruleData });

        // Report an alert
        alertsClient.create({ [ALERT_ACTION_GROUP]: 'default', [ALERT_ID]: '1' });

        alertsClient.processAndLogAlerts(ruleRunMetricsStore, shouldLogAlerts);

        const newAlerts = alertsClient.getProcessedAlerts('new');
        expect(Object.keys(newAlerts)).toEqual(['1']);
        expect(newAlerts['1']).toEqual(
          generateAlert({
            // execution id set to current execution id
            [ALERT_RULE_EXECUTION_UUID]: currentRuleExecutionUuid,
            // as reported by rule executor
            [ALERT_ID]: '1',
            [ALERT_ACTION_GROUP]: 'default',
            // initialize new alert status to active
            [ALERT_STATUS]: 'active',
            // initialized because new alert
            [ALERT_START]: '1970-01-01T00:00:00.000Z',
            [ALERT_DURATION]: '0',
            [ALERT_UUID]: 'UUID1',
            // initialized because alert flapped from unknown to new
            [ALERT_FLAPPING_HISTORY]: [true],
          })
        );

        const activeAlerts = alertsClient.getProcessedAlerts('active');
        expect(newAlerts).toEqual(activeAlerts);
        expect(alertsClient.getProcessedAlerts('recovered')).toEqual({});
        expect(alertsClient.getProcessedAlerts('recoveredCurrent')).toEqual({});

        expect(logger.debug).toHaveBeenCalledTimes(2);
        expect(logger.debug).toHaveBeenNthCalledWith(
          1,
          `test:1: 'test-rule': AlertsClient.initialize() called for rule ID 1, execution ID abc`
        );
        expect(logger.debug).toHaveBeenNthCalledWith(
          2,
          `rule test:1: 'test-rule' has 1 active alerts: [{\"instanceId\":\"1\",\"actionGroup\":\"default\"}]`
        );

        if (shouldLogAlerts) {
          expect(ruleRunMetricsStore.setNumberOfNewAlerts).toHaveBeenCalledWith(1);
          expect(ruleRunMetricsStore.setNumberOfActiveAlerts).toHaveBeenCalledWith(1);
          expect(ruleRunMetricsStore.setNumberOfRecoveredAlerts).toHaveBeenCalledWith(0);

          testAlertingEventLogger([
            {
              action: EVENT_LOG_ACTIONS.newInstance,
              group: 'default',
              state: {},
            },
            {
              action: EVENT_LOG_ACTIONS.activeInstance,
              group: 'default',
              state: {},
            },
          ]);
        } else {
          testAlertingEventLoggerNotCalled();
        }
      }
    );

    test.each(testParams)(
      'should correctly process and log new alerts when it is a previously recovered alert %s',
      async ({ shouldLogAlerts }) => {
        clusterClient.search.mockResponse(
          generateSearchResponse(
            [
              generateAlert({
                [ALERT_ID]: '1',
                [ALERT_UUID]: 'UUID9',
                [ALERT_START]: '1969-12-31T23:56:00.000Z',
                [ALERT_END]: '1970-01-01T00:00:00.000Z',
                [ALERT_DURATION]: '435346',
                [ALERT_FLAPPING_HISTORY]: [true, true, false, false],
                // tracked recovered alert
                [ALERT_STATUS]: 'recovered',
              }),
            ],
            1
          )
        );

        // Initialize with a tracked recovered alert so reported alerts
        // are new but there is a tracked recovered alert that matches a reported alert
        await alertsClient.initialize({ previousRuleExecutionUuid, rule: ruleData });

        // Report an alert
        alertsClient.create({ [ALERT_ACTION_GROUP]: 'default', [ALERT_ID]: '1' });

        alertsClient.processAndLogAlerts(ruleRunMetricsStore, shouldLogAlerts);

        const newAlerts = alertsClient.getProcessedAlerts('new');
        expect(Object.keys(newAlerts)).toEqual(['1']);
        expect(newAlerts['1']).toEqual(
          generateAlert({
            // execution id set to current execution id
            [ALERT_RULE_EXECUTION_UUID]: currentRuleExecutionUuid,
            // as reported by rule executor
            [ALERT_ID]: '1',
            [ALERT_ACTION_GROUP]: 'default',
            // initialize new alert status to active
            [ALERT_STATUS]: 'active',
            // initialized because new alert
            [ALERT_START]: '1970-01-01T00:00:00.000Z',
            [ALERT_DURATION]: '0',
            [ALERT_UUID]: 'UUID1',
            // copied history from tracked recovered alert with same ALERT_ID and updated
            [ALERT_FLAPPING_HISTORY]: [true, true, false, false, true],
          })
        );

        const activeAlerts = alertsClient.getProcessedAlerts('active');
        expect(newAlerts).toEqual(activeAlerts);
        expect(alertsClient.getProcessedAlerts('recovered')).toEqual({});
        expect(alertsClient.getProcessedAlerts('recoveredCurrent')).toEqual({});

        expect(logger.debug).toHaveBeenCalledTimes(2);
        expect(logger.debug).toHaveBeenNthCalledWith(
          1,
          `test:1: 'test-rule': AlertsClient.initialize() called for rule ID 1, execution ID abc`
        );
        expect(logger.debug).toHaveBeenNthCalledWith(
          2,
          `rule test:1: 'test-rule' has 1 active alerts: [{\"instanceId\":\"1\",\"actionGroup\":\"default\"}]`
        );

        if (shouldLogAlerts) {
          expect(ruleRunMetricsStore.setNumberOfNewAlerts).toHaveBeenCalledWith(1);
          expect(ruleRunMetricsStore.setNumberOfActiveAlerts).toHaveBeenCalledWith(1);
          expect(ruleRunMetricsStore.setNumberOfRecoveredAlerts).toHaveBeenCalledWith(0);

          testAlertingEventLogger([
            {
              action: EVENT_LOG_ACTIONS.newInstance,
              group: 'default',
              state: {},
            },
            {
              action: EVENT_LOG_ACTIONS.activeInstance,
              group: 'default',
              state: {},
            },
          ]);
        } else {
          testAlertingEventLoggerNotCalled();
        }
      }
    );

    test.each(testParams)(
      'should correctly process and log ongoing alerts %s',
      async ({ shouldLogAlerts }) => {
        clusterClient.search.mockResponse(
          generateSearchResponse(
            [
              generateAlert({
                [ALERT_ID]: '1',
                [ALERT_UUID]: 'UUID9',
                [ALERT_START]: '1969-12-30T00:00:00.000Z',
                [ALERT_DURATION]: 33000,
                [ALERT_FLAPPING_HISTORY]: [true, true, false, false],
                // tracked active alert
                [ALERT_STATUS]: 'active',
              }),
              generateAlert({
                [ALERT_ID]: '2',
                [ALERT_UUID]: 'UUID10',
                [ALERT_START]: '1969-12-31T07:34:00.000Z',
                [ALERT_DURATION]: 23532,
                // tracked active alert
                [ALERT_STATUS]: 'active',
              }),
            ],
            2
          )
        );

        // Initialize with tracked active alerts
        await alertsClient.initialize({ previousRuleExecutionUuid, rule: ruleData });

        // Report some alerts so we have 2 ongoing and 1 new
        alertsClient.create({ [ALERT_ACTION_GROUP]: 'default', [ALERT_ID]: '1' });
        alertsClient.create({ [ALERT_ACTION_GROUP]: 'default', [ALERT_ID]: '2' });
        alertsClient.create({ [ALERT_ACTION_GROUP]: 'default', [ALERT_ID]: '3' });

        alertsClient.processAndLogAlerts(ruleRunMetricsStore, shouldLogAlerts);

        const newAlerts = alertsClient.getProcessedAlerts('new');
        expect(Object.keys(newAlerts)).toEqual(['3']);

        const activeAlerts = alertsClient.getProcessedAlerts('active');
        expect(Object.keys(activeAlerts)).toEqual(['1', '2', '3']);
        expect(activeAlerts['1']).toEqual(
          generateAlert({
            // execution id set to current execution id
            [ALERT_RULE_EXECUTION_UUID]: currentRuleExecutionUuid,
            // as reported by rule executor
            [ALERT_ID]: '1',
            [ALERT_ACTION_GROUP]: 'default',
            // status should remain active
            [ALERT_STATUS]: 'active',
            // start time unchanged
            [ALERT_START]: '1969-12-30T00:00:00.000Z',
            // duration updated
            [ALERT_DURATION]: '172800000000000',
            // uuid should remain the same
            [ALERT_UUID]: 'UUID9',
            // copied history from tracked recovered alert with same ALERT_ID and updated
            [ALERT_FLAPPING_HISTORY]: [true, true, false, false, false],
          })
        );
        expect(activeAlerts['2']).toEqual(
          generateAlert({
            // execution id set to current execution id
            [ALERT_RULE_EXECUTION_UUID]: currentRuleExecutionUuid,
            // as reported by rule executor
            [ALERT_ID]: '2',
            [ALERT_ACTION_GROUP]: 'default',
            // status should remain active
            [ALERT_STATUS]: 'active',
            // start time unchanged
            [ALERT_START]: '1969-12-31T07:34:00.000Z',
            // duration updated
            [ALERT_DURATION]: '59160000000000',
            // uuid should remain the same
            [ALERT_UUID]: 'UUID10',
            // flapping history initialized bc not available in tracked active alert
            [ALERT_FLAPPING_HISTORY]: [false],
          })
        );

        expect(alertsClient.getProcessedAlerts('recovered')).toEqual({});
        expect(alertsClient.getProcessedAlerts('recoveredCurrent')).toEqual({});

        expect(logger.debug).toHaveBeenCalledTimes(2);
        expect(logger.debug).toHaveBeenNthCalledWith(
          1,
          `test:1: 'test-rule': AlertsClient.initialize() called for rule ID 1, execution ID abc`
        );
        expect(logger.debug).toHaveBeenNthCalledWith(
          2,
          `rule test:1: 'test-rule' has 3 active alerts: [{\"instanceId\":\"1\",\"actionGroup\":\"default\"},{\"instanceId\":\"2\",\"actionGroup\":\"default\"},{\"instanceId\":\"3\",\"actionGroup\":\"default\"}]`
        );

        if (shouldLogAlerts) {
          expect(ruleRunMetricsStore.setNumberOfActiveAlerts).toHaveBeenCalledWith(3);
          expect(ruleRunMetricsStore.setNumberOfRecoveredAlerts).toHaveBeenCalledWith(0);

          testAlertingEventLogger([
            {
              action: EVENT_LOG_ACTIONS.newInstance,
              id: '3',
              group: 'default',
              state: {},
            },
            {
              action: EVENT_LOG_ACTIONS.activeInstance,
              group: 'default',
              state: {},
            },
            {
              action: EVENT_LOG_ACTIONS.activeInstance,
              id: '2',
              group: 'default',
              state: {},
            },
            {
              action: EVENT_LOG_ACTIONS.activeInstance,
              id: '3',
              group: 'default',
              state: {},
            },
          ]);
        } else {
          testAlertingEventLoggerNotCalled();
        }
      }
    );

    test.each(testParams)(
      'should correctly process and log recovered alerts %s',
      async ({ shouldLogAlerts }) => {
        clusterClient.search.mockResponse(
          generateSearchResponse(
            [
              generateAlert({
                [ALERT_ID]: '1',
                [ALERT_UUID]: 'UUID9',
                [ALERT_START]: '1969-12-30T00:00:00.000Z',
                [ALERT_DURATION]: 33000,
                [ALERT_FLAPPING_HISTORY]: [true, true, false, false],
                // tracked active alert
                [ALERT_STATUS]: 'active',
              }),
              generateAlert({
                [ALERT_ID]: '2',
                [ALERT_UUID]: 'UUID10',
                [ALERT_START]: '1969-12-31T07:34:00.000Z',
                [ALERT_DURATION]: 23532,
                // tracked active alert
                [ALERT_STATUS]: 'active',
              }),
            ],
            2
          )
        );

        // Initialize with tracked active alerts
        await alertsClient.initialize({ previousRuleExecutionUuid, rule: ruleData });

        // Don't report any alerts

        alertsClient.processAndLogAlerts(ruleRunMetricsStore, shouldLogAlerts);

        expect(alertsClient.getProcessedAlerts('new')).toEqual({});
        expect(alertsClient.getProcessedAlerts('active')).toEqual({});

        const recoveredCurrentAlerts = alertsClient.getProcessedAlerts('recoveredCurrent');
        expect(Object.keys(recoveredCurrentAlerts)).toEqual(['1', '2']);
        expect(recoveredCurrentAlerts['1']).toEqual(
          generateAlert({
            // execution id set to current execution id
            [ALERT_RULE_EXECUTION_UUID]: currentRuleExecutionUuid,
            // no change to alert id or action group
            [ALERT_ID]: '1',
            [ALERT_ACTION_GROUP]: 'default',
            // start time unchanged
            [ALERT_START]: '1969-12-30T00:00:00.000Z',
            // duration updated
            [ALERT_DURATION]: '172800000000000',
            // end time added
            [ALERT_END]: '1970-01-01T00:00:00.000Z',
            // copied history from tracked active alert with same ALERT_ID and updated
            [ALERT_FLAPPING_HISTORY]: [true, true, false, false, true],
            // uuid should remain the same
            [ALERT_UUID]: 'UUID9',
            // status should change to recovered
            [ALERT_STATUS]: 'recovered',
          })
        );
        expect(recoveredCurrentAlerts['2']).toEqual(
          generateAlert({
            // execution id set to current execution id
            [ALERT_RULE_EXECUTION_UUID]: currentRuleExecutionUuid,
            // no change to alert id or action group
            [ALERT_ID]: '2',
            [ALERT_ACTION_GROUP]: 'default',
            // start time unchanged
            [ALERT_START]: '1969-12-31T07:34:00.000Z',
            // duration updated
            [ALERT_DURATION]: '59160000000000',
            // end time added
            [ALERT_END]: '1970-01-01T00:00:00.000Z',
            // flapping history initialized bc not available in tracked active alert
            [ALERT_FLAPPING_HISTORY]: [true],
            // uuid should remain the same
            [ALERT_UUID]: 'UUID10',
            // status should change to recovered
            [ALERT_STATUS]: 'recovered',
          })
        );

        const recoveredAlerts = alertsClient.getProcessedAlerts('recovered');
        expect(recoveredAlerts).toEqual(recoveredCurrentAlerts);

        expect(logger.debug).toHaveBeenCalledTimes(2);
        expect(logger.debug).toHaveBeenNthCalledWith(
          1,
          `test:1: 'test-rule': AlertsClient.initialize() called for rule ID 1, execution ID abc`
        );
        expect(logger.debug).toHaveBeenNthCalledWith(
          2,
          `rule test:1: 'test-rule' has 2 recovered alerts: [\"1\",\"2\"]`
        );

        if (shouldLogAlerts) {
          expect(ruleRunMetricsStore.setNumberOfRecoveredAlerts).toHaveBeenCalledWith(2);

          testAlertingEventLogger([
            {
              action: EVENT_LOG_ACTIONS.recoveredInstance,
              state: {},
            },
            {
              action: EVENT_LOG_ACTIONS.recoveredInstance,
              id: '2',
              state: {},
            },
          ]);
        } else {
          testAlertingEventLoggerNotCalled();
        }
      }
    );

    test.each(testParams)(
      'should correctly process and log all recovered alerts %s',
      async ({ shouldLogAlerts }) => {
        clusterClient.search.mockResponse(
          generateSearchResponse(
            [
              generateAlert({
                [ALERT_ID]: '1',
                [ALERT_UUID]: 'UUID9',
                [ALERT_START]: '1969-12-30T00:00:00.000Z',
                [ALERT_DURATION]: 33000,
                [ALERT_FLAPPING_HISTORY]: [true, true, false, false],
                // tracked active alert
                [ALERT_STATUS]: 'active',
              }),
              generateAlert({
                [ALERT_ID]: '2',
                [ALERT_UUID]: 'UUID10',
                [ALERT_START]: '1969-12-31T07:34:00.000Z',
                [ALERT_DURATION]: 23532,
                // tracked active alert
                [ALERT_STATUS]: 'active',
              }),
              generateAlert({
                [ALERT_ID]: '3',
                [ALERT_UUID]: 'UUID11',
                [ALERT_START]: '1969-12-31T07:34:00.000Z',
                [ALERT_END]: '1969-12-31T14:34:00.000Z',
                [ALERT_DURATION]: '435346',
                [ALERT_FLAPPING_HISTORY]: [false, false],
                // tracked recovered alert
                [ALERT_STATUS]: 'recovered',
              }),
            ],
            3
          )
        );
        alertsClient = new AlertsClient({
          ...defaultAlertsClientParams,
          ruleType: { ...ruleType, doesSetRecoveryContext: true },
        });

        // Initialize with tracked active and recovered alerts
        await alertsClient.initialize({ previousRuleExecutionUuid, rule: ruleData });

        // Don't report any alerts

        alertsClient.processAndLogAlerts(ruleRunMetricsStore, shouldLogAlerts);

        expect(alertsClient.getProcessedAlerts('new')).toEqual({});
        expect(alertsClient.getProcessedAlerts('active')).toEqual({});

        const recoveredCurrentAlerts = alertsClient.getProcessedAlerts('recoveredCurrent');
        expect(Object.keys(recoveredCurrentAlerts)).toEqual(['1', '2']);

        const recoveredAlerts = alertsClient.getProcessedAlerts('recovered');
        expect(Object.keys(recoveredAlerts)).toEqual(['1', '2', '3']);
        expect(recoveredAlerts['1']).toEqual(
          generateAlert({
            // execution id set to current execution id
            [ALERT_RULE_EXECUTION_UUID]: currentRuleExecutionUuid,
            // no change to alert id or action group
            [ALERT_ID]: '1',
            [ALERT_ACTION_GROUP]: 'default',
            // start time unchanged
            [ALERT_START]: '1969-12-30T00:00:00.000Z',
            // duration updated
            [ALERT_DURATION]: '172800000000000',
            // end time added
            [ALERT_END]: '1970-01-01T00:00:00.000Z',
            // copied history from tracked active alert with same ALERT_ID and updated
            [ALERT_FLAPPING_HISTORY]: [true, true, false, false, true],
            // uuid should remain the same
            [ALERT_UUID]: 'UUID9',
            // status should change to recovered
            [ALERT_STATUS]: 'recovered',
          })
        );
        expect(recoveredAlerts['2']).toEqual(
          generateAlert({
            // execution id set to current execution id
            [ALERT_RULE_EXECUTION_UUID]: currentRuleExecutionUuid,
            // no change to alert id or action group
            [ALERT_ID]: '2',
            [ALERT_ACTION_GROUP]: 'default',
            // start time unchanged
            [ALERT_START]: '1969-12-31T07:34:00.000Z',
            // duration updated
            [ALERT_DURATION]: '59160000000000',
            // end time added
            [ALERT_END]: '1970-01-01T00:00:00.000Z',
            // flapping history initialized bc not available in tracked active alert
            [ALERT_FLAPPING_HISTORY]: [true],
            // uuid should remain the same
            [ALERT_UUID]: 'UUID10',
            // status should change to recovered
            [ALERT_STATUS]: 'recovered',
          })
        );
        expect(recoveredAlerts['3']).toEqual(
          generateAlert({
            // execution id set to current execution id
            [ALERT_RULE_EXECUTION_UUID]: currentRuleExecutionUuid,
            [ALERT_ID]: '3',
            [ALERT_ACTION_GROUP]: 'default',
            [ALERT_START]: '1969-12-31T07:34:00.000Z',
            [ALERT_END]: '1969-12-31T14:34:00.000Z',
            [ALERT_DURATION]: '435346',
            // flapping history is updated
            [ALERT_FLAPPING_HISTORY]: [false, false, false],
            [ALERT_UUID]: 'UUID11',
            // tracked recovered alert status stays recovered
            [ALERT_STATUS]: 'recovered',
          })
        );

        expect(logger.debug).toHaveBeenNthCalledWith(
          1,
          `test:1: 'test-rule': AlertsClient.initialize() called for rule ID 1, execution ID abc`
        );
        expect(logger.debug).toHaveBeenNthCalledWith(
          2,
          `rule test:1: 'test-rule' has 2 recovered alerts: [\"1\",\"2\"]`
        );

        if (shouldLogAlerts) {
          expect(ruleRunMetricsStore.setNumberOfRecoveredAlerts).toHaveBeenCalledWith(2);

          testAlertingEventLogger([
            {
              action: EVENT_LOG_ACTIONS.recoveredInstance,
              state: {},
            },
            {
              action: EVENT_LOG_ACTIONS.recoveredInstance,
              id: '2',
              state: {},
            },
          ]);
        } else {
          testAlertingEventLoggerNotCalled();
        }
      }
    );

    test.each(testParams)(
      'should correctly process and log when alert limit is reached %s',
      async ({ shouldLogAlerts }) => {
        clusterClient.search.mockResponse(
          generateSearchResponse(
            [
              generateAlert({
                [ALERT_ID]: '1',
                [ALERT_UUID]: 'UUID9',
                [ALERT_START]: '1969-12-30T00:00:00.000Z',
                [ALERT_DURATION]: 33000,
                [ALERT_FLAPPING_HISTORY]: [true, true, false, false],
                // tracked active alert
                [ALERT_STATUS]: 'active',
              }),
              generateAlert({
                [ALERT_ID]: '2',
                [ALERT_UUID]: 'UUID10',
                [ALERT_START]: '1969-12-31T07:34:00.000Z',
                [ALERT_DURATION]: 23532,
                // tracked active alert
                [ALERT_STATUS]: 'active',
              }),
              generateAlert({
                [ALERT_ID]: '3',
                [ALERT_UUID]: 'UUID11',
                [ALERT_START]: '1969-12-31T14:55:00.000Z',
                [ALERT_DURATION]: '435346',
                [ALERT_FLAPPING_HISTORY]: [false],
                // tracked active alert
                [ALERT_STATUS]: 'active',
              }),
              generateAlert({
                [ALERT_ID]: '4',
                [ALERT_UUID]: 'UUID12',
                [ALERT_START]: '1969-12-31T07:34:00.000Z',
                [ALERT_DURATION]: '24357457',
                [ALERT_END]: '1969-12-31T14:34:00.000Z',
                [ALERT_FLAPPING_HISTORY]: [false, false],
                // tracked recovered alert
                [ALERT_STATUS]: 'recovered',
              }),
            ],
            4
          )
        );
        alertsClient = new AlertsClient({
          ...defaultAlertsClientParams,
          maxAlerts: 5,
          ruleType: { ...ruleType, doesSetRecoveryContext: true },
        });

        // Initialize with tracked active and recovered alerts
        await alertsClient.initialize({ previousRuleExecutionUuid, rule: ruleData });

        // Report enough alerts to hit the limit
        alertsClient.create({ [ALERT_ACTION_GROUP]: 'default', [ALERT_ID]: '1' });
        alertsClient.create({ [ALERT_ACTION_GROUP]: 'default', [ALERT_ID]: '4' });
        alertsClient.create({ [ALERT_ACTION_GROUP]: 'default', [ALERT_ID]: '5' });
        alertsClient.create({ [ALERT_ACTION_GROUP]: 'default', [ALERT_ID]: '6' });
        alertsClient.create({ [ALERT_ACTION_GROUP]: 'default', [ALERT_ID]: '7' });

        expect(() => {
          alertsClient.create({ [ALERT_ACTION_GROUP]: 'default', [ALERT_ID]: '8' });
        }).toThrowErrorMatchingInlineSnapshot(
          `"Can't create more than 5 alerts in a single rule run!"`
        );

        expect(alertsClient.hasReachedAlertLimit()).toEqual(true);

        alertsClient.processAndLogAlerts(ruleRunMetricsStore, shouldLogAlerts);

        const activeAlerts = alertsClient.getProcessedAlerts('active');
        // Active alerts should contain all tracked active ids even if they were not reported
        expect(Object.keys(activeAlerts)).toEqual(['1', '2', '3', '4', '5']);

        const newAlerts = alertsClient.getProcessedAlerts('new');
        // New alerts contains just some of the new reported alerts bc we hit the limit
        expect(Object.keys(newAlerts)).toEqual(['4', '5']);

        // Recovered alerts should contain nothing
        expect(alertsClient.getProcessedAlerts('recovered')).toEqual({});
        expect(alertsClient.getProcessedAlerts('recoveredCurrent')).toEqual({});

        expect(activeAlerts['1']).toEqual(
          generateAlert({
            // execution id set to current execution id
            [ALERT_RULE_EXECUTION_UUID]: currentRuleExecutionUuid,
            // as reported by rule executor
            [ALERT_ID]: '1',
            [ALERT_ACTION_GROUP]: 'default',
            // status should remain active
            [ALERT_STATUS]: 'active',
            // start time unchanged
            [ALERT_START]: '1969-12-30T00:00:00.000Z',
            // duration updated
            [ALERT_DURATION]: '172800000000000',
            // updated flapping history
            [ALERT_FLAPPING_HISTORY]: [true, true, false, false, false],
            // uuid should remain the same
            [ALERT_UUID]: 'UUID9',
          })
        );
        expect(activeAlerts['2']).toEqual(
          generateAlert({
            // execution id set to current execution id
            [ALERT_RULE_EXECUTION_UUID]: currentRuleExecutionUuid,
            // as carried over from previous active alert
            [ALERT_ID]: '2',
            [ALERT_ACTION_GROUP]: 'default',
            [ALERT_STATUS]: 'active',
            // start time unchanged
            [ALERT_START]: '1969-12-31T07:34:00.000Z',
            // duration updated
            [ALERT_DURATION]: '59160000000000',
            // flapping history initialized bc not available in tracked active alert
            [ALERT_FLAPPING_HISTORY]: [false],
            // uuid should remain the same
            [ALERT_UUID]: 'UUID10',
          })
        );
        expect(activeAlerts['3']).toEqual(
          generateAlert({
            // execution id set to current execution id
            [ALERT_RULE_EXECUTION_UUID]: currentRuleExecutionUuid,
            // as carried over from previous active alert
            [ALERT_ID]: '3',
            [ALERT_ACTION_GROUP]: 'default',
            [ALERT_STATUS]: 'active',
            // start time unchanged
            [ALERT_START]: '1969-12-31T14:55:00.000Z',
            // duration updated
            [ALERT_DURATION]: '32700000000000',
            // updated flapping history
            [ALERT_FLAPPING_HISTORY]: [false, false],
            // uuid should remain the same
            [ALERT_UUID]: 'UUID11',
          })
        );
        expect(activeAlerts['4']).toEqual(
          generateAlert({
            // execution id set to current execution id
            [ALERT_RULE_EXECUTION_UUID]: currentRuleExecutionUuid,
            // as reported by rule executor
            [ALERT_ID]: '4',
            [ALERT_ACTION_GROUP]: 'default',
            // initialize new alert status to active
            [ALERT_STATUS]: 'active',
            // initialized because new alert
            [ALERT_START]: '1970-01-01T00:00:00.000Z',
            [ALERT_DURATION]: '0',
            // new alert uuid generated
            [ALERT_UUID]: 'UUID1',
            // copied history from tracked recovered alert with same ALERT_ID and updated
            [ALERT_FLAPPING_HISTORY]: [false, false, true],
          })
        );
        expect(activeAlerts['5']).toEqual(
          generateAlert({
            // execution id set to current execution id
            [ALERT_RULE_EXECUTION_UUID]: currentRuleExecutionUuid,
            // as reported by rule executor
            [ALERT_ID]: '5',
            [ALERT_ACTION_GROUP]: 'default',
            // initialize new alert status to active
            [ALERT_STATUS]: 'active',
            // initialized because new alert
            [ALERT_START]: '1970-01-01T00:00:00.000Z',
            [ALERT_DURATION]: '0',
            [ALERT_UUID]: 'UUID1',
            // initialized because alert flapped from unknown to new
            [ALERT_FLAPPING_HISTORY]: [true],
          })
        );

        expect(logger.debug).toHaveBeenNthCalledWith(
          2,
          `rule test:1: 'test-rule' has 5 active alerts: [{\"instanceId\":\"1\",\"actionGroup\":\"default\"},{\"instanceId\":\"2\",\"actionGroup\":\"default\"},{\"instanceId\":\"3\",\"actionGroup\":\"default\"},{\"instanceId\":\"4\",\"actionGroup\":\"default\"},{\"instanceId\":\"5\",\"actionGroup\":\"default\"}]`
        );

        if (shouldLogAlerts) {
          expect(ruleRunMetricsStore.setNumberOfNewAlerts).toHaveBeenCalledWith(2);
          expect(ruleRunMetricsStore.setNumberOfActiveAlerts).toHaveBeenCalledWith(5);

          testAlertingEventLogger([
            {
              action: EVENT_LOG_ACTIONS.newInstance,
              id: '4',
              group: 'default',
              state: {},
            },
            {
              action: EVENT_LOG_ACTIONS.newInstance,
              id: '5',
              group: 'default',
              state: {},
            },
            {
              action: EVENT_LOG_ACTIONS.activeInstance,
              group: 'default',
              state: {},
            },
            {
              action: EVENT_LOG_ACTIONS.activeInstance,
              id: '2',
              group: 'default',
              state: {},
            },
            {
              action: EVENT_LOG_ACTIONS.activeInstance,
              id: '3',
              group: 'default',
              state: {},
            },
            {
              action: EVENT_LOG_ACTIONS.activeInstance,
              id: '4',
              group: 'default',
              state: {},
            },
            {
              action: EVENT_LOG_ACTIONS.activeInstance,
              id: '5',
              group: 'default',
              state: {},
            },
          ]);
        } else {
          testAlertingEventLoggerNotCalled();
        }
      }
    );
  });
});
