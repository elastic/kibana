/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import sinon from 'sinon';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import { UntypedNormalizedRuleType } from '../rule_type_registry';
import { RecoveredActionGroup } from '../types';
import { LegacyAlertsClient } from './legacy_alerts_client';
import { alertingEventLoggerMock } from '../lib/alerting_event_logger/alerting_event_logger.mock';
import { ruleRunMetricsStoreMock } from '../lib/rule_run_metrics_store.mock';
import { DATE_1970 } from '../task_runner/fixtures';
import { EVENT_LOG_ACTIONS } from '../plugin';

jest.mock('uuid', () => ({
  v4: () => 'UUID1',
}));

let logger: ReturnType<typeof loggingSystemMock['createLogger']>;
const alertingEventLogger = alertingEventLoggerMock.create();
const ruleRunMetricsStore = ruleRunMetricsStoreMock.create();

interface GeneratorParams {
  [key: string]: string | number | boolean | undefined | object[] | boolean[] | object;
}
const generateAlertOpts = ({ action, group, state, id }: GeneratorParams = {}) => {
  id = id ?? '1';
  let message: string = '';
  switch (action) {
    case EVENT_LOG_ACTIONS.newInstance:
      message = `test:abc: 'test rule' created new alert: '${id}'`;
      break;
    case EVENT_LOG_ACTIONS.activeInstance:
      message = `test:abc: 'test rule' active alert: '${id}' in actionGroup: '${group}'`;
      break;
    case EVENT_LOG_ACTIONS.recoveredInstance:
      message = `test:abc: 'test rule' alert '${id}' has recovered`;
      break;
  }
  return {
    action,
    id,
    message,
    state,
    ...(group ? { group } : {}),
    flapping: false,
  };
};

const testAlertingEventLogger = (calls: GeneratorParams[]) => {
  expect(alertingEventLogger.logAlert).toHaveBeenCalledTimes(calls.length);
  calls.forEach((call, index) => {
    expect(alertingEventLogger.logAlert).toHaveBeenNthCalledWith(
      index + 1,
      generateAlertOpts(call)
    );
  });
};

const testAlertingEventLoggerNotCalled = () => {
  expect(ruleRunMetricsStore.setNumberOfNewAlerts).not.toHaveBeenCalled();
  expect(ruleRunMetricsStore.setNumberOfActiveAlerts).not.toHaveBeenCalled();
  expect(ruleRunMetricsStore.setNumberOfRecoveredAlerts).not.toHaveBeenCalled();

  expect(alertingEventLogger.logAlert).not.toHaveBeenCalled();
};

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
  autoRecoverAlerts: true,
};

describe('Legacy Alerts Client', () => {
  let clock: sinon.SinonFakeTimers;

  beforeAll(() => {
    clock = sinon.useFakeTimers();
  });

  beforeEach(() => {
    clock.reset();
    jest.clearAllMocks();
    logger = loggingSystemMock.createLogger();
  });

  afterAll(() => clock.restore());

  describe('constructor', () => {
    test('should correctly set tracked active and recovered alerts', () => {
      const alertsClient = new LegacyAlertsClient({
        logger,
        maxAlerts: 10,
        ruleType,
        ruleLabel: `test:abc: 'test rule'`,
        activeAlertsFromState: {
          '1': {
            state: { start: '1969-12-30T00:00:00.000Z', duration: 33000 },
            meta: {
              flappingHistory: [true, true, false, false],
              lastScheduledActions: {
                group: 'default',
                date: new Date('1969-12-30T00:00:00.000Z'),
              },
              pendingRecoveredCount: 0,
              uuid: 'abc',
            },
          },
        },
        recoveredAlertsFromState: {
          '2': {
            state: {
              start: '1969-12-30T00:00:00.000Z',
              duration: '23423523',
              end: '1970-01-01T00:00:00.000Z',
            },
            meta: {
              flappingHistory: [true],
              pendingRecoveredCount: 3,
              uuid: 'xyz',
            },
          },
        },
        ruleTypeState: {},
      });

      const trackedAlerts = alertsClient.getTrackedAlerts();
      expect(trackedAlerts.active['1'].getUuid()).toEqual('abc');
      expect(trackedAlerts.active['1'].getState()).toEqual({
        start: '1969-12-30T00:00:00.000Z',
        duration: 33000,
      });
      expect(trackedAlerts.active['1'].getFlapping()).toEqual(false);
      expect(trackedAlerts.active['1'].getFlappingHistory()).toEqual([true, true, false, false]);
      expect(trackedAlerts.active['1'].getLastScheduledActions()).toEqual({
        group: 'default',
        date: new Date('1969-12-30T00:00:00.000Z'),
      });

      expect(trackedAlerts.recovered['2'].getUuid()).toEqual('xyz');
      expect(trackedAlerts.recovered['2'].getState()).toEqual({
        start: '1969-12-30T00:00:00.000Z',
        duration: '23423523',
        end: '1970-01-01T00:00:00.000Z',
      });
      expect(trackedAlerts.recovered['2'].getFlapping()).toEqual(false);
      expect(trackedAlerts.recovered['2'].getFlappingHistory()).toEqual([true]);
      expect(trackedAlerts.recovered['2'].getLastScheduledActions()).not.toBeDefined();
    });

    test('should use alert UUIDs from rule state if defined', () => {
      const alertsClient = new LegacyAlertsClient({
        logger,
        maxAlerts: 10,
        ruleType,
        ruleLabel: `test:abc: 'test rule'`,
        activeAlertsFromState: {
          '1': {
            state: { start: '1969-12-30T00:00:00.000Z', duration: 33000 },
            meta: {
              flappingHistory: [true, true, false, false],
              lastScheduledActions: {
                group: 'default',
                date: new Date('1969-12-30T00:00:00.000Z'),
              },
              pendingRecoveredCount: 0,
            },
          },
        },
        recoveredAlertsFromState: {
          '2': {
            state: {
              start: '1969-12-30T00:00:00.000Z',
              duration: '23423523',
              end: '1970-01-01T00:00:00.000Z',
            },
            meta: {
              flappingHistory: [true],
              pendingRecoveredCount: 3,
            },
          },
        },
        ruleTypeState: {
          trackedAlerts: {
            '1': {
              alertId: '1',
              alertUuid: 'uuidabcdefghilk',
            },
          },
        },
      });

      const trackedAlerts = alertsClient.getTrackedAlerts();
      expect(trackedAlerts.active['1'].getUuid()).toEqual('uuidabcdefghilk');
      expect(trackedAlerts.active['1'].getState()).toEqual({
        start: '1969-12-30T00:00:00.000Z',
        duration: 33000,
      });
      expect(trackedAlerts.active['1'].getFlapping()).toEqual(false);
      expect(trackedAlerts.active['1'].getFlappingHistory()).toEqual([true, true, false, false]);
      expect(trackedAlerts.active['1'].getLastScheduledActions()).toEqual({
        group: 'default',
        date: new Date('1969-12-30T00:00:00.000Z'),
      });

      expect(trackedAlerts.recovered['2'].getUuid()).not.toBeDefined();
      expect(trackedAlerts.recovered['2'].getState()).toEqual({
        start: '1969-12-30T00:00:00.000Z',
        duration: '23423523',
        end: '1970-01-01T00:00:00.000Z',
      });
      expect(trackedAlerts.recovered['2'].getFlapping()).toEqual(false);
      expect(trackedAlerts.recovered['2'].getFlappingHistory()).toEqual([true]);
      expect(trackedAlerts.recovered['2'].getLastScheduledActions()).not.toBeDefined();
    });
  });

  describe('processAndLogAlerts()', () => {
    const testParams: Array<{
      shouldLogAlerts: boolean;
    }> = [{ shouldLogAlerts: true }, { shouldLogAlerts: false }];

    test.each(testParams)(
      'should correctly process and log new alerts %s',
      async ({ shouldLogAlerts }) => {
        // Initialize with no tracked alerts so all reported alerts are new
        const alertsClient = new LegacyAlertsClient({
          logger,
          maxAlerts: 10,
          ruleType,
          ruleLabel: `test:abc: 'test rule'`,
          activeAlertsFromState: {},
          recoveredAlertsFromState: {},
          ruleTypeState: {},
        });

        const alertFactory = alertsClient.getExecutorServices();

        // Report an alert
        alertFactory.create('1').scheduleActions('default' as never, { foo: 'bar' });

        alertsClient.processAndLogAlerts({
          eventLogger: alertingEventLogger,
          shouldLogAlerts,
          ruleRunMetricsStore,
        });

        const newAlerts = alertsClient.getProcessedAlerts('new');
        expect(Object.keys(newAlerts)).toEqual(['1']);
        expect(newAlerts['1'].getFlapping()).toEqual(false);
        expect(newAlerts['1'].getFlappingHistory()).toEqual([true]);
        expect(newAlerts['1'].getState()).toEqual({
          duration: '0',
          start: '1970-01-01T00:00:00.000Z',
        });
        expect(newAlerts['1'].getContext()).toEqual({ foo: 'bar' });

        const activeAlerts = alertsClient.getProcessedAlerts('active');
        expect(newAlerts).toEqual(activeAlerts);
        expect(alertsClient.getProcessedAlerts('recovered')).toEqual({});
        expect(alertsClient.getProcessedAlerts('recoveredCurrent')).toEqual({});

        expect(logger.debug).toHaveBeenCalledTimes(1);
        expect(logger.debug).toHaveBeenNthCalledWith(
          1,
          `rule test:abc: 'test rule' has 1 active alerts: [{\"instanceId\":\"1\",\"actionGroup\":\"default\"}]`
        );

        expect(await alertsClient.getAlertsToSerialize()).toEqual({
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

        if (shouldLogAlerts) {
          expect(ruleRunMetricsStore.setNumberOfNewAlerts).toHaveBeenCalledWith(1);
          expect(ruleRunMetricsStore.setNumberOfActiveAlerts).toHaveBeenCalledWith(1);
          expect(ruleRunMetricsStore.setNumberOfRecoveredAlerts).toHaveBeenCalledWith(0);

          testAlertingEventLogger([
            {
              action: EVENT_LOG_ACTIONS.newInstance,
              group: 'default',
              state: { start: DATE_1970, duration: '0' },
            },
            {
              action: EVENT_LOG_ACTIONS.activeInstance,
              group: 'default',
              state: { start: DATE_1970, duration: '0' },
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
        // Initialize with a tracked recovered alert so reported alerts
        // are new but there is a tracked recovered alert that matches a reported alert
        const alertsClient = new LegacyAlertsClient({
          logger,
          maxAlerts: 10,
          ruleType,
          ruleLabel: `test:abc: 'test rule'`,
          activeAlertsFromState: {},
          recoveredAlertsFromState: {
            '1': { meta: { flappingHistory: [true, true, false, false] } },
          },
          ruleTypeState: {},
        });

        const alertFactory = alertsClient.getExecutorServices();

        // Report an alert
        alertFactory.create('1').scheduleActions('default' as never, { foo: 'bar' });

        alertsClient.processAndLogAlerts({
          eventLogger: alertingEventLogger,
          shouldLogAlerts,
          ruleRunMetricsStore,
        });

        const newAlerts = alertsClient.getProcessedAlerts('new');
        expect(Object.keys(newAlerts)).toEqual(['1']);
        expect(newAlerts['1'].getFlapping()).toEqual(false);
        expect(newAlerts['1'].getFlappingHistory()).toEqual([true, true, false, false, true]);
        expect(newAlerts['1'].getState()).toEqual({
          duration: '0',
          start: '1970-01-01T00:00:00.000Z',
        });
        expect(newAlerts['1'].getContext()).toEqual({ foo: 'bar' });

        const activeAlerts = alertsClient.getProcessedAlerts('active');
        expect(newAlerts).toEqual(activeAlerts);
        expect(alertsClient.getProcessedAlerts('recovered')).toEqual({});
        expect(alertsClient.getProcessedAlerts('recoveredCurrent')).toEqual({});

        expect(logger.debug).toHaveBeenCalledTimes(1);
        expect(logger.debug).toHaveBeenNthCalledWith(
          1,
          `rule test:abc: 'test rule' has 1 active alerts: [{\"instanceId\":\"1\",\"actionGroup\":\"default\"}]`
        );

        expect(await alertsClient.getAlertsToSerialize()).toEqual({
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

        if (shouldLogAlerts) {
          expect(ruleRunMetricsStore.setNumberOfNewAlerts).toHaveBeenCalledWith(1);
          expect(ruleRunMetricsStore.setNumberOfActiveAlerts).toHaveBeenCalledWith(1);
          expect(ruleRunMetricsStore.setNumberOfRecoveredAlerts).toHaveBeenCalledWith(0);

          testAlertingEventLogger([
            {
              action: EVENT_LOG_ACTIONS.newInstance,
              group: 'default',
              state: { start: DATE_1970, duration: '0' },
            },
            {
              action: EVENT_LOG_ACTIONS.activeInstance,
              group: 'default',
              state: { start: DATE_1970, duration: '0' },
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
        // Initialize with tracked active alerts
        const alertsClient = new LegacyAlertsClient({
          logger,
          maxAlerts: 10,
          ruleType,
          ruleLabel: `test:abc: 'test rule'`,
          activeAlertsFromState: {
            '1': {
              state: { start: '1969-12-30T00:00:00.000Z', duration: 33000 },
              meta: { flappingHistory: [true, true, false, false] },
            },
            '2': {
              state: { start: '1969-12-31T07:34:00.000Z', duration: 23532 },
            },
          },
          recoveredAlertsFromState: {},
          ruleTypeState: {},
        });

        const alertFactory = alertsClient.getExecutorServices();

        // Report some alerts so we have 2 ongoing and 1 new
        alertFactory.create('1').scheduleActions('default' as never, { foo: 'bar' });
        alertFactory.create('2').scheduleActions('default' as never, { foo: 'cheese' });
        alertFactory.create('3').scheduleActions('default' as never, { foo: 'lemon' });

        alertsClient.processAndLogAlerts({
          eventLogger: alertingEventLogger,
          shouldLogAlerts,
          ruleRunMetricsStore,
        });

        const newAlerts = alertsClient.getProcessedAlerts('new');
        expect(Object.keys(newAlerts)).toEqual(['3']);

        const activeAlerts = alertsClient.getProcessedAlerts('active');
        expect(Object.keys(activeAlerts)).toEqual(['1', '2', '3']);
        expect(activeAlerts['1'].getFlapping()).toEqual(false);
        expect(activeAlerts['1'].getFlappingHistory()).toEqual([true, true, false, false, false]);
        expect(activeAlerts['1'].getState()).toEqual({
          duration: '172800000000000',
          start: '1969-12-30T00:00:00.000Z',
        });
        expect(activeAlerts['1'].getContext()).toEqual({ foo: 'bar' });
        expect(activeAlerts['2'].getFlapping()).toEqual(false);
        expect(activeAlerts['2'].getFlappingHistory()).toEqual([false]);
        expect(activeAlerts['2'].getState()).toEqual({
          duration: '59160000000000',
          start: '1969-12-31T07:34:00.000Z',
        });
        expect(activeAlerts['2'].getContext()).toEqual({ foo: 'cheese' });

        expect(alertsClient.getProcessedAlerts('recovered')).toEqual({});
        expect(alertsClient.getProcessedAlerts('recoveredCurrent')).toEqual({});

        expect(logger.debug).toHaveBeenCalledTimes(1);
        expect(logger.debug).toHaveBeenNthCalledWith(
          1,
          `rule test:abc: 'test rule' has 3 active alerts: [{\"instanceId\":\"1\",\"actionGroup\":\"default\"},{\"instanceId\":\"2\",\"actionGroup\":\"default\"},{\"instanceId\":\"3\",\"actionGroup\":\"default\"}]`
        );

        expect(await alertsClient.getAlertsToSerialize()).toEqual({
          alertsToReturn: {
            '1': {
              meta: {
                flapping: false,
                flappingHistory: [true, true, false, false, false],
                pendingRecoveredCount: 0,
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

        if (shouldLogAlerts) {
          expect(ruleRunMetricsStore.setNumberOfActiveAlerts).toHaveBeenCalledWith(3);
          expect(ruleRunMetricsStore.setNumberOfRecoveredAlerts).toHaveBeenCalledWith(0);

          testAlertingEventLogger([
            {
              action: EVENT_LOG_ACTIONS.newInstance,
              id: '3',
              group: 'default',
              state: { start: DATE_1970, duration: '0' },
            },
            {
              action: EVENT_LOG_ACTIONS.activeInstance,
              group: 'default',
              state: { start: '1969-12-30T00:00:00.000Z', duration: '172800000000000' },
            },
            {
              action: EVENT_LOG_ACTIONS.activeInstance,
              id: '2',
              group: 'default',
              state: { start: '1969-12-31T07:34:00.000Z', duration: '59160000000000' },
            },
            {
              action: EVENT_LOG_ACTIONS.activeInstance,
              id: '3',
              group: 'default',
              state: { start: DATE_1970, duration: '0' },
            },
          ]);
        } else {
          testAlertingEventLoggerNotCalled();
        }
      }
    );

    test.each(testParams)(
      'should use UUIDs from tracked alerts if available for ongoing alerts %s',
      async ({ shouldLogAlerts }) => {
        // Initialize with tracked active alerts and tracked lifecycle alerts with UUID
        const alertsClient = new LegacyAlertsClient({
          logger,
          maxAlerts: 10,
          ruleType,
          ruleLabel: `test:abc: 'test rule'`,
          activeAlertsFromState: {
            '1': {
              state: { start: '1969-12-30T00:00:00.000Z', duration: 33000 },
              meta: { flappingHistory: [true, true, false, false] },
            },
            '2': {
              state: { start: '1969-12-31T07:34:00.000Z', duration: 23532 },
            },
          },
          recoveredAlertsFromState: {},
          ruleTypeState: {
            trackedAlerts: {
              '1': {
                alertId: '1',
                alertUuid: 'abcdefghijklmnop',
              },
              '2': {
                alertId: '2',
                alertUuid: 'xyz123455',
              },
            },
          },
        });

        const alertFactory = alertsClient.getExecutorServices();

        // Report some alerts so we have 2 ongoing and 1 new
        alertFactory.create('1').scheduleActions('default' as never, { foo: 'bar' });
        alertFactory.create('2').scheduleActions('default' as never, { foo: 'cheese' });
        alertFactory.create('3').scheduleActions('default' as never, { foo: 'lemon' });

        alertsClient.processAndLogAlerts({
          eventLogger: alertingEventLogger,
          shouldLogAlerts,
          ruleRunMetricsStore,
        });

        const newAlerts = alertsClient.getProcessedAlerts('new');
        expect(Object.keys(newAlerts)).toEqual(['3']);

        const activeAlerts = alertsClient.getProcessedAlerts('active');
        expect(Object.keys(activeAlerts)).toEqual(['1', '2', '3']);
        expect(activeAlerts['1'].getFlapping()).toEqual(false);
        expect(activeAlerts['1'].getFlappingHistory()).toEqual([true, true, false, false, false]);
        expect(activeAlerts['1'].getState()).toEqual({
          duration: '172800000000000',
          start: '1969-12-30T00:00:00.000Z',
        });
        expect(activeAlerts['1'].getContext()).toEqual({ foo: 'bar' });
        expect(activeAlerts['1'].getUuid()).toEqual('abcdefghijklmnop');
        expect(activeAlerts['2'].getFlapping()).toEqual(false);
        expect(activeAlerts['2'].getFlappingHistory()).toEqual([false]);
        expect(activeAlerts['2'].getState()).toEqual({
          duration: '59160000000000',
          start: '1969-12-31T07:34:00.000Z',
        });
        expect(activeAlerts['2'].getContext()).toEqual({ foo: 'cheese' });
        expect(activeAlerts['2'].getUuid()).toEqual('xyz123455');

        expect(alertsClient.getProcessedAlerts('recovered')).toEqual({});
        expect(alertsClient.getProcessedAlerts('recoveredCurrent')).toEqual({});

        expect(logger.debug).toHaveBeenCalledTimes(1);
        expect(logger.debug).toHaveBeenNthCalledWith(
          1,
          `rule test:abc: 'test rule' has 3 active alerts: [{\"instanceId\":\"1\",\"actionGroup\":\"default\"},{\"instanceId\":\"2\",\"actionGroup\":\"default\"},{\"instanceId\":\"3\",\"actionGroup\":\"default\"}]`
        );

        expect(await alertsClient.getAlertsToSerialize()).toEqual({
          alertsToReturn: {
            '1': {
              meta: {
                flapping: false,
                flappingHistory: [true, true, false, false, false],
                pendingRecoveredCount: 0,
                uuid: 'abcdefghijklmnop',
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
                uuid: 'xyz123455',
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

        if (shouldLogAlerts) {
          expect(ruleRunMetricsStore.setNumberOfActiveAlerts).toHaveBeenCalledWith(3);
          expect(ruleRunMetricsStore.setNumberOfRecoveredAlerts).toHaveBeenCalledWith(0);

          testAlertingEventLogger([
            {
              action: EVENT_LOG_ACTIONS.newInstance,
              id: '3',
              group: 'default',
              state: { start: DATE_1970, duration: '0' },
            },
            {
              action: EVENT_LOG_ACTIONS.activeInstance,
              group: 'default',
              state: { start: '1969-12-30T00:00:00.000Z', duration: '172800000000000' },
            },
            {
              action: EVENT_LOG_ACTIONS.activeInstance,
              id: '2',
              group: 'default',
              state: { start: '1969-12-31T07:34:00.000Z', duration: '59160000000000' },
            },
            {
              action: EVENT_LOG_ACTIONS.activeInstance,
              id: '3',
              group: 'default',
              state: { start: DATE_1970, duration: '0' },
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
        // Initialize with tracked active alerts
        const alertsClient = new LegacyAlertsClient({
          logger,
          maxAlerts: 10,
          ruleType: { ...ruleType, doesSetRecoveryContext: true },
          ruleLabel: `test:abc: 'test rule'`,
          activeAlertsFromState: {
            '1': {
              state: { start: '1969-12-30T00:00:00.000Z', duration: 33000 },
              meta: { flappingHistory: [true, true, false, false] },
            },
            '2': {
              state: { start: '1969-12-31T07:34:00.000Z', duration: 23532 },
            },
          },
          recoveredAlertsFromState: {},
          ruleTypeState: {},
        });

        const alertFactory = alertsClient.getExecutorServices();

        // Set context for recovered alerts
        const { getRecoveredAlerts } = alertFactory.done();
        for (const alert of getRecoveredAlerts()) {
          alert.setContext({ foo: `alert${alert.getId()}` });
        }

        alertsClient.processAndLogAlerts({
          eventLogger: alertingEventLogger,
          shouldLogAlerts,
          ruleRunMetricsStore,
        });

        expect(alertsClient.getProcessedAlerts('new')).toEqual({});
        expect(alertsClient.getProcessedAlerts('active')).toEqual({});

        const recoveredCurrentAlerts = alertsClient.getProcessedAlerts('recoveredCurrent');
        expect(Object.keys(recoveredCurrentAlerts)).toEqual(['1', '2']);
        expect(recoveredCurrentAlerts['1'].getFlapping()).toEqual(false);
        expect(recoveredCurrentAlerts['1'].getFlappingHistory()).toEqual([
          true,
          true,
          false,
          false,
          true,
        ]);
        expect(recoveredCurrentAlerts['1'].getState()).toEqual({
          duration: '172800000000000',
          end: '1970-01-01T00:00:00.000Z',
          start: '1969-12-30T00:00:00.000Z',
        });
        expect(recoveredCurrentAlerts['1'].getContext()).toEqual({ foo: 'alert1' });
        expect(recoveredCurrentAlerts['2'].getFlapping()).toEqual(false);
        expect(recoveredCurrentAlerts['2'].getFlappingHistory()).toEqual([true]);
        expect(recoveredCurrentAlerts['2'].getState()).toEqual({
          duration: '59160000000000',
          end: '1970-01-01T00:00:00.000Z',
          start: '1969-12-31T07:34:00.000Z',
        });
        expect(recoveredCurrentAlerts['2'].getContext()).toEqual({ foo: 'alert2' });

        const recoveredAlerts = alertsClient.getProcessedAlerts('recovered');
        expect(recoveredAlerts).toEqual(recoveredCurrentAlerts);

        expect(logger.debug).toHaveBeenCalledTimes(1);
        expect(logger.debug).toHaveBeenNthCalledWith(
          1,
          `rule test:abc: 'test rule' has 2 recovered alerts: [\"1\",\"2\"]`
        );

        expect(await alertsClient.getAlertsToSerialize()).toEqual({
          alertsToReturn: {},
          recoveredAlertsToReturn: {
            '1': {
              meta: {
                flapping: false,
                flappingHistory: [true, true, false, false, true],
              },
            },
            '2': {
              meta: {
                flapping: false,
                flappingHistory: [true],
              },
            },
          },
        });

        if (shouldLogAlerts) {
          expect(ruleRunMetricsStore.setNumberOfRecoveredAlerts).toHaveBeenCalledWith(2);

          testAlertingEventLogger([
            {
              action: EVENT_LOG_ACTIONS.recoveredInstance,
              state: {
                start: '1969-12-30T00:00:00.000Z',
                end: DATE_1970,
                duration: '172800000000000',
              },
            },
            {
              action: EVENT_LOG_ACTIONS.recoveredInstance,
              id: '2',
              state: {
                start: '1969-12-31T07:34:00.000Z',
                end: DATE_1970,
                duration: '59160000000000',
              },
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
        // Initialize with tracked active and recovered alerts
        const alertsClient = new LegacyAlertsClient({
          logger,
          maxAlerts: 10,
          ruleType: { ...ruleType, doesSetRecoveryContext: true },
          ruleLabel: `test:abc: 'test rule'`,
          activeAlertsFromState: {
            '1': {
              state: { start: '1969-12-30T00:00:00.000Z', duration: 33000 },
              meta: { flappingHistory: [true, true, false, false] },
            },
            '2': {
              state: { start: '1969-12-31T07:34:00.000Z', duration: 23532 },
            },
          },
          recoveredAlertsFromState: {
            '3': {
              state: {
                start: '1969-12-31T07:34:00.000Z',
                duration: 33000,
                end: '1969-12-31T14:34:00.000Z',
              },
              meta: { flappingHistory: [false, false] },
            },
          },
          ruleTypeState: {},
        });

        const alertFactory = alertsClient.getExecutorServices();

        // Set context for recovered alerts
        const { getRecoveredAlerts } = alertFactory.done();
        for (const alert of getRecoveredAlerts()) {
          alert.setContext({ foo: `alert${alert.getId()}` });
        }

        alertsClient.processAndLogAlerts({
          eventLogger: alertingEventLogger,
          shouldLogAlerts,
          ruleRunMetricsStore,
        });

        expect(alertsClient.getProcessedAlerts('new')).toEqual({});
        expect(alertsClient.getProcessedAlerts('active')).toEqual({});

        const recoveredCurrentAlerts = alertsClient.getProcessedAlerts('recoveredCurrent');
        expect(Object.keys(recoveredCurrentAlerts)).toEqual(['1', '2']);

        const recoveredAlerts = alertsClient.getProcessedAlerts('recovered');
        expect(Object.keys(recoveredAlerts)).toEqual(['1', '2', '3']);

        expect(recoveredAlerts['1'].getFlapping()).toEqual(false);
        expect(recoveredAlerts['1'].getFlappingHistory()).toEqual([true, true, false, false, true]);
        expect(recoveredAlerts['1'].getState()).toEqual({
          duration: '172800000000000',
          end: '1970-01-01T00:00:00.000Z',
          start: '1969-12-30T00:00:00.000Z',
        });
        expect(recoveredAlerts['1'].getContext()).toEqual({ foo: 'alert1' });
        expect(recoveredAlerts['2'].getFlapping()).toEqual(false);
        expect(recoveredAlerts['2'].getFlappingHistory()).toEqual([true]);
        expect(recoveredAlerts['2'].getState()).toEqual({
          duration: '59160000000000',
          end: '1970-01-01T00:00:00.000Z',
          start: '1969-12-31T07:34:00.000Z',
        });
        expect(recoveredAlerts['2'].getContext()).toEqual({ foo: 'alert2' });
        expect(recoveredAlerts['3'].getFlapping()).toEqual(false);
        expect(recoveredAlerts['3'].getFlappingHistory()).toEqual([false, false, false]);
        expect(recoveredAlerts['3'].getState()).toEqual({
          start: '1969-12-31T07:34:00.000Z',
          duration: 33000,
          end: '1969-12-31T14:34:00.000Z',
        });
        expect(recoveredAlerts['3'].getContext()).toEqual({});

        expect(logger.debug).toHaveBeenCalledTimes(1);
        expect(logger.debug).toHaveBeenNthCalledWith(
          1,
          `rule test:abc: 'test rule' has 2 recovered alerts: [\"1\",\"2\"]`
        );

        expect(await alertsClient.getAlertsToSerialize()).toEqual({
          alertsToReturn: {},
          recoveredAlertsToReturn: {
            '1': {
              meta: {
                flapping: false,
                flappingHistory: [true, true, false, false, true],
              },
            },
            '2': {
              meta: {
                flapping: false,
                flappingHistory: [true],
              },
            },
          },
        });

        if (shouldLogAlerts) {
          expect(ruleRunMetricsStore.setNumberOfRecoveredAlerts).toHaveBeenCalledWith(2);

          testAlertingEventLogger([
            {
              action: EVENT_LOG_ACTIONS.recoveredInstance,
              state: {
                start: '1969-12-30T00:00:00.000Z',
                end: DATE_1970,
                duration: '172800000000000',
              },
            },
            {
              action: EVENT_LOG_ACTIONS.recoveredInstance,
              id: '2',
              state: {
                start: '1969-12-31T07:34:00.000Z',
                end: DATE_1970,
                duration: '59160000000000',
              },
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
        // Initialize with tracked active and recovered alerts
        const alertsClient = new LegacyAlertsClient({
          logger,
          maxAlerts: 5,
          ruleType: { ...ruleType, doesSetRecoveryContext: true },
          ruleLabel: `test:abc: 'test rule'`,
          activeAlertsFromState: {
            '1': {
              state: { start: '1969-12-30T00:00:00.000Z', duration: 33000 },
              meta: { flappingHistory: [true, true, false, false] },
            },
            '2': {
              state: { start: '1969-12-31T07:34:00.000Z', duration: 23532 },
            },
            '3': {
              state: { start: '1969-12-31T14:55:00.000Z', duration: 23532 },
              meta: { flappingHistory: [false] },
            },
          },
          recoveredAlertsFromState: {
            '4': {
              state: {
                start: '1969-12-31T07:34:00.000Z',
                duration: 33000,
                end: '1969-12-31T14:34:00.000Z',
              },
              meta: { flappingHistory: [false, false] },
            },
          },
          ruleTypeState: {},
        });

        const alertFactory = alertsClient.getExecutorServices();

        // Create enough alerts to hit the limit
        alertFactory.create('1').scheduleActions('default' as never, { foo: 'penguins' });
        alertFactory.create('4').scheduleActions('default' as never, { foo: 'koalas' });
        alertFactory.create('5').scheduleActions('default' as never, { foo: 'pandas' });
        alertFactory.create('6').scheduleActions('default' as never, { foo: 'emus' });
        alertFactory.create('7').scheduleActions('default' as never, { foo: 'ocelots' });
        expect(() => {
          alertFactory.create('7').scheduleActions('default' as never, { foo: 'kangaroos' });
        }).toThrowErrorMatchingInlineSnapshot(`"Rule reported more than 5 alerts."`);

        expect(alertsClient.hasReachedAlertLimit()).toEqual(true);

        alertsClient.processAndLogAlerts({
          eventLogger: alertingEventLogger,
          shouldLogAlerts,
          ruleRunMetricsStore,
        });

        const activeAlerts = alertsClient.getProcessedAlerts('active');
        // Active alerts should contain all tracked active ids even if they were not reported
        expect(Object.keys(activeAlerts)).toEqual(['1', '2', '3', '4', '5']);

        const newAlerts = alertsClient.getProcessedAlerts('new');
        // New alerts contains just some of the new reported alerts bc we hit the limit
        expect(Object.keys(newAlerts)).toEqual(['4', '5']);

        // Recovered alerts should contain nothing
        expect(alertsClient.getProcessedAlerts('recovered')).toEqual({});
        expect(alertsClient.getProcessedAlerts('recoveredCurrent')).toEqual({});

        expect(activeAlerts['1'].getFlapping()).toEqual(false);
        expect(activeAlerts['1'].getFlappingHistory()).toEqual([true, true, false, false, false]);
        expect(activeAlerts['1'].getState()).toEqual({
          duration: '172800000000000',
          start: '1969-12-30T00:00:00.000Z',
        });
        expect(activeAlerts['1'].getContext()).toEqual({ foo: 'penguins' });
        expect(activeAlerts['2'].getFlapping()).toEqual(false);
        expect(activeAlerts['2'].getFlappingHistory()).toEqual([false]);
        expect(activeAlerts['2'].getState()).toEqual({
          duration: '59160000000000',
          start: '1969-12-31T07:34:00.000Z',
        });
        expect(activeAlerts['2'].getContext()).toEqual({});
        expect(activeAlerts['3'].getFlapping()).toEqual(false);
        expect(activeAlerts['3'].getFlappingHistory()).toEqual([false, false]);
        expect(activeAlerts['3'].getState()).toEqual({
          start: '1969-12-31T14:55:00.000Z',
          duration: '32700000000000',
        });
        expect(activeAlerts['3'].getContext()).toEqual({});
        expect(activeAlerts['4'].getFlapping()).toEqual(false);
        expect(activeAlerts['4'].getFlappingHistory()).toEqual([false, false, true]);
        expect(activeAlerts['4'].getState()).toEqual({
          start: '1970-01-01T00:00:00.000Z',
          duration: '0',
        });
        expect(activeAlerts['4'].getContext()).toEqual({ foo: 'koalas' });
        expect(activeAlerts['5'].getFlapping()).toEqual(false);
        expect(activeAlerts['5'].getFlappingHistory()).toEqual([true]);
        expect(activeAlerts['5'].getState()).toEqual({
          start: '1970-01-01T00:00:00.000Z',
          duration: '0',
        });
        expect(activeAlerts['5'].getContext()).toEqual({ foo: 'pandas' });

        expect(logger.debug).toHaveBeenCalledTimes(1);
        expect(logger.debug).toHaveBeenNthCalledWith(
          1,
          `rule test:abc: 'test rule' has 5 active alerts: [{\"instanceId\":\"1\",\"actionGroup\":\"default\"},{\"instanceId\":\"2\"},{\"instanceId\":\"3\"},{\"instanceId\":\"4\",\"actionGroup\":\"default\"},{\"instanceId\":\"5\",\"actionGroup\":\"default\"}]`
        );

        expect(await alertsClient.getAlertsToSerialize()).toEqual({
          alertsToReturn: {
            '1': {
              meta: {
                flapping: false,
                flappingHistory: [true, true, false, false, false],
                pendingRecoveredCount: 0,
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
              },
              state: {
                duration: '59160000000000',
                start: '1969-12-31T07:34:00.000Z',
              },
            },
            '3': {
              meta: {
                flapping: false,
                flappingHistory: [false, false],
                pendingRecoveredCount: 0,
              },
              state: {
                duration: '32700000000000',
                start: '1969-12-31T14:55:00.000Z',
              },
            },
            '4': {
              meta: {
                flapping: false,
                flappingHistory: [false, false, true],
                pendingRecoveredCount: 0,
                uuid: 'UUID1',
              },
              state: {
                duration: '0',
                start: '1970-01-01T00:00:00.000Z',
              },
            },
            '5': {
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

        if (shouldLogAlerts) {
          expect(ruleRunMetricsStore.setNumberOfNewAlerts).toHaveBeenCalledWith(2);
          expect(ruleRunMetricsStore.setNumberOfActiveAlerts).toHaveBeenCalledWith(5);

          testAlertingEventLogger([
            {
              action: EVENT_LOG_ACTIONS.newInstance,
              id: '4',
              group: 'default',
              state: { start: DATE_1970, duration: '0' },
            },
            {
              action: EVENT_LOG_ACTIONS.newInstance,
              id: '5',
              group: 'default',
              state: { start: DATE_1970, duration: '0' },
            },
            {
              action: EVENT_LOG_ACTIONS.activeInstance,
              group: 'default',
              state: { duration: '172800000000000', start: '1969-12-30T00:00:00.000Z' },
            },
            {
              action: EVENT_LOG_ACTIONS.activeInstance,
              id: '2',
              state: { duration: '59160000000000', start: '1969-12-31T07:34:00.000Z' },
            },
            {
              action: EVENT_LOG_ACTIONS.activeInstance,
              id: '3',
              state: { duration: '32700000000000', start: '1969-12-31T14:55:00.000Z' },
            },
            {
              action: EVENT_LOG_ACTIONS.activeInstance,
              id: '4',
              group: 'default',
              state: { start: DATE_1970, duration: '0' },
            },
            {
              action: EVENT_LOG_ACTIONS.activeInstance,
              id: '5',
              group: 'default',
              state: { start: DATE_1970, duration: '0' },
            },
          ]);
        } else {
          testAlertingEventLoggerNotCalled();
        }
      }
    );
  });

  describe('getAlertsToSerialize()', () => {
    test('should return all active alerts to serialize', async () => {
      // Initialize with tracked active alerts
      const alertsClient = new LegacyAlertsClient({
        logger,
        maxAlerts: 10,
        ruleType,
        ruleLabel: `test:abc: 'test rule'`,
        activeAlertsFromState: {
          '1': {
            state: { start: '1969-12-30T00:00:00.000Z', duration: 33000 },
            meta: { flappingHistory: [true, true, false, false] },
          },
          '2': {
            state: { start: '1969-12-31T07:34:00.000Z', duration: 23532 },
          },
        },
        recoveredAlertsFromState: {},
        ruleTypeState: {},
      });

      const alertFactory = alertsClient.getExecutorServices();

      // Report some alerts so we have 2 ongoing and 1 new
      alertFactory.create('1').scheduleActions('default' as never, { foo: 'bar' });
      alertFactory.create('2').scheduleActions('default' as never, { foo: 'cheese' });
      alertFactory.create('3').scheduleActions('default' as never, { foo: 'lemon' });

      alertsClient.processAndLogAlerts({
        eventLogger: alertingEventLogger,
        shouldLogAlerts: false,
        ruleRunMetricsStore,
      });

      const activeAlerts = alertsClient.getProcessedAlerts('active');

      const { alertsToReturn } = await alertsClient.getAlertsToSerialize();
      expect(Object.keys(activeAlerts)).toEqual(Object.keys(alertsToReturn));
      expect(alertsToReturn).toEqual({
        '1': {
          meta: {
            flapping: false,
            flappingHistory: [true, true, false, false, false],
            pendingRecoveredCount: 0,
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
      });
    });

    test('should return recovered alerts only if they have been reported as recovered greater than the configured amount', async () => {
      // this flapping history pattern ensures that flapping is set to true
      const flapping = new Array(16).fill(false).concat([true, true, true, true]);

      // this flapping history pattern ensures that flapping is set to false
      const notFlapping = new Array(20).fill(false);

      // Initialize with tracked active and recovered alerts
      const alertsClient = new LegacyAlertsClient({
        logger,
        maxAlerts: 10,
        ruleType: { ...ruleType, doesSetRecoveryContext: true },
        ruleLabel: `test:abc: 'test rule'`,
        activeAlertsFromState: {
          '1': {
            state: { start: '1969-12-30T00:00:00.000Z', duration: 33000 },
            meta: { flappingHistory: flapping, pendingRecoveredCount: 3 },
          },
          '2': {
            state: { start: '1969-12-31T07:34:00.000Z', duration: 23532 },
            meta: { flappingHistory: flapping, pendingRecoveredCount: 0 },
          },
        },
        recoveredAlertsFromState: {
          '3': {
            state: {
              start: '1969-12-31T07:34:00.000Z',
              duration: 33000,
              end: '1969-12-31T14:34:00.000Z',
            },
            meta: { flappingHistory: notFlapping, pendingRecoveredCount: 0 },
          },
        },
        ruleTypeState: {},
      });

      const alertFactory = alertsClient.getExecutorServices();

      // Set context for recovered alerts
      const { getRecoveredAlerts } = alertFactory.done();
      for (const alert of getRecoveredAlerts()) {
        alert.setContext({ foo: `alert${alert.getId()}` });
      }

      alertsClient.processAndLogAlerts({
        eventLogger: alertingEventLogger,
        shouldLogAlerts: false,
        ruleRunMetricsStore,
      });

      // Only the alerts considered recovered in this execution
      const recoveredAlerts = alertsClient.getProcessedAlerts('recoveredCurrent');
      expect(Object.keys(recoveredAlerts)).toEqual(['1']);

      // '2' is marked as active even though it's recovered because its flapping
      // history indicates it is flapping and the number of times it has recovered
      // hasn't met the configured minimum
      const activeAlerts = alertsClient.getProcessedAlerts('active');
      expect(Object.keys(activeAlerts)).toEqual(['2']);

      // We serialize both alerts considered recovered in this execution and any
      // recovered alerts we're tracking (as long as they are not flapping)
      const { recoveredAlertsToReturn } = await alertsClient.getAlertsToSerialize();
      expect(Object.keys(recoveredAlertsToReturn)).toEqual(['1']);
      expect(recoveredAlertsToReturn).toEqual({
        '1': {
          meta: {
            flapping: true,
            flappingHistory: [...flapping, true].slice(1),
          },
        },
      });
    });
  });
});
