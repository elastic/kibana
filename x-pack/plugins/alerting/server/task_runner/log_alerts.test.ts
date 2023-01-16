/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { Alert } from '../alert';
import { alertingEventLoggerMock } from '../lib/alerting_event_logger/alerting_event_logger.mock';
import { RuleRunMetricsStore } from '../lib/rule_run_metrics_store';
import { logAlerts } from './log_alerts';

const logger: ReturnType<typeof loggingSystemMock.createLogger> = loggingSystemMock.createLogger();
const alertingEventLogger = alertingEventLoggerMock.create();

describe('logAlerts', () => {
  let ruleRunMetricsStore: RuleRunMetricsStore;

  beforeEach(() => {
    jest.resetAllMocks();
    ruleRunMetricsStore = new RuleRunMetricsStore();
  });

  test('should debug log active alerts if they exist', () => {
    logAlerts({
      logger,
      alertingEventLogger,
      newAlerts: {},
      activeAlerts: {
        '1': new Alert<{}, {}>('1'),
        '2': new Alert<{}, {}>('2'),
      },
      recoveredAlerts: {},
      ruleLogPrefix: `test-rule-type-id:123: 'test rule'`,
      ruleRunMetricsStore,
      canSetRecoveryContext: false,
      shouldPersistAlerts: true,
    });

    expect(logger.debug).toHaveBeenCalledTimes(1);
    expect(logger.debug).toHaveBeenNthCalledWith(
      1,
      `rule test-rule-type-id:123: 'test rule' has 2 active alerts: [{\"instanceId\":\"1\"},{\"instanceId\":\"2\"}]`
    );
  });

  test('should debug log recovered alerts if they exist', () => {
    logAlerts({
      logger,
      alertingEventLogger,
      newAlerts: {},
      activeAlerts: {
        '1': new Alert<{}, {}>('1'),
        '2': new Alert<{}, {}>('2'),
      },
      recoveredAlerts: {
        '8': new Alert<{}, {}>('8'),
      },
      ruleLogPrefix: `test-rule-type-id:123: 'test rule'`,
      ruleRunMetricsStore,
      canSetRecoveryContext: false,
      shouldPersistAlerts: true,
    });

    expect(logger.debug).toHaveBeenCalledTimes(2);
    expect(logger.debug).toHaveBeenNthCalledWith(
      1,
      `rule test-rule-type-id:123: 'test rule' has 2 active alerts: [{\"instanceId\":\"1\"},{\"instanceId\":\"2\"}]`
    );
    expect(logger.debug).toHaveBeenNthCalledWith(
      2,
      `rule test-rule-type-id:123: 'test rule' has 1 recovered alerts: [\"8\"]`
    );
  });

  test('should correctly debug log recovered alerts if canSetRecoveryContext is true', () => {
    const recoveredAlert1 = new Alert<{ value: string }, {}>('8');
    const recoveredAlert2 = new Alert<{ value: string }, {}>('9');
    const recoveredAlerts = {
      '8': recoveredAlert1,
      '9': recoveredAlert2,
    };

    recoveredAlerts['8'].setContext({ value: 'hey' });
    logAlerts({
      logger,
      alertingEventLogger,
      newAlerts: {},
      activeAlerts: {},
      recoveredAlerts,
      ruleLogPrefix: `test-rule-type-id:123: 'test rule'`,
      ruleRunMetricsStore,
      canSetRecoveryContext: true,
      shouldPersistAlerts: true,
    });

    expect(logger.debug).toHaveBeenCalledTimes(2);
    expect(logger.debug).toHaveBeenNthCalledWith(
      1,
      `rule test-rule-type-id:123: 'test rule' has 2 recovered alerts: [\"8\",\"9\"]`
    );
    expect(logger.debug).toHaveBeenNthCalledWith(
      2,
      `rule test-rule-type-id:123: 'test rule' has no recovery context specified for recovered alert 9`
    );
  });

  test('should not debug log if no alerts', () => {
    logAlerts({
      logger,
      alertingEventLogger,
      newAlerts: {},
      activeAlerts: {},
      recoveredAlerts: {},
      ruleLogPrefix: `test-rule-type-id:123: 'test rule'`,
      ruleRunMetricsStore,
      canSetRecoveryContext: true,
      shouldPersistAlerts: true,
    });

    expect(logger.debug).not.toHaveBeenCalled();
  });

  test('should correctly set values in ruleRunMetricsStore and call alertingEventLogger.logAlert if shouldPersistAlerts is true', () => {
    logAlerts({
      logger,
      alertingEventLogger,
      newAlerts: {
        '4': new Alert<{}, {}>('4'),
      },
      activeAlerts: {
        '1': new Alert<{}, {}>('1'),
        '2': new Alert<{}, {}>('2'),
        '4': new Alert<{}, {}>('4'),
      },
      recoveredAlerts: {
        '7': new Alert<{}, {}>('7'),
        '8': new Alert<{}, {}>('8'),
        '9': new Alert<{}, {}>('9'),
        '10': new Alert<{}, {}>('10'),
      },
      ruleLogPrefix: `test-rule-type-id:123: 'test rule'`,
      ruleRunMetricsStore,
      canSetRecoveryContext: false,
      shouldPersistAlerts: true,
    });

    expect(ruleRunMetricsStore.getNumberOfNewAlerts()).toEqual(1);
    expect(ruleRunMetricsStore.getNumberOfActiveAlerts()).toEqual(3);
    expect(ruleRunMetricsStore.getNumberOfRecoveredAlerts()).toEqual(4);

    expect(alertingEventLogger.logAlert).toHaveBeenCalledTimes(8);

    expect(alertingEventLogger.logAlert).toHaveBeenNthCalledWith(1, {
      action: 'recovered-instance',
      id: '7',
      message: "test-rule-type-id:123: 'test rule' alert '7' has recovered",
      state: {},
      flapping: false,
    });
    expect(alertingEventLogger.logAlert).toHaveBeenNthCalledWith(2, {
      action: 'recovered-instance',
      id: '8',
      message: "test-rule-type-id:123: 'test rule' alert '8' has recovered",
      state: {},
      flapping: false,
    });
    expect(alertingEventLogger.logAlert).toHaveBeenNthCalledWith(3, {
      action: 'recovered-instance',
      id: '9',
      message: "test-rule-type-id:123: 'test rule' alert '9' has recovered",
      state: {},
      flapping: false,
    });
    expect(alertingEventLogger.logAlert).toHaveBeenNthCalledWith(4, {
      action: 'recovered-instance',
      id: '10',
      message: "test-rule-type-id:123: 'test rule' alert '10' has recovered",
      state: {},
      flapping: false,
    });
    expect(alertingEventLogger.logAlert).toHaveBeenNthCalledWith(5, {
      action: 'new-instance',
      id: '4',
      message: "test-rule-type-id:123: 'test rule' created new alert: '4'",
      state: {},
      flapping: false,
    });
    expect(alertingEventLogger.logAlert).toHaveBeenNthCalledWith(6, {
      action: 'active-instance',
      id: '1',
      message: "test-rule-type-id:123: 'test rule' active alert: '1' in actionGroup: 'undefined'",
      state: {},
      flapping: false,
    });
    expect(alertingEventLogger.logAlert).toHaveBeenNthCalledWith(7, {
      action: 'active-instance',
      id: '2',
      message: "test-rule-type-id:123: 'test rule' active alert: '2' in actionGroup: 'undefined'",
      state: {},
      flapping: false,
    });
    expect(alertingEventLogger.logAlert).toHaveBeenNthCalledWith(8, {
      action: 'active-instance',
      id: '4',
      message: "test-rule-type-id:123: 'test rule' active alert: '4' in actionGroup: 'undefined'",
      state: {},
      flapping: false,
    });
  });

  test('should not call alertingEventLogger.logAlert or update ruleRunMetricsStore if shouldPersistAlerts is false', () => {
    logAlerts({
      logger,
      alertingEventLogger,
      newAlerts: {
        '4': new Alert<{}, {}>('4'),
      },
      activeAlerts: {
        '1': new Alert<{}, {}>('1'),
        '2': new Alert<{}, {}>('2'),
        '4': new Alert<{}, {}>('4'),
      },
      recoveredAlerts: {
        '7': new Alert<{}, {}>('7'),
        '8': new Alert<{}, {}>('8'),
        '9': new Alert<{}, {}>('9'),
        '10': new Alert<{}, {}>('10'),
      },
      ruleLogPrefix: `test-rule-type-id:123: 'test rule'`,
      ruleRunMetricsStore,
      canSetRecoveryContext: false,
      shouldPersistAlerts: false,
    });

    expect(ruleRunMetricsStore.getNumberOfNewAlerts()).toEqual(0);
    expect(ruleRunMetricsStore.getNumberOfActiveAlerts()).toEqual(0);
    expect(ruleRunMetricsStore.getNumberOfRecoveredAlerts()).toEqual(0);

    expect(alertingEventLogger.logAlert).not.toHaveBeenCalled();
  });

  test('should correctly set flapping values', () => {
    logAlerts({
      logger,
      alertingEventLogger,
      newAlerts: {
        '4': new Alert<{}, {}>('4'),
      },
      activeAlerts: {
        '1': new Alert<{}, {}>('1', { meta: { flapping: true } }),
        '2': new Alert<{}, {}>('2'),
        '4': new Alert<{}, {}>('4'),
      },
      recoveredAlerts: {
        '7': new Alert<{}, {}>('7'),
        '8': new Alert<{}, {}>('8', { meta: { flapping: true } }),
        '9': new Alert<{}, {}>('9'),
        '10': new Alert<{}, {}>('10'),
      },
      ruleLogPrefix: `test-rule-type-id:123: 'test rule'`,
      ruleRunMetricsStore,
      canSetRecoveryContext: false,
      shouldPersistAlerts: true,
    });

    expect(alertingEventLogger.logAlert).toHaveBeenNthCalledWith(1, {
      action: 'recovered-instance',
      id: '7',
      message: "test-rule-type-id:123: 'test rule' alert '7' has recovered",
      state: {},
      flapping: false,
    });
    expect(alertingEventLogger.logAlert).toHaveBeenNthCalledWith(2, {
      action: 'recovered-instance',
      id: '8',
      message: "test-rule-type-id:123: 'test rule' alert '8' has recovered",
      state: {},
      flapping: true,
    });
    expect(alertingEventLogger.logAlert).toHaveBeenNthCalledWith(3, {
      action: 'recovered-instance',
      id: '9',
      message: "test-rule-type-id:123: 'test rule' alert '9' has recovered",
      state: {},
      flapping: false,
    });
    expect(alertingEventLogger.logAlert).toHaveBeenNthCalledWith(4, {
      action: 'recovered-instance',
      id: '10',
      message: "test-rule-type-id:123: 'test rule' alert '10' has recovered",
      state: {},
      flapping: false,
    });
    expect(alertingEventLogger.logAlert).toHaveBeenNthCalledWith(5, {
      action: 'new-instance',
      id: '4',
      message: "test-rule-type-id:123: 'test rule' created new alert: '4'",
      state: {},
      flapping: false,
    });
    expect(alertingEventLogger.logAlert).toHaveBeenNthCalledWith(6, {
      action: 'active-instance',
      id: '1',
      message: "test-rule-type-id:123: 'test rule' active alert: '1' in actionGroup: 'undefined'",
      state: {},
      flapping: true,
    });
    expect(alertingEventLogger.logAlert).toHaveBeenNthCalledWith(7, {
      action: 'active-instance',
      id: '2',
      message: "test-rule-type-id:123: 'test rule' active alert: '2' in actionGroup: 'undefined'",
      state: {},
      flapping: false,
    });
    expect(alertingEventLogger.logAlert).toHaveBeenNthCalledWith(8, {
      action: 'active-instance',
      id: '4',
      message: "test-rule-type-id:123: 'test rule' active alert: '4' in actionGroup: 'undefined'",
      state: {},
      flapping: false,
    });
  });
});
