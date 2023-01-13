/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { loggingSystemMock } from '@kbn/core/server/mocks';
import { UntypedNormalizedRuleType } from '../rule_type_registry';
import { AlertInstanceContext, RecoveredActionGroup } from '../types';
import { LegacyAlertsClient } from './legacy_alerts_client';
import {
  createAlertFactory,
  splitAlerts,
  getPublicAlertFactory,
} from '../alert/create_alert_factory';
import { Alert } from '../alert/alert';
import { alertingEventLoggerMock } from '../lib/alerting_event_logger/alerting_event_logger.mock';
import { ruleRunMetricsStoreMock } from '../lib/rule_run_metrics_store.mock';
import { categorizeAlerts, setFlappingLegacy } from '../lib';
import { logAlerts } from '../task_runner/log_alerts';

const scheduleActions = jest.fn();
const hasScheduledActions = jest.fn().mockReturnValue(true);
const replaceState = jest.fn(() => ({ scheduleActions, hasScheduledActions }));
const mockCreateAlert = jest.fn(() => ({ replaceState, scheduleActions, hasScheduledActions }));
const mockGetRecoveredAlerts = jest.fn().mockReturnValue([]);
const mockSetLimitReached = jest.fn();
const mockCreateAlertFactory = {
  create: mockCreateAlert,
  hasReachedAlertLimit: jest.fn().mockReturnValue(false),
  alertLimit: {
    getValue: jest.fn().mockReturnValue(1000),
    setLimitReached: mockSetLimitReached,
    checkLimitUsage: jest.fn(),
  },
  done: () => ({
    getRecoveredAlerts: mockGetRecoveredAlerts,
  }),
};
jest.mock('../alert/create_alert_factory', () => {
  const original = jest.requireActual('../alert/create_alert_factory');
  return {
    ...original,
    splitAlerts: jest.fn(),
    getPublicAlertFactory: jest.fn().mockImplementation(() => {
      return {
        create: mockCreateAlert,
        alertLimit: {
          getValue: jest.fn().mockReturnValue(1000),
          setLimitReached: mockSetLimitReached,
        },
        done: () => ({
          getRecoveredAlerts: mockGetRecoveredAlerts,
        }),
      };
    }),
    createAlertFactory: jest.fn().mockImplementation(() => mockCreateAlertFactory),
  };
});

jest.mock('../lib', () => {
  const original = jest.requireActual('../lib');
  return {
    ...original,
    categorizeAlerts: jest.fn(),
    setFlappingLegacy: jest.fn(),
  };
});

jest.mock('../task_runner/log_alerts', () => ({ logAlerts: jest.fn() }));

let logger: ReturnType<typeof loggingSystemMock['createLogger']>;
const alertingEventLogger = alertingEventLoggerMock.create();
const ruleRunMetricsStore = ruleRunMetricsStoreMock.create();

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
};

const testAlert1 = {
  state: { foo: 'bar' },
  meta: { flapping: false, flappingHistory: [false, false] },
};
const testAlert2 = {
  state: { any: 'value' },
  meta: {
    lastScheduledActions: {
      group: 'default',
      date: new Date(),
    },
  },
};

describe('Legacy Alerts Client', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    logger = loggingSystemMock.createLogger();
  });

  test('initialize() should create alert factory with given alerts', () => {
    const alertsClient = new LegacyAlertsClient({
      logger,
      maxAlerts: 1000,
      ruleType,
    });

    alertsClient.initialize(
      {
        '1': testAlert1,
        '2': testAlert2,
      },
      {}
    );

    expect(createAlertFactory).toHaveBeenCalledWith({
      alerts: {
        '1': new Alert<AlertInstanceContext, AlertInstanceContext>('1', testAlert1),
        '2': new Alert<AlertInstanceContext, AlertInstanceContext>('2', testAlert2),
      },
      logger,
      maxAlerts: 1000,
      canSetRecoveryContext: false,
    });
  });

  test('getExecutorServices() should call getPublicAlertFactory on alert factory', () => {
    const alertsClient = new LegacyAlertsClient({
      logger,
      maxAlerts: 1000,
      ruleType,
    });

    alertsClient.initialize(
      {
        '1': testAlert1,
        '2': testAlert2,
      },
      {}
    );

    alertsClient.getExecutorServices();
    expect(getPublicAlertFactory).toHaveBeenCalledWith(mockCreateAlertFactory);
  });

  test('checkLimitUsage() should pass through to alert factory function', () => {
    const alertsClient = new LegacyAlertsClient({
      logger,
      maxAlerts: 1000,
      ruleType,
    });

    alertsClient.initialize(
      {
        '1': testAlert1,
        '2': testAlert2,
      },
      {}
    );

    alertsClient.checkLimitUsage();
    expect(mockCreateAlertFactory.alertLimit.checkLimitUsage).toHaveBeenCalled();
  });

  test('hasReachedAlertLimit() should pass through to alert factory function', () => {
    const alertsClient = new LegacyAlertsClient({
      logger,
      maxAlerts: 1000,
      ruleType,
    });

    alertsClient.initialize(
      {
        '1': testAlert1,
        '2': testAlert2,
      },
      {}
    );

    alertsClient.hasReachedAlertLimit();
    expect(mockCreateAlertFactory.hasReachedAlertLimit).toHaveBeenCalled();
  });

  test('processAndLogAlerts() should call categorizeAlerts, setFlappingLegacy and logAlerts and store results', () => {
    (splitAlerts as jest.Mock).mockReturnValue({
      active: {
        '1': new Alert<AlertInstanceContext, AlertInstanceContext>('1', testAlert1),
        '2': new Alert<AlertInstanceContext, AlertInstanceContext>('2', testAlert2),
      },
      recovered: {},
    });
    (categorizeAlerts as jest.Mock).mockReturnValue({
      new: {},
      ongoing: {
        '1': new Alert<AlertInstanceContext, AlertInstanceContext>('1', testAlert1),
        '2': new Alert<AlertInstanceContext, AlertInstanceContext>('2', testAlert2),
      },
      recovered: {},
    });
    const alertsClient = new LegacyAlertsClient({
      logger,
      maxAlerts: 1000,
      ruleType,
    });

    alertsClient.initialize(
      {
        '1': testAlert1,
        '2': testAlert2,
      },
      {}
    );

    alertsClient.processAndLogAlerts({
      eventLogger: alertingEventLogger,
      ruleLabel: `ruleLogPrefix`,
      ruleRunMetricsStore,
      shouldLogAndScheduleActionsForAlerts: true,
    });

    const alert1 = new Alert<AlertInstanceContext, AlertInstanceContext, string>('1', testAlert1);
    alert1.scheduleActions('default');

    const alert2 = new Alert<AlertInstanceContext, AlertInstanceContext, string>('1', testAlert1);
    alert2.scheduleActions('default');

    expect(categorizeAlerts).toHaveBeenCalledWith({
      reportedAlerts: {
        active: {
          '1': new Alert<AlertInstanceContext, AlertInstanceContext>('1', testAlert1),
          '2': new Alert<AlertInstanceContext, AlertInstanceContext>('2', testAlert2),
        },
        recovered: {},
      },
      trackedAlerts: {
        active: {
          '1': new Alert<AlertInstanceContext, AlertInstanceContext>('1', testAlert1),
          '2': new Alert<AlertInstanceContext, AlertInstanceContext>('2', testAlert2),
        },
        recovered: {},
      },
      hasReachedAlertLimit: false,
      alertLimit: 1000,
    });

    expect(setFlappingLegacy).toHaveBeenCalledWith(
      {
        '1': new Alert<AlertInstanceContext, AlertInstanceContext>('1', testAlert1),
        '2': new Alert<AlertInstanceContext, AlertInstanceContext>('2', testAlert2),
      },
      {}
    );

    expect(logAlerts).toHaveBeenCalledWith({
      logger,
      alertingEventLogger,
      newAlerts: {},
      activeAlerts: {
        '1': new Alert<AlertInstanceContext, AlertInstanceContext>('1', testAlert1),
        '2': new Alert<AlertInstanceContext, AlertInstanceContext>('2', testAlert2),
      },
      recoveredAlerts: {},
      ruleLogPrefix: 'ruleLogPrefix',
      ruleRunMetricsStore,
      canSetRecoveryContext: false,
      shouldPersistAlerts: true,
    });

    expect(alertsClient.getProcessedAlerts('active')).toEqual({
      '1': new Alert<AlertInstanceContext, AlertInstanceContext>('1', testAlert1),
      '2': new Alert<AlertInstanceContext, AlertInstanceContext>('2', testAlert2),
    });
  });
});
