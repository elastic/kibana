/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import {
  mockTaskInstance,
  ruleType,
  RULE_ID,
  RULE_NAME,
  RULE_TYPE_ID,
} from '../../task_runner/fixtures';
import * as LegacyAlertsClientModule from '../legacy_alerts_client';
import { alertsServiceMock } from '../../alerts_service/alerts_service.mock';
import { ruleRunMetricsStoreMock } from '../../lib/rule_run_metrics_store.mock';
import { alertingEventLoggerMock } from '../../lib/alerting_event_logger/alerting_event_logger.mock';
import { DEFAULT_FLAPPING_SETTINGS } from '../../types';
import { alertsClientMock } from '../alerts_client.mock';
import { UntypedNormalizedRuleType } from '../../rule_type_registry';
import { legacyAlertsClientMock } from '../legacy_alerts_client.mock';
import { initializeAlertsClient, RuleData } from './initialize_alerts_client';
import { maintenanceWindowsServiceMock } from '../../task_runner/maintenance_windows/maintenance_windows_service.mock';

const alertingEventLogger = alertingEventLoggerMock.create();
const ruleRunMetricsStore = ruleRunMetricsStoreMock.create();
const alertsService = alertsServiceMock.create();
const alertsClient = alertsClientMock.create();
const legacyAlertsClient = legacyAlertsClientMock.create();
const logger = loggingSystemMock.create().get();
const maintenanceWindowsService = maintenanceWindowsServiceMock.create();

const ruleTypeWithAlerts: jest.Mocked<UntypedNormalizedRuleType> = {
  ...ruleType,
  alerts: {
    context: 'test',
    mappings: {
      fieldMap: {
        textField: {
          type: 'keyword',
          required: false,
        },
        numericField: {
          type: 'long',
          required: false,
        },
      },
    },
    shouldWrite: true,
  },
};

const mockedRule: RuleData<Record<string, unknown>> = {
  id: '1',
  name: 'rule-name',
  tags: ['rule-', '-tags'],
  consumer: 'bar',
  revision: 0,
  params: {
    bar: true,
  },
};

const mockedTaskInstance = mockTaskInstance();

describe('initializeAlertsClient', () => {
  test('should initialize and return alertsClient if createAlertsClient succeeds', async () => {
    const startedAt = new Date(Date.now() + 5 * 60 * 1000);
    const spy1 = jest
      .spyOn(LegacyAlertsClientModule, 'LegacyAlertsClient')
      .mockImplementation(() => legacyAlertsClient);
    alertsService.createAlertsClient.mockImplementationOnce(() => alertsClient);
    await initializeAlertsClient({
      alertsService,
      context: {
        alertingEventLogger,
        flappingSettings: DEFAULT_FLAPPING_SETTINGS,
        ruleId: RULE_ID,
        ruleLogPrefix: `${RULE_TYPE_ID}:${RULE_ID}: '${RULE_NAME}'`,
        ruleRunMetricsStore,
        spaceId: 'default',
      },
      executionId: 'abc',
      logger,
      maxAlerts: 100,
      maintenanceWindowsService,
      rule: mockedRule,
      ruleType: ruleTypeWithAlerts,
      startedAt,
      taskInstance: mockedTaskInstance,
    });

    expect(alertsService.createAlertsClient).toHaveBeenCalledWith({
      logger,
      ruleType: ruleTypeWithAlerts,
      maintenanceWindowsService,
      namespace: 'default',
      rule: {
        alertDelay: 0,
        consumer: 'bar',
        executionId: 'abc',
        id: '1',
        name: 'rule-name',
        parameters: {
          bar: true,
        },
        revision: 0,
        spaceId: 'default',
        tags: ['rule-', '-tags'],
      },
    });
    expect(LegacyAlertsClientModule.LegacyAlertsClient).not.toHaveBeenCalled();
    expect(alertsClient.initializeExecution).toHaveBeenCalledWith({
      activeAlertsFromState: {},
      flappingSettings: DEFAULT_FLAPPING_SETTINGS,
      maxAlerts: 100,
      recoveredAlertsFromState: {},
      ruleLabel: `test:1: 'rule-name'`,
      startedAt,
    });
    spy1.mockRestore();
  });

  test('should use DEFAULT_FLAPPING_SETTINGS if flappingSettings not defined', async () => {
    const spy1 = jest
      .spyOn(LegacyAlertsClientModule, 'LegacyAlertsClient')
      .mockImplementation(() => legacyAlertsClient);
    alertsService.createAlertsClient.mockImplementationOnce(() => alertsClient);
    await initializeAlertsClient({
      alertsService,
      context: {
        alertingEventLogger,
        ruleId: RULE_ID,
        ruleLogPrefix: `${RULE_TYPE_ID}:${RULE_ID}: '${RULE_NAME}'`,
        ruleRunMetricsStore,
        spaceId: 'default',
      },
      executionId: 'abc',
      logger,
      maintenanceWindowsService,
      maxAlerts: 100,
      rule: mockedRule,
      ruleType: ruleTypeWithAlerts,
      startedAt: mockedTaskInstance.startedAt,
      taskInstance: mockedTaskInstance,
    });

    expect(alertsService.createAlertsClient).toHaveBeenCalledWith({
      logger,
      ruleType: ruleTypeWithAlerts,
      maintenanceWindowsService,
      namespace: 'default',
      rule: {
        alertDelay: 0,
        consumer: 'bar',
        executionId: 'abc',
        id: '1',
        name: 'rule-name',
        parameters: {
          bar: true,
        },
        revision: 0,
        spaceId: 'default',
        tags: ['rule-', '-tags'],
      },
    });
    expect(LegacyAlertsClientModule.LegacyAlertsClient).not.toHaveBeenCalled();
    expect(alertsClient.initializeExecution).toHaveBeenCalledWith({
      activeAlertsFromState: {},
      flappingSettings: DEFAULT_FLAPPING_SETTINGS,
      maxAlerts: 100,
      recoveredAlertsFromState: {},
      ruleLabel: `test:1: 'rule-name'`,
      startedAt: expect.any(Date),
    });
    spy1.mockRestore();
  });

  test('should use LegacyAlertsClient if createAlertsClient returns null', async () => {
    const spy1 = jest
      .spyOn(LegacyAlertsClientModule, 'LegacyAlertsClient')
      .mockImplementation(() => legacyAlertsClient);
    alertsService.createAlertsClient.mockImplementationOnce(() => null);
    await initializeAlertsClient({
      alertsService,
      context: {
        alertingEventLogger,
        flappingSettings: DEFAULT_FLAPPING_SETTINGS,
        ruleId: RULE_ID,
        ruleLogPrefix: `${RULE_TYPE_ID}:${RULE_ID}: '${RULE_NAME}'`,
        ruleRunMetricsStore,
        spaceId: 'default',
      },
      executionId: 'abc',
      logger,
      maintenanceWindowsService,
      maxAlerts: 100,
      rule: mockedRule,
      ruleType: ruleTypeWithAlerts,
      startedAt: mockedTaskInstance.startedAt,
      taskInstance: mockedTaskInstance,
    });

    expect(alertsService.createAlertsClient).toHaveBeenCalledWith({
      logger,
      ruleType: ruleTypeWithAlerts,
      maintenanceWindowsService,
      namespace: 'default',
      rule: {
        alertDelay: 0,
        consumer: 'bar',
        executionId: 'abc',
        id: '1',
        name: 'rule-name',
        parameters: {
          bar: true,
        },
        revision: 0,
        spaceId: 'default',
        tags: ['rule-', '-tags'],
      },
    });
    expect(LegacyAlertsClientModule.LegacyAlertsClient).toHaveBeenCalledWith({
      logger,
      ruleType: ruleTypeWithAlerts,
      maintenanceWindowsService,
    });
    expect(legacyAlertsClient.initializeExecution).toHaveBeenCalledWith({
      activeAlertsFromState: {},
      flappingSettings: DEFAULT_FLAPPING_SETTINGS,
      maxAlerts: 100,
      recoveredAlertsFromState: {},
      ruleLabel: `test:1: 'rule-name'`,
      startedAt: expect.any(Date),
    });
    spy1.mockRestore();
  });

  test('should use LegacyAlertsClient if createAlertsClient throws error', async () => {
    const spy1 = jest
      .spyOn(LegacyAlertsClientModule, 'LegacyAlertsClient')
      .mockImplementation(() => legacyAlertsClient);
    alertsService.createAlertsClient.mockImplementationOnce(() => {
      throw new Error('fail fail');
    });
    await initializeAlertsClient({
      alertsService,
      context: {
        alertingEventLogger,
        flappingSettings: DEFAULT_FLAPPING_SETTINGS,
        ruleId: RULE_ID,
        ruleLogPrefix: `${RULE_TYPE_ID}:${RULE_ID}: '${RULE_NAME}'`,
        ruleRunMetricsStore,
        spaceId: 'default',
      },
      executionId: 'abc',
      logger,
      maxAlerts: 100,
      maintenanceWindowsService,
      rule: mockedRule,
      ruleType: ruleTypeWithAlerts,
      startedAt: mockedTaskInstance.startedAt,
      taskInstance: mockedTaskInstance,
    });

    expect(alertsService.createAlertsClient).toHaveBeenCalledWith({
      logger,
      ruleType: ruleTypeWithAlerts,
      maintenanceWindowsService,
      namespace: 'default',
      rule: {
        alertDelay: 0,
        consumer: 'bar',
        executionId: 'abc',
        id: '1',
        name: 'rule-name',
        parameters: {
          bar: true,
        },
        revision: 0,
        spaceId: 'default',
        tags: ['rule-', '-tags'],
      },
    });
    expect(LegacyAlertsClientModule.LegacyAlertsClient).toHaveBeenCalledWith({
      logger,
      ruleType: ruleTypeWithAlerts,
      maintenanceWindowsService,
    });
    expect(logger.error).toHaveBeenCalledWith(
      `Error initializing AlertsClient for context test. Using legacy alerts client instead. - fail fail`
    );
    expect(legacyAlertsClient.initializeExecution).toHaveBeenCalledWith({
      activeAlertsFromState: {},
      flappingSettings: DEFAULT_FLAPPING_SETTINGS,
      maxAlerts: 100,
      recoveredAlertsFromState: {},
      ruleLabel: `test:1: 'rule-name'`,
      startedAt: expect.any(Date),
    });
    spy1.mockRestore();
  });
});
