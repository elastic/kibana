/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { savedObjectsClientMock, uiSettingsServiceMock } from '@kbn/core/server/mocks';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { DATE_1970, mockTaskInstance, RULE_ID, RULE_NAME, RULE_TYPE_ID } from './fixtures';
import { alertingEventLoggerMock } from '../lib/alerting_event_logger/alerting_event_logger.mock';
import { ruleRunMetricsStoreMock } from '../lib/rule_run_metrics_store.mock';
import { RuleTypeRunner, RuleData } from './rule_type_runner';
import { TaskRunnerTimer } from './task_runner_timer';
import { DEFAULT_FLAPPING_SETTINGS, RecoveredActionGroup } from '../types';
import { TaskRunnerContext } from './types';
import { executionContextServiceMock } from '@kbn/core-execution-context-server-mocks';
import { SharePluginStart } from '@kbn/share-plugin/server';
import { alertsClientMock } from '../alerts_client/alerts_client.mock';
import { dataViewPluginMocks } from '@kbn/data-views-plugin/public/mocks';
import { publicRuleMonitoringServiceMock } from '../monitoring/rule_monitoring_service.mock';
import { publicRuleResultServiceMock } from '../monitoring/rule_result_service.mock';
import { wrappedScopedClusterClientMock } from '../lib/wrap_scoped_cluster_client.mock';
import { NormalizedRuleType } from '../rule_type_registry';
import {
  ConcreteTaskInstance,
  createTaskRunError,
  TaskErrorSource,
  TaskStatus,
} from '@kbn/task-manager-plugin/server';
import { getErrorSource } from '@kbn/task-manager-plugin/server/task_running';
import { maintenanceWindowsServiceMock } from './maintenance_windows/maintenance_windows_service.mock';
import { KibanaRequest } from '@kbn/core/server';

const alertingEventLogger = alertingEventLoggerMock.create();
const alertsClient = alertsClientMock.create();
const dataViews = dataViewPluginMocks.createStartContract();
const logger = loggingSystemMock.create().get();
const maintenanceWindowsService = maintenanceWindowsServiceMock.create();
const publicRuleMonitoringService = publicRuleMonitoringServiceMock.create();
const publicRuleResultService = publicRuleResultServiceMock.create();
const ruleRunMetricsStore = ruleRunMetricsStoreMock.create();
const savedObjectsClient = savedObjectsClientMock.create();
const uiSettingsClient = uiSettingsServiceMock.createClient();
const wrappedScopedClusterClient = wrappedScopedClusterClientMock.create();
const getDataViews = jest.fn().mockResolvedValue(dataViews);
const getWrappedSearchSourceClient = jest.fn();

const fakeRequest = {
  headers: {},
  getBasePath: () => '',
  path: '/',
  route: { settings: {} },
  url: {
    href: '/',
  },
  raw: {
    req: {
      url: '/',
    },
  },
  getSavedObjectsClient: jest.fn(),
} as unknown as KibanaRequest;

const timer = new TaskRunnerTimer({ logger });
const ruleType: jest.Mocked<
  NormalizedRuleType<{}, {}, { foo: string }, {}, {}, 'default', 'recovered', {}>
> = {
  id: RULE_TYPE_ID,
  name: 'My test rule',
  actionGroups: [{ id: 'default', name: 'Default' }, RecoveredActionGroup],
  defaultActionGroupId: 'default',
  minimumLicenseRequired: 'basic',
  isExportable: true,
  recoveryActionGroup: RecoveredActionGroup,
  executor: jest.fn(),
  category: 'test',
  producer: 'alerts',
  cancelAlertsOnRuleTimeout: true,
  ruleTaskTimeout: '5m',
  autoRecoverAlerts: true,
  validate: {
    params: { validate: (params) => params },
  },
  alerts: {
    context: 'test',
    mappings: { fieldMap: { field: { type: 'keyword', required: false } } },
  },
  validLegacyConsumers: [],
};

const mockedRule: RuleData<Record<string, unknown>> = {
  alertTypeId: ruleType.id,
  consumer: 'bar',
  schedule: { interval: '10s' },
  throttle: null,
  notifyWhen: 'onActiveAlert',
  name: RULE_NAME,
  tags: ['rule-', '-tags'],
  createdBy: 'rule-creator',
  updatedBy: 'rule-updater',
  createdAt: new Date('2019-02-12T21:01:22.479Z'),
  updatedAt: new Date('2019-02-12T21:01:22.479Z'),
  enabled: true,
  actions: [
    {
      group: 'default',
      actionTypeId: 'action',
      params: {
        foo: true,
      },
      uuid: '111-111',
      id: '1',
    },
    {
      group: RecoveredActionGroup.id,
      actionTypeId: 'action',
      params: {
        isResolved: true,
      },
      uuid: '222-222',
      id: '2',
    },
  ],
  muteAll: false,
  revision: 0,
};

const mockedRuleParams = { bar: true };

const mockedTaskInstance: ConcreteTaskInstance = {
  id: '',
  attempts: 0,
  status: TaskStatus.Running,
  version: '123',
  runAt: new Date(),
  scheduledAt: new Date(),
  startedAt: new Date(DATE_1970),
  retryAt: new Date(Date.now() + 5 * 60 * 1000),
  state: {},
  taskType: 'backfill',
  timeoutOverride: '3m',
  params: {
    adHocRunParamsId: 'abc',
    spaceId: 'default',
  },
  ownerId: null,
};

describe('RuleTypeRunner', () => {
  let ruleTypeRunner: RuleTypeRunner<{}, {}, { foo: string }, {}, {}, 'default', 'recovered', {}>;
  let context: TaskRunnerContext;
  let contextMock: ReturnType<typeof getTaskRunnerContext>;

  beforeEach(() => {
    jest.resetAllMocks();
    contextMock = getTaskRunnerContext();
    context = contextMock as unknown as TaskRunnerContext;

    ruleTypeRunner = new RuleTypeRunner<
      {},
      {},
      { foo: string },
      {},
      {},
      'default',
      'recovered',
      {}
    >({
      context,
      logger,
      task: mockedTaskInstance,
      timer,
    });
  });

  describe('run', () => {
    test('should return state when rule type executor succeeds', async () => {
      ruleType.executor.mockResolvedValueOnce({ state: { foo: 'bar' } });

      const { state, error, stackTrace } = await ruleTypeRunner.run({
        context: {
          alertingEventLogger,
          maintenanceWindowsService,
          flappingSettings: DEFAULT_FLAPPING_SETTINGS,
          queryDelaySec: 0,
          request: fakeRequest,
          ruleId: RULE_ID,
          ruleLogPrefix: `${RULE_TYPE_ID}:${RULE_ID}: '${RULE_NAME}'`,
          ruleRunMetricsStore,
          spaceId: 'default',
        },
        alertsClient,
        executionId: 'abc',
        executorServices: {
          getDataViews,
          ruleMonitoringService: publicRuleMonitoringService,
          ruleResultService: publicRuleResultService,
          savedObjectsClient,
          uiSettingsClient,
          wrappedScopedClusterClient,
          getWrappedSearchSourceClient,
        },
        rule: mockedRule,
        ruleType,
        startedAt: new Date(DATE_1970),
        state: mockTaskInstance().state,
        validatedParams: mockedRuleParams,
      });

      expect(ruleType.executor).toHaveBeenCalledWith({
        executionId: 'abc',
        services: {
          alertFactory: alertsClient.factory(),
          alertsClient: alertsClient.client(),
          getDataViews: expect.any(Function),
          maintenanceWindowsService,
          ruleMonitoringService: publicRuleMonitoringService,
          ruleResultService: publicRuleResultService,
          savedObjectsClient,
          scopedClusterClient: wrappedScopedClusterClient.client(),
          getSearchSourceClient: expect.any(Function),
          share: {},
          shouldStopExecution: expect.any(Function),
          shouldWriteAlerts: expect.any(Function),
          uiSettingsClient,
        },
        params: mockedRuleParams,
        state: mockTaskInstance().state,
        startedAt: new Date(DATE_1970),
        startedAtOverridden: false,
        previousStartedAt: null,
        spaceId: 'default',
        rule: {
          id: RULE_ID,
          name: mockedRule.name,
          tags: mockedRule.tags,
          consumer: mockedRule.consumer,
          producer: ruleType.producer,
          revision: mockedRule.revision,
          ruleTypeId: mockedRule.alertTypeId,
          ruleTypeName: ruleType.name,
          enabled: mockedRule.enabled,
          schedule: mockedRule.schedule,
          actions: mockedRule.actions,
          createdBy: mockedRule.createdBy,
          updatedBy: mockedRule.updatedBy,
          createdAt: mockedRule.createdAt,
          updatedAt: mockedRule.updatedAt,
          throttle: mockedRule.throttle,
          notifyWhen: mockedRule.notifyWhen,
          muteAll: mockedRule.muteAll,
          snoozeSchedule: mockedRule.snoozeSchedule,
          alertDelay: mockedRule.alertDelay,
        },
        logger,
        flappingSettings: DEFAULT_FLAPPING_SETTINGS,
        getTimeRange: expect.any(Function),
      });

      expect(state).toEqual({ foo: 'bar' });
      expect(error).toBeUndefined();
      expect(stackTrace).toBeUndefined();
      expect(alertsClient.hasReachedAlertLimit).toHaveBeenCalled();
      expect(alertsClient.checkLimitUsage).toHaveBeenCalled();
      expect(alertingEventLogger.setExecutionSucceeded).toHaveBeenCalledWith(
        `rule executed: ${RULE_TYPE_ID}:${RULE_ID}: '${RULE_NAME}'`
      );
      expect(ruleRunMetricsStore.setSearchMetrics).toHaveBeenCalled();
      expect(alertsClient.processAlerts).toHaveBeenCalledWith({
        flappingSettings: DEFAULT_FLAPPING_SETTINGS,
        alertDelay: 0,
        ruleRunMetricsStore,
      });
      expect(alertsClient.persistAlerts).toHaveBeenCalled();
      expect(alertingEventLogger.setMaintenanceWindowIds).not.toHaveBeenCalled();
      expect(alertsClient.logAlerts).toHaveBeenCalledWith({
        ruleRunMetricsStore,
        shouldLogAlerts: true,
      });
    });

    test('should identify when startedAt passed to executor does not equal task startedAt', async () => {
      const differentStartedAt = new Date();
      ruleType.executor.mockResolvedValueOnce({ state: { foo: 'bar' } });

      const { state, error, stackTrace } = await ruleTypeRunner.run({
        context: {
          alertingEventLogger,
          flappingSettings: DEFAULT_FLAPPING_SETTINGS,
          queryDelaySec: 0,
          request: fakeRequest,
          maintenanceWindowsService,
          ruleId: RULE_ID,
          ruleLogPrefix: `${RULE_TYPE_ID}:${RULE_ID}: '${RULE_NAME}'`,
          ruleRunMetricsStore,
          spaceId: 'default',
        },
        alertsClient,
        executionId: 'abc',
        executorServices: {
          getDataViews,
          ruleMonitoringService: publicRuleMonitoringService,
          ruleResultService: publicRuleResultService,
          savedObjectsClient,
          uiSettingsClient,
          wrappedScopedClusterClient,
          getWrappedSearchSourceClient,
        },
        rule: mockedRule,
        ruleType,
        startedAt: differentStartedAt,
        state: mockTaskInstance().state,
        validatedParams: mockedRuleParams,
      });

      expect(ruleType.executor).toHaveBeenCalledWith({
        executionId: 'abc',
        services: {
          alertFactory: alertsClient.factory(),
          alertsClient: alertsClient.client(),
          getDataViews: expect.any(Function),
          maintenanceWindowsService,
          ruleMonitoringService: publicRuleMonitoringService,
          ruleResultService: publicRuleResultService,
          savedObjectsClient,
          scopedClusterClient: wrappedScopedClusterClient.client(),
          getSearchSourceClient: expect.any(Function),
          share: {},
          shouldStopExecution: expect.any(Function),
          shouldWriteAlerts: expect.any(Function),
          uiSettingsClient,
        },
        params: mockedRuleParams,
        state: mockTaskInstance().state,
        startedAt: differentStartedAt,
        startedAtOverridden: true,
        previousStartedAt: null,
        spaceId: 'default',
        rule: {
          id: RULE_ID,
          name: mockedRule.name,
          tags: mockedRule.tags,
          consumer: mockedRule.consumer,
          producer: ruleType.producer,
          revision: mockedRule.revision,
          ruleTypeId: mockedRule.alertTypeId,
          ruleTypeName: ruleType.name,
          enabled: mockedRule.enabled,
          schedule: mockedRule.schedule,
          actions: mockedRule.actions,
          createdBy: mockedRule.createdBy,
          updatedBy: mockedRule.updatedBy,
          createdAt: mockedRule.createdAt,
          updatedAt: mockedRule.updatedAt,
          throttle: mockedRule.throttle,
          notifyWhen: mockedRule.notifyWhen,
          muteAll: mockedRule.muteAll,
          snoozeSchedule: mockedRule.snoozeSchedule,
          alertDelay: mockedRule.alertDelay,
        },
        logger,
        flappingSettings: DEFAULT_FLAPPING_SETTINGS,
        getTimeRange: expect.any(Function),
      });

      expect(state).toEqual({ foo: 'bar' });
      expect(error).toBeUndefined();
      expect(stackTrace).toBeUndefined();
      expect(alertsClient.hasReachedAlertLimit).toHaveBeenCalled();
      expect(alertsClient.checkLimitUsage).toHaveBeenCalled();
      expect(alertingEventLogger.setExecutionSucceeded).toHaveBeenCalledWith(
        `rule executed: ${RULE_TYPE_ID}:${RULE_ID}: '${RULE_NAME}'`
      );
      expect(ruleRunMetricsStore.setSearchMetrics).toHaveBeenCalled();
      expect(alertsClient.processAlerts).toHaveBeenCalledWith({
        flappingSettings: DEFAULT_FLAPPING_SETTINGS,
        alertDelay: 0,
        ruleRunMetricsStore,
      });
      expect(alertsClient.persistAlerts).toHaveBeenCalled();
      expect(alertingEventLogger.setMaintenanceWindowIds).not.toHaveBeenCalled();
      expect(alertsClient.logAlerts).toHaveBeenCalledWith({
        ruleRunMetricsStore,
        shouldLogAlerts: true,
      });
    });

    test('should update maintenance window ids in event logger if alerts are affected', async () => {
      alertsClient.persistAlerts.mockResolvedValueOnce({
        alertId: ['1'],
        maintenanceWindowIds: ['abc'],
      });
      ruleType.executor.mockResolvedValueOnce({ state: { foo: 'bar' } });

      const { state, error, stackTrace } = await ruleTypeRunner.run({
        context: {
          alertingEventLogger,
          flappingSettings: DEFAULT_FLAPPING_SETTINGS,
          queryDelaySec: 0,
          maintenanceWindowsService,
          request: fakeRequest,
          ruleId: RULE_ID,
          ruleLogPrefix: `${RULE_TYPE_ID}:${RULE_ID}: '${RULE_NAME}'`,
          ruleRunMetricsStore,
          spaceId: 'default',
        },
        alertsClient,
        executionId: 'abc',
        executorServices: {
          getDataViews,
          ruleMonitoringService: publicRuleMonitoringService,
          ruleResultService: publicRuleResultService,
          savedObjectsClient,
          uiSettingsClient,
          wrappedScopedClusterClient,
          getWrappedSearchSourceClient,
        },
        rule: mockedRule,
        ruleType,
        startedAt: new Date(DATE_1970),
        state: mockTaskInstance().state,
        validatedParams: mockedRuleParams,
      });

      expect(ruleType.executor).toHaveBeenCalled();

      expect(state).toEqual({ foo: 'bar' });
      expect(error).toBeUndefined();
      expect(stackTrace).toBeUndefined();
      expect(alertsClient.hasReachedAlertLimit).toHaveBeenCalled();
      expect(alertsClient.checkLimitUsage).toHaveBeenCalled();
      expect(alertingEventLogger.setExecutionSucceeded).toHaveBeenCalledWith(
        `rule executed: ${RULE_TYPE_ID}:${RULE_ID}: '${RULE_NAME}'`
      );
      expect(ruleRunMetricsStore.setSearchMetrics).toHaveBeenCalled();
      expect(alertsClient.processAlerts).toHaveBeenCalledWith({
        flappingSettings: DEFAULT_FLAPPING_SETTINGS,
        alertDelay: 0,
        ruleRunMetricsStore,
      });
      expect(alertsClient.persistAlerts).toHaveBeenCalled();
      expect(alertingEventLogger.setMaintenanceWindowIds).toHaveBeenCalledWith(['abc']);
      expect(alertsClient.logAlerts).toHaveBeenCalledWith({
        ruleRunMetricsStore,
        shouldLogAlerts: true,
      });
    });

    test('should return error when checkLimitUsage() throws error', async () => {
      const err = new Error('limit exceeded');
      alertsClient.checkLimitUsage.mockImplementationOnce(() => {
        throw err;
      });
      ruleType.executor.mockResolvedValueOnce({ state: { foo: 'bar' } });

      const { state, error, stackTrace } = await ruleTypeRunner.run({
        context: {
          alertingEventLogger,
          flappingSettings: DEFAULT_FLAPPING_SETTINGS,
          queryDelaySec: 0,
          request: fakeRequest,
          maintenanceWindowsService,
          ruleId: RULE_ID,
          ruleLogPrefix: `${RULE_TYPE_ID}:${RULE_ID}: '${RULE_NAME}'`,
          ruleRunMetricsStore,
          spaceId: 'default',
        },
        alertsClient,
        executionId: 'abc',
        executorServices: {
          getDataViews,
          ruleMonitoringService: publicRuleMonitoringService,
          ruleResultService: publicRuleResultService,
          savedObjectsClient,
          uiSettingsClient,
          wrappedScopedClusterClient,
          getWrappedSearchSourceClient,
        },
        rule: mockedRule,
        ruleType,
        startedAt: new Date(DATE_1970),
        state: mockTaskInstance().state,
        validatedParams: mockedRuleParams,
      });

      expect(ruleType.executor).toHaveBeenCalledWith({
        executionId: 'abc',
        services: {
          alertFactory: alertsClient.factory(),
          alertsClient: alertsClient.client(),
          getDataViews: expect.any(Function),
          maintenanceWindowsService,
          ruleMonitoringService: publicRuleMonitoringService,
          ruleResultService: publicRuleResultService,
          savedObjectsClient,
          scopedClusterClient: wrappedScopedClusterClient.client(),
          getSearchSourceClient: expect.any(Function),
          share: {},
          shouldStopExecution: expect.any(Function),
          shouldWriteAlerts: expect.any(Function),
          uiSettingsClient,
        },
        params: mockedRuleParams,
        state: mockTaskInstance().state,
        startedAt: new Date(DATE_1970),
        startedAtOverridden: false,
        previousStartedAt: null,
        spaceId: 'default',
        rule: {
          id: RULE_ID,
          name: mockedRule.name,
          tags: mockedRule.tags,
          consumer: mockedRule.consumer,
          producer: ruleType.producer,
          revision: mockedRule.revision,
          ruleTypeId: mockedRule.alertTypeId,
          ruleTypeName: ruleType.name,
          enabled: mockedRule.enabled,
          schedule: mockedRule.schedule,
          actions: mockedRule.actions,
          createdBy: mockedRule.createdBy,
          updatedBy: mockedRule.updatedBy,
          createdAt: mockedRule.createdAt,
          updatedAt: mockedRule.updatedAt,
          throttle: mockedRule.throttle,
          notifyWhen: mockedRule.notifyWhen,
          muteAll: mockedRule.muteAll,
          snoozeSchedule: mockedRule.snoozeSchedule,
          alertDelay: mockedRule.alertDelay,
        },
        logger,
        flappingSettings: DEFAULT_FLAPPING_SETTINGS,
        getTimeRange: expect.any(Function),
      });

      expect(state).toBeUndefined();
      expect(error).toEqual(err);
      expect(stackTrace).toEqual({ message: err, stackTrace: err.stack });
      expect(alertsClient.checkLimitUsage).toHaveBeenCalled();
      expect(alertsClient.hasReachedAlertLimit).toHaveBeenCalled();
      expect(alertingEventLogger.setExecutionSucceeded).not.toHaveBeenCalled();
      expect(alertingEventLogger.setExecutionFailed).toHaveBeenCalledWith(
        `rule execution failure: test:1: 'rule-name'`,
        'limit exceeded'
      );
      expect(ruleRunMetricsStore.setSearchMetrics).not.toHaveBeenCalled();
      expect(alertsClient.processAlerts).not.toHaveBeenCalled();
      expect(alertsClient.persistAlerts).not.toHaveBeenCalled();
      expect(alertsClient.logAlerts).not.toHaveBeenCalled();
    });

    test('should return error when rule type executor throws error', async () => {
      const err = new Error('executor error');
      ruleType.executor.mockImplementationOnce(() => {
        throw err;
      });

      const { state, error, stackTrace } = await ruleTypeRunner.run({
        context: {
          alertingEventLogger,
          flappingSettings: DEFAULT_FLAPPING_SETTINGS,
          queryDelaySec: 0,
          maintenanceWindowsService,
          request: fakeRequest,
          ruleId: RULE_ID,
          ruleLogPrefix: `${RULE_TYPE_ID}:${RULE_ID}: '${RULE_NAME}'`,
          ruleRunMetricsStore,
          spaceId: 'default',
        },
        alertsClient,
        executionId: 'abc',
        executorServices: {
          getDataViews,
          ruleMonitoringService: publicRuleMonitoringService,
          ruleResultService: publicRuleResultService,
          savedObjectsClient,
          uiSettingsClient,
          wrappedScopedClusterClient,
          getWrappedSearchSourceClient,
        },
        rule: mockedRule,
        ruleType,
        startedAt: new Date(DATE_1970),
        state: mockTaskInstance().state,
        validatedParams: mockedRuleParams,
      });

      expect(ruleType.executor).toHaveBeenCalledWith({
        executionId: 'abc',
        services: {
          alertFactory: alertsClient.factory(),
          alertsClient: alertsClient.client(),
          getDataViews: expect.any(Function),
          maintenanceWindowsService,
          ruleMonitoringService: publicRuleMonitoringService,
          ruleResultService: publicRuleResultService,
          savedObjectsClient,
          scopedClusterClient: wrappedScopedClusterClient.client(),
          getSearchSourceClient: expect.any(Function),
          share: {},
          shouldStopExecution: expect.any(Function),
          shouldWriteAlerts: expect.any(Function),
          uiSettingsClient,
        },
        params: mockedRuleParams,
        state: mockTaskInstance().state,
        startedAt: new Date(DATE_1970),
        startedAtOverridden: false,
        previousStartedAt: null,
        spaceId: 'default',
        rule: {
          id: RULE_ID,
          name: mockedRule.name,
          tags: mockedRule.tags,
          consumer: mockedRule.consumer,
          producer: ruleType.producer,
          revision: mockedRule.revision,
          ruleTypeId: mockedRule.alertTypeId,
          ruleTypeName: ruleType.name,
          enabled: mockedRule.enabled,
          schedule: mockedRule.schedule,
          actions: mockedRule.actions,
          createdBy: mockedRule.createdBy,
          updatedBy: mockedRule.updatedBy,
          createdAt: mockedRule.createdAt,
          updatedAt: mockedRule.updatedAt,
          throttle: mockedRule.throttle,
          notifyWhen: mockedRule.notifyWhen,
          muteAll: mockedRule.muteAll,
          snoozeSchedule: mockedRule.snoozeSchedule,
          alertDelay: mockedRule.alertDelay,
        },
        logger,
        flappingSettings: DEFAULT_FLAPPING_SETTINGS,
        getTimeRange: expect.any(Function),
      });

      expect(state).toBeUndefined();
      expect(error).toEqual(err);
      expect(stackTrace).toEqual({ message: err, stackTrace: err.stack });
      expect(alertsClient.checkLimitUsage).not.toHaveBeenCalled();
      expect(alertsClient.hasReachedAlertLimit).toHaveBeenCalled();
      expect(alertingEventLogger.setExecutionSucceeded).not.toHaveBeenCalled();
      expect(alertingEventLogger.setExecutionFailed).toHaveBeenCalledWith(
        `rule execution failure: test:1: 'rule-name'`,
        'executor error'
      );
      expect(ruleRunMetricsStore.setSearchMetrics).not.toHaveBeenCalled();
      expect(alertsClient.processAlerts).not.toHaveBeenCalled();
      expect(alertsClient.persistAlerts).not.toHaveBeenCalled();
      expect(alertsClient.logAlerts).not.toHaveBeenCalled();
    });

    test('should return user error when rule type executor throws a user error', async () => {
      const err = createTaskRunError(new Error('fail'), TaskErrorSource.USER);
      ruleType.executor.mockImplementationOnce(() => {
        throw err;
      });

      const { error } = await ruleTypeRunner.run({
        context: {
          alertingEventLogger,
          flappingSettings: DEFAULT_FLAPPING_SETTINGS,
          queryDelaySec: 0,
          maintenanceWindowsService,
          request: fakeRequest,
          ruleId: RULE_ID,
          ruleLogPrefix: `${RULE_TYPE_ID}:${RULE_ID}: '${RULE_NAME}'`,
          ruleRunMetricsStore,
          spaceId: 'default',
        },
        alertsClient,
        executionId: 'abc',
        executorServices: {
          getDataViews,
          ruleMonitoringService: publicRuleMonitoringService,
          ruleResultService: publicRuleResultService,
          savedObjectsClient,
          uiSettingsClient,
          wrappedScopedClusterClient,
          getWrappedSearchSourceClient,
        },
        rule: mockedRule,
        ruleType,
        startedAt: new Date(DATE_1970),
        state: mockTaskInstance().state,
        validatedParams: mockedRuleParams,
      });

      expect(getErrorSource(error!)).toEqual(TaskErrorSource.USER);
    });

    test('should handle reaching alert limit when rule type executor succeeds', async () => {
      alertsClient.hasReachedAlertLimit.mockReturnValueOnce(true);
      ruleType.executor.mockResolvedValueOnce({ state: { foo: 'bar' } });

      const { state, error, stackTrace } = await ruleTypeRunner.run({
        context: {
          alertingEventLogger,
          flappingSettings: DEFAULT_FLAPPING_SETTINGS,
          queryDelaySec: 0,
          request: fakeRequest,
          ruleId: RULE_ID,
          maintenanceWindowsService,
          ruleLogPrefix: `${RULE_TYPE_ID}:${RULE_ID}: '${RULE_NAME}'`,
          ruleRunMetricsStore,
          spaceId: 'default',
        },
        alertsClient,
        executionId: 'abc',
        executorServices: {
          getDataViews,
          ruleMonitoringService: publicRuleMonitoringService,
          ruleResultService: publicRuleResultService,
          savedObjectsClient,
          uiSettingsClient,
          wrappedScopedClusterClient,
          getWrappedSearchSourceClient,
        },
        rule: mockedRule,
        ruleType,
        startedAt: new Date(DATE_1970),
        state: mockTaskInstance().state,
        validatedParams: mockedRuleParams,
      });

      expect(ruleType.executor).toHaveBeenCalledWith({
        executionId: 'abc',
        services: {
          alertFactory: alertsClient.factory(),
          alertsClient: alertsClient.client(),
          getDataViews: expect.any(Function),
          maintenanceWindowsService,
          ruleMonitoringService: publicRuleMonitoringService,
          ruleResultService: publicRuleResultService,
          savedObjectsClient,
          scopedClusterClient: wrappedScopedClusterClient.client(),
          getSearchSourceClient: expect.any(Function),
          share: {},
          shouldStopExecution: expect.any(Function),
          shouldWriteAlerts: expect.any(Function),
          uiSettingsClient,
        },
        params: mockedRuleParams,
        state: mockTaskInstance().state,
        startedAt: new Date(DATE_1970),
        startedAtOverridden: false,
        previousStartedAt: null,
        spaceId: 'default',
        rule: {
          id: RULE_ID,
          name: mockedRule.name,
          tags: mockedRule.tags,
          consumer: mockedRule.consumer,
          producer: ruleType.producer,
          revision: mockedRule.revision,
          ruleTypeId: mockedRule.alertTypeId,
          ruleTypeName: ruleType.name,
          enabled: mockedRule.enabled,
          schedule: mockedRule.schedule,
          actions: mockedRule.actions,
          createdBy: mockedRule.createdBy,
          updatedBy: mockedRule.updatedBy,
          createdAt: mockedRule.createdAt,
          updatedAt: mockedRule.updatedAt,
          throttle: mockedRule.throttle,
          notifyWhen: mockedRule.notifyWhen,
          muteAll: mockedRule.muteAll,
          snoozeSchedule: mockedRule.snoozeSchedule,
          alertDelay: mockedRule.alertDelay,
        },
        logger,
        flappingSettings: DEFAULT_FLAPPING_SETTINGS,
        getTimeRange: expect.any(Function),
      });

      expect(logger.warn).toHaveBeenCalledWith(
        `rule execution generated greater than 100 alerts: test:1: 'rule-name'`
      );
      expect(ruleRunMetricsStore.setHasReachedAlertLimit).toHaveBeenCalledWith(true);
      expect(state).toEqual({ foo: 'bar' });
      expect(error).toBeUndefined();
      expect(stackTrace).toBeUndefined();
      expect(alertsClient.hasReachedAlertLimit).toHaveBeenCalled();
      expect(alertsClient.checkLimitUsage).toHaveBeenCalled();
      expect(alertingEventLogger.setExecutionSucceeded).toHaveBeenCalledWith(
        `rule executed: ${RULE_TYPE_ID}:${RULE_ID}: '${RULE_NAME}'`
      );
      expect(ruleRunMetricsStore.setSearchMetrics).toHaveBeenCalled();
      expect(alertsClient.processAlerts).toHaveBeenCalledWith({
        flappingSettings: DEFAULT_FLAPPING_SETTINGS,
        alertDelay: 0,
        ruleRunMetricsStore,
      });
      expect(alertsClient.persistAlerts).toHaveBeenCalled();
      expect(alertsClient.logAlerts).toHaveBeenCalledWith({
        ruleRunMetricsStore,
        shouldLogAlerts: true,
      });
    });

    test('should handle reaching alert limit when rule type executor throws error', async () => {
      alertsClient.hasReachedAlertLimit.mockReturnValueOnce(true);
      alertsClient.hasReachedAlertLimit.mockReturnValueOnce(true);
      const err = new Error('executor error');
      ruleType.executor.mockImplementationOnce(() => {
        throw err;
      });

      const { state, error, stackTrace } = await ruleTypeRunner.run({
        context: {
          alertingEventLogger,
          flappingSettings: DEFAULT_FLAPPING_SETTINGS,
          queryDelaySec: 0,
          request: fakeRequest,
          ruleId: RULE_ID,
          maintenanceWindowsService,
          ruleLogPrefix: `${RULE_TYPE_ID}:${RULE_ID}: '${RULE_NAME}'`,
          ruleRunMetricsStore,
          spaceId: 'default',
        },
        alertsClient,
        executionId: 'abc',
        executorServices: {
          getDataViews,
          ruleMonitoringService: publicRuleMonitoringService,
          ruleResultService: publicRuleResultService,
          savedObjectsClient,
          uiSettingsClient,
          wrappedScopedClusterClient,
          getWrappedSearchSourceClient,
        },
        rule: mockedRule,
        ruleType,
        startedAt: new Date(DATE_1970),
        state: mockTaskInstance().state,
        validatedParams: mockedRuleParams,
      });

      expect(ruleType.executor).toHaveBeenCalledWith({
        executionId: 'abc',
        services: {
          alertFactory: alertsClient.factory(),
          alertsClient: alertsClient.client(),
          getDataViews: expect.any(Function),
          maintenanceWindowsService,
          ruleMonitoringService: publicRuleMonitoringService,
          ruleResultService: publicRuleResultService,
          savedObjectsClient,
          scopedClusterClient: wrappedScopedClusterClient.client(),
          getSearchSourceClient: expect.any(Function),
          share: {},
          shouldStopExecution: expect.any(Function),
          shouldWriteAlerts: expect.any(Function),
          uiSettingsClient,
        },
        params: mockedRuleParams,
        state: mockTaskInstance().state,
        startedAt: new Date(DATE_1970),
        startedAtOverridden: false,
        previousStartedAt: null,
        spaceId: 'default',
        rule: {
          id: RULE_ID,
          name: mockedRule.name,
          tags: mockedRule.tags,
          consumer: mockedRule.consumer,
          producer: ruleType.producer,
          revision: mockedRule.revision,
          ruleTypeId: mockedRule.alertTypeId,
          ruleTypeName: ruleType.name,
          enabled: mockedRule.enabled,
          schedule: mockedRule.schedule,
          actions: mockedRule.actions,
          createdBy: mockedRule.createdBy,
          updatedBy: mockedRule.updatedBy,
          createdAt: mockedRule.createdAt,
          updatedAt: mockedRule.updatedAt,
          throttle: mockedRule.throttle,
          notifyWhen: mockedRule.notifyWhen,
          muteAll: mockedRule.muteAll,
          snoozeSchedule: mockedRule.snoozeSchedule,
          alertDelay: mockedRule.alertDelay,
        },
        logger,
        flappingSettings: DEFAULT_FLAPPING_SETTINGS,
        getTimeRange: expect.any(Function),
      });

      expect(logger.warn).toHaveBeenCalledWith(
        `rule execution generated greater than 100 alerts: test:1: 'rule-name'`
      );
      expect(ruleRunMetricsStore.setHasReachedAlertLimit).toHaveBeenCalledWith(true);
      expect(state).toBeUndefined();
      expect(error).toBeUndefined();
      expect(stackTrace).toBeUndefined();
      expect(alertsClient.checkLimitUsage).not.toHaveBeenCalled();
      expect(alertsClient.hasReachedAlertLimit).toHaveBeenCalled();
      expect(alertingEventLogger.setExecutionSucceeded).toHaveBeenCalledWith(
        `rule executed: ${RULE_TYPE_ID}:${RULE_ID}: '${RULE_NAME}'`
      );
      expect(ruleRunMetricsStore.setSearchMetrics).toHaveBeenCalled();
      expect(alertsClient.processAlerts).toHaveBeenCalledWith({
        flappingSettings: DEFAULT_FLAPPING_SETTINGS,
        alertDelay: 0,
        ruleRunMetricsStore,
      });
      expect(alertsClient.persistAlerts).toHaveBeenCalled();
      expect(alertsClient.logAlerts).toHaveBeenCalledWith({
        ruleRunMetricsStore,
        shouldLogAlerts: true,
      });
    });

    test('should throw error if alertsClient.processAlerts throws error', async () => {
      alertsClient.processAlerts.mockImplementationOnce(() => {
        throw new Error('process alerts failed');
      });

      ruleType.executor.mockResolvedValueOnce({ state: { foo: 'bar' } });

      await expect(
        ruleTypeRunner.run({
          context: {
            alertingEventLogger,
            flappingSettings: DEFAULT_FLAPPING_SETTINGS,
            queryDelaySec: 0,
            request: fakeRequest,
            maintenanceWindowsService,
            ruleId: RULE_ID,
            ruleLogPrefix: `${RULE_TYPE_ID}:${RULE_ID}: '${RULE_NAME}'`,
            ruleRunMetricsStore,
            spaceId: 'default',
          },
          alertsClient,
          executionId: 'abc',
          executorServices: {
            getDataViews,
            ruleMonitoringService: publicRuleMonitoringService,
            ruleResultService: publicRuleResultService,
            savedObjectsClient,
            uiSettingsClient,
            wrappedScopedClusterClient,
            getWrappedSearchSourceClient,
          },
          rule: mockedRule,
          ruleType,
          startedAt: new Date(DATE_1970),
          state: mockTaskInstance().state,
          validatedParams: mockedRuleParams,
        })
      ).rejects.toThrowErrorMatchingInlineSnapshot(`"process alerts failed"`);

      expect(ruleType.executor).toHaveBeenCalledWith({
        executionId: 'abc',
        services: {
          alertFactory: alertsClient.factory(),
          alertsClient: alertsClient.client(),
          getDataViews: expect.any(Function),
          maintenanceWindowsService,
          ruleMonitoringService: publicRuleMonitoringService,
          ruleResultService: publicRuleResultService,
          savedObjectsClient,
          scopedClusterClient: wrappedScopedClusterClient.client(),
          getSearchSourceClient: expect.any(Function),
          share: {},
          shouldStopExecution: expect.any(Function),
          shouldWriteAlerts: expect.any(Function),
          uiSettingsClient,
        },
        params: mockedRuleParams,
        state: mockTaskInstance().state,
        startedAt: new Date(DATE_1970),
        startedAtOverridden: false,
        previousStartedAt: null,
        spaceId: 'default',
        rule: {
          id: RULE_ID,
          name: mockedRule.name,
          tags: mockedRule.tags,
          consumer: mockedRule.consumer,
          producer: ruleType.producer,
          revision: mockedRule.revision,
          ruleTypeId: mockedRule.alertTypeId,
          ruleTypeName: ruleType.name,
          enabled: mockedRule.enabled,
          schedule: mockedRule.schedule,
          actions: mockedRule.actions,
          createdBy: mockedRule.createdBy,
          updatedBy: mockedRule.updatedBy,
          createdAt: mockedRule.createdAt,
          updatedAt: mockedRule.updatedAt,
          throttle: mockedRule.throttle,
          notifyWhen: mockedRule.notifyWhen,
          muteAll: mockedRule.muteAll,
          snoozeSchedule: mockedRule.snoozeSchedule,
          alertDelay: mockedRule.alertDelay,
        },
        logger,
        flappingSettings: DEFAULT_FLAPPING_SETTINGS,
        getTimeRange: expect.any(Function),
      });

      expect(alertsClient.hasReachedAlertLimit).toHaveBeenCalled();
      expect(alertsClient.checkLimitUsage).toHaveBeenCalled();
      expect(alertingEventLogger.setExecutionSucceeded).toHaveBeenCalledWith(
        `rule executed: ${RULE_TYPE_ID}:${RULE_ID}: '${RULE_NAME}'`
      );
      expect(ruleRunMetricsStore.setSearchMetrics).toHaveBeenCalled();
      expect(alertsClient.processAlerts).toHaveBeenCalledWith({
        flappingSettings: DEFAULT_FLAPPING_SETTINGS,
        alertDelay: 0,
        ruleRunMetricsStore,
      });
      expect(alertsClient.persistAlerts).not.toHaveBeenCalled();
      expect(alertsClient.logAlerts).not.toHaveBeenCalled();
    });

    test('should throw error if alertsClient.persistAlerts throws error', async () => {
      alertsClient.persistAlerts.mockImplementationOnce(() => {
        throw new Error('persist alerts failed');
      });

      ruleType.executor.mockResolvedValueOnce({ state: { foo: 'bar' } });

      await expect(
        ruleTypeRunner.run({
          context: {
            alertingEventLogger,
            flappingSettings: DEFAULT_FLAPPING_SETTINGS,
            request: fakeRequest,
            queryDelaySec: 0,
            ruleId: RULE_ID,
            maintenanceWindowsService,
            ruleLogPrefix: `${RULE_TYPE_ID}:${RULE_ID}: '${RULE_NAME}'`,
            ruleRunMetricsStore,
            spaceId: 'default',
          },
          alertsClient,
          executionId: 'abc',
          executorServices: {
            getDataViews,
            ruleMonitoringService: publicRuleMonitoringService,
            ruleResultService: publicRuleResultService,
            savedObjectsClient,
            uiSettingsClient,
            wrappedScopedClusterClient,
            getWrappedSearchSourceClient,
          },
          rule: mockedRule,
          ruleType,
          startedAt: new Date(DATE_1970),
          state: mockTaskInstance().state,
          validatedParams: mockedRuleParams,
        })
      ).rejects.toThrowErrorMatchingInlineSnapshot(`"persist alerts failed"`);

      expect(ruleType.executor).toHaveBeenCalledWith({
        executionId: 'abc',
        services: {
          alertFactory: alertsClient.factory(),
          alertsClient: alertsClient.client(),
          getDataViews: expect.any(Function),
          maintenanceWindowsService,
          ruleMonitoringService: publicRuleMonitoringService,
          ruleResultService: publicRuleResultService,
          savedObjectsClient,
          scopedClusterClient: wrappedScopedClusterClient.client(),
          getSearchSourceClient: expect.any(Function),
          share: {},
          shouldStopExecution: expect.any(Function),
          shouldWriteAlerts: expect.any(Function),
          uiSettingsClient,
        },
        params: mockedRuleParams,
        state: mockTaskInstance().state,
        startedAt: new Date(DATE_1970),
        startedAtOverridden: false,
        previousStartedAt: null,
        spaceId: 'default',
        rule: {
          id: RULE_ID,
          name: mockedRule.name,
          tags: mockedRule.tags,
          consumer: mockedRule.consumer,
          producer: ruleType.producer,
          revision: mockedRule.revision,
          ruleTypeId: mockedRule.alertTypeId,
          ruleTypeName: ruleType.name,
          enabled: mockedRule.enabled,
          schedule: mockedRule.schedule,
          actions: mockedRule.actions,
          createdBy: mockedRule.createdBy,
          updatedBy: mockedRule.updatedBy,
          createdAt: mockedRule.createdAt,
          updatedAt: mockedRule.updatedAt,
          throttle: mockedRule.throttle,
          notifyWhen: mockedRule.notifyWhen,
          muteAll: mockedRule.muteAll,
          snoozeSchedule: mockedRule.snoozeSchedule,
          alertDelay: mockedRule.alertDelay,
        },
        logger,
        flappingSettings: DEFAULT_FLAPPING_SETTINGS,
        getTimeRange: expect.any(Function),
      });

      expect(alertsClient.hasReachedAlertLimit).toHaveBeenCalled();
      expect(alertsClient.checkLimitUsage).toHaveBeenCalled();
      expect(alertingEventLogger.setExecutionSucceeded).toHaveBeenCalledWith(
        `rule executed: ${RULE_TYPE_ID}:${RULE_ID}: '${RULE_NAME}'`
      );
      expect(ruleRunMetricsStore.setSearchMetrics).toHaveBeenCalled();
      expect(alertsClient.processAlerts).toHaveBeenCalledWith({
        flappingSettings: DEFAULT_FLAPPING_SETTINGS,
        alertDelay: 0,
        ruleRunMetricsStore,
      });
      expect(alertsClient.persistAlerts).toHaveBeenCalled();
      expect(alertsClient.logAlerts).not.toHaveBeenCalled();
    });

    test('should throw error if alertsClient.logAlerts throws error', async () => {
      alertsClient.logAlerts.mockImplementationOnce(() => {
        throw new Error('log alerts failed');
      });

      ruleType.executor.mockResolvedValueOnce({ state: { foo: 'bar' } });

      await expect(
        ruleTypeRunner.run({
          context: {
            alertingEventLogger,
            flappingSettings: DEFAULT_FLAPPING_SETTINGS,
            queryDelaySec: 0,
            request: fakeRequest,
            maintenanceWindowsService,
            ruleId: RULE_ID,
            ruleLogPrefix: `${RULE_TYPE_ID}:${RULE_ID}: '${RULE_NAME}'`,
            ruleRunMetricsStore,
            spaceId: 'default',
          },
          alertsClient,
          executionId: 'abc',
          executorServices: {
            getDataViews,
            ruleMonitoringService: publicRuleMonitoringService,
            ruleResultService: publicRuleResultService,
            savedObjectsClient,
            uiSettingsClient,
            wrappedScopedClusterClient,
            getWrappedSearchSourceClient,
          },
          rule: mockedRule,
          ruleType,
          startedAt: new Date(DATE_1970),
          state: mockTaskInstance().state,
          validatedParams: mockedRuleParams,
        })
      ).rejects.toThrowErrorMatchingInlineSnapshot(`"log alerts failed"`);

      expect(ruleType.executor).toHaveBeenCalledWith({
        executionId: 'abc',
        services: {
          alertFactory: alertsClient.factory(),
          alertsClient: alertsClient.client(),
          getDataViews: expect.any(Function),
          maintenanceWindowsService,
          ruleMonitoringService: publicRuleMonitoringService,
          ruleResultService: publicRuleResultService,
          savedObjectsClient,
          scopedClusterClient: wrappedScopedClusterClient.client(),
          getSearchSourceClient: expect.any(Function),
          share: {},
          shouldStopExecution: expect.any(Function),
          shouldWriteAlerts: expect.any(Function),
          uiSettingsClient,
        },
        params: mockedRuleParams,
        state: mockTaskInstance().state,
        startedAt: new Date(DATE_1970),
        startedAtOverridden: false,
        previousStartedAt: null,
        spaceId: 'default',
        rule: {
          id: RULE_ID,
          name: mockedRule.name,
          tags: mockedRule.tags,
          consumer: mockedRule.consumer,
          producer: ruleType.producer,
          revision: mockedRule.revision,
          ruleTypeId: mockedRule.alertTypeId,
          ruleTypeName: ruleType.name,
          enabled: mockedRule.enabled,
          schedule: mockedRule.schedule,
          actions: mockedRule.actions,
          createdBy: mockedRule.createdBy,
          updatedBy: mockedRule.updatedBy,
          createdAt: mockedRule.createdAt,
          updatedAt: mockedRule.updatedAt,
          throttle: mockedRule.throttle,
          notifyWhen: mockedRule.notifyWhen,
          muteAll: mockedRule.muteAll,
          snoozeSchedule: mockedRule.snoozeSchedule,
          alertDelay: mockedRule.alertDelay,
        },
        logger,
        flappingSettings: DEFAULT_FLAPPING_SETTINGS,
        getTimeRange: expect.any(Function),
      });

      expect(alertsClient.hasReachedAlertLimit).toHaveBeenCalled();
      expect(alertsClient.checkLimitUsage).toHaveBeenCalled();
      expect(alertingEventLogger.setExecutionSucceeded).toHaveBeenCalledWith(
        `rule executed: ${RULE_TYPE_ID}:${RULE_ID}: '${RULE_NAME}'`
      );
      expect(ruleRunMetricsStore.setSearchMetrics).toHaveBeenCalled();
      expect(alertsClient.processAlerts).toHaveBeenCalledWith({
        flappingSettings: DEFAULT_FLAPPING_SETTINGS,
        alertDelay: 0,
        ruleRunMetricsStore,
      });
      expect(alertsClient.persistAlerts).toHaveBeenCalled();
      expect(alertsClient.logAlerts).toHaveBeenCalledWith({
        ruleRunMetricsStore,
        shouldLogAlerts: true,
      });
    });
  });
});

// return enough of TaskRunnerContext that RuleTypeRunner needs
function getTaskRunnerContext() {
  return {
    maxAlerts: 100,
    executionContext: executionContextServiceMock.createInternalStartContract(),
    share: {} as SharePluginStart,
  };
}
