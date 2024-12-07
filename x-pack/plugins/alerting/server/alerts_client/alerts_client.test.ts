/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock, loggingSystemMock } from '@kbn/core/server/mocks';
import type { UpdateByQueryRequest } from '@elastic/elasticsearch/lib/api/types';
import { UntypedNormalizedRuleType } from '../rule_type_registry';
import {
  AlertsFilter,
  DEFAULT_FLAPPING_SETTINGS,
  MaintenanceWindowStatus,
  RecoveredActionGroup,
  RuleAlertData,
} from '../types';
import {
  ALERT_ACTION_GROUP,
  ALERT_CONSECUTIVE_MATCHES,
  ALERT_DURATION,
  ALERT_END,
  ALERT_FLAPPING,
  ALERT_FLAPPING_HISTORY,
  ALERT_INSTANCE_ID,
  ALERT_MAINTENANCE_WINDOW_IDS,
  ALERT_PREVIOUS_ACTION_GROUP,
  ALERT_RULE_CATEGORY,
  ALERT_RULE_CONSUMER,
  ALERT_RULE_EXECUTION_TIMESTAMP,
  ALERT_RULE_EXECUTION_UUID,
  ALERT_RULE_NAME,
  ALERT_RULE_PARAMETERS,
  ALERT_RULE_PRODUCER,
  ALERT_RULE_REVISION,
  ALERT_RULE_TAGS,
  ALERT_RULE_TYPE_ID,
  ALERT_RULE_UUID,
  ALERT_SEVERITY_IMPROVING,
  ALERT_START,
  ALERT_STATUS,
  ALERT_TIME_RANGE,
  ALERT_UUID,
  ALERT_WORKFLOW_STATUS,
  EVENT_ACTION,
  EVENT_KIND,
  SPACE_IDS,
  TAGS,
  TIMESTAMP,
  VERSION,
} from '@kbn/rule-data-utils';
import * as LegacyAlertsClientModule from './legacy_alerts_client';
import { LegacyAlertsClient } from './legacy_alerts_client';
import { Alert } from '../alert/alert';
import { AlertsClient, AlertsClientParams } from './alerts_client';
import {
  GetSummarizedAlertsParams,
  GetMaintenanceWindowScopedQueryAlertsParams,
  ProcessAlertsOpts,
  LogAlertsOpts,
} from './types';
import { legacyAlertsClientMock } from './legacy_alerts_client.mock';
import { keys, range } from 'lodash';
import { alertingEventLoggerMock } from '../lib/alerting_event_logger/alerting_event_logger.mock';
import { ruleRunMetricsStoreMock } from '../lib/rule_run_metrics_store.mock';
import { expandFlattenedAlert } from './lib';
import {
  alertRuleData,
  getExpectedQueryByExecutionUuid,
  getExpectedQueryByTimeRange,
  getParamsByExecutionUuid,
  getParamsByTimeQuery,
  getParamsByMaintenanceWindowScopedQuery,
  getParamsByUpdateMaintenanceWindowIds,
  mockAAD,
} from './alerts_client_fixtures';
import { getDataStreamAdapter } from '../alerts_service/lib/data_stream_adapter';
import { MaintenanceWindow } from '../application/maintenance_window/types';
import { maintenanceWindowsServiceMock } from '../task_runner/maintenance_windows/maintenance_windows_service.mock';
import { getMockMaintenanceWindow } from '../data/maintenance_window/test_helpers';
import { KibanaRequest } from '@kbn/core/server';

const date = '2023-03-28T22:27:28.159Z';
const startedAtDate = '2023-03-28T13:00:00.000Z';
const maxAlerts = 1000;
let logger: ReturnType<(typeof loggingSystemMock)['createLogger']>;
const clusterClient = elasticsearchServiceMock.createClusterClient().asInternalUser;
const alertingEventLogger = alertingEventLoggerMock.create();
const maintenanceWindowsService = maintenanceWindowsServiceMock.create();
const ruleRunMetricsStore = ruleRunMetricsStoreMock.create();

const ruleType: jest.Mocked<UntypedNormalizedRuleType> = {
  id: 'test.rule-type',
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
  doesSetRecoveryContext: true,
  validate: {
    params: { validate: (params) => params },
  },
  alerts: {
    context: 'test',
    mappings: { fieldMap: { field: { type: 'keyword', required: false } } },
    shouldWrite: true,
  },
  validLegacyConsumers: [],
};

const mockLegacyAlertsClient = legacyAlertsClientMock.create();
const mockReplaceState = jest.fn();
const mockGetUuid = jest.fn().mockReturnValue('uuidabc');
const mockGetStart = jest.fn().mockReturnValue(date);
const mockScheduleActions = jest.fn().mockImplementation(() => ({
  replaceState: mockReplaceState,
  getUuid: mockGetUuid,
  getStart: mockGetStart,
}));
const mockCreate = jest.fn().mockImplementation(() => ({
  scheduleActions: mockScheduleActions,
  getUuid: mockGetUuid,
  getStart: mockGetStart,
}));
const mockSetContext = jest.fn();

const trackedAlert1Raw = {
  state: { foo: true, start: '2023-03-28T12:27:28.159Z', duration: '0' },
  meta: {
    flapping: false,
    flappingHistory: [true],
    lastScheduledActions: { group: 'default', date: new Date().toISOString() },
    uuid: 'abc',
  },
};
const trackedAlert1 = new Alert('1', trackedAlert1Raw);
const trackedAlert2Raw = {
  state: { foo: true, start: '2023-03-28T02:27:28.159Z', duration: '36000000000000' },
  meta: {
    flapping: false,
    flappingHistory: [true, false, false],
    lastScheduledActions: { group: 'default', date: new Date().toISOString() },
    uuid: 'def',
  },
};
const trackedAlert2 = new Alert('2', trackedAlert2Raw);
const trackedRecovered3 = new Alert('3', {
  state: { foo: false },
  meta: {
    flapping: false,
    flappingHistory: [true, false, false],
    uuid: 'xyz',
  },
});

const fetchedAlert1 = {
  [TIMESTAMP]: '2023-03-28T12:27:28.159Z',
  [EVENT_ACTION]: 'open',
  [EVENT_KIND]: 'signal',
  [ALERT_ACTION_GROUP]: 'default',
  [ALERT_CONSECUTIVE_MATCHES]: 0,
  [ALERT_DURATION]: 0,
  [ALERT_FLAPPING]: false,
  [ALERT_FLAPPING_HISTORY]: [true],
  [ALERT_INSTANCE_ID]: '1',
  [ALERT_MAINTENANCE_WINDOW_IDS]: [],
  [ALERT_RULE_CATEGORY]: 'My test rule',
  [ALERT_RULE_CONSUMER]: 'bar',
  [ALERT_RULE_EXECUTION_UUID]: '5f6aa57d-3e22-484e-bae8-cbed868f4d28',
  [ALERT_RULE_NAME]: 'rule-name',
  [ALERT_RULE_PARAMETERS]: { bar: true },
  [ALERT_RULE_PRODUCER]: 'alerts',
  [ALERT_RULE_REVISION]: 0,
  [ALERT_RULE_TYPE_ID]: 'test.rule-type',
  [ALERT_RULE_TAGS]: ['rule-', '-tags'],
  [ALERT_RULE_UUID]: '1',
  [ALERT_START]: '2023-03-28T12:27:28.159Z',
  [ALERT_STATUS]: 'active',
  [ALERT_TIME_RANGE]: { gte: '2023-03-28T12:27:28.159Z' },
  [ALERT_UUID]: 'abc',
  [ALERT_WORKFLOW_STATUS]: 'open',
  [SPACE_IDS]: ['default'],
  [VERSION]: '8.8.0',
  [TAGS]: ['rule-', '-tags'],
};

const fetchedAlert2 = {
  [TIMESTAMP]: '2023-03-28T13:27:28.159Z',
  [EVENT_ACTION]: 'active',
  [EVENT_KIND]: 'signal',
  [ALERT_ACTION_GROUP]: 'default',
  [ALERT_CONSECUTIVE_MATCHES]: 0,
  [ALERT_DURATION]: 36000000000,
  [ALERT_FLAPPING]: false,
  [ALERT_FLAPPING_HISTORY]: [true, false],
  [ALERT_INSTANCE_ID]: '2',
  [ALERT_MAINTENANCE_WINDOW_IDS]: [],
  [ALERT_RULE_CATEGORY]: 'My test rule',
  [ALERT_RULE_CONSUMER]: 'bar',
  [ALERT_RULE_EXECUTION_UUID]: '5f6aa57d-3e22-484e-bae8-cbed868f4d28',
  [ALERT_RULE_NAME]: 'rule-name',
  [ALERT_RULE_PARAMETERS]: { bar: true },
  [ALERT_RULE_PRODUCER]: 'alerts',
  [ALERT_RULE_REVISION]: 0,
  [ALERT_RULE_TYPE_ID]: 'test.rule-type',
  [ALERT_RULE_TAGS]: ['rule-', '-tags'],
  [ALERT_RULE_UUID]: '1',
  [ALERT_START]: '2023-03-28T02:27:28.159Z',
  [ALERT_STATUS]: 'active',
  [ALERT_TIME_RANGE]: { gte: '2023-03-28T02:27:28.159Z' },
  [ALERT_UUID]: 'def',
  [ALERT_WORKFLOW_STATUS]: 'open',
  [SPACE_IDS]: ['default'],
  [VERSION]: '8.8.0',
  [TAGS]: ['rule-', '-tags'],
};

const getNewIndexedAlertDoc = (overrides = {}) => ({
  [TIMESTAMP]: date,
  [EVENT_ACTION]: 'open',
  [EVENT_KIND]: 'signal',
  [ALERT_ACTION_GROUP]: 'default',
  [ALERT_CONSECUTIVE_MATCHES]: 1,
  [ALERT_DURATION]: 0,
  [ALERT_FLAPPING]: false,
  [ALERT_FLAPPING_HISTORY]: [true],
  [ALERT_INSTANCE_ID]: '1',
  [ALERT_MAINTENANCE_WINDOW_IDS]: ['test-id1', 'test-id2'],
  [ALERT_RULE_CATEGORY]: 'My test rule',
  [ALERT_RULE_CONSUMER]: 'bar',
  [ALERT_RULE_EXECUTION_UUID]: '5f6aa57d-3e22-484e-bae8-cbed868f4d28',
  [ALERT_RULE_EXECUTION_TIMESTAMP]: date,
  [ALERT_RULE_NAME]: 'rule-name',
  [ALERT_RULE_PARAMETERS]: { bar: true },
  [ALERT_RULE_PRODUCER]: 'alerts',
  [ALERT_RULE_REVISION]: 0,
  [ALERT_RULE_TYPE_ID]: 'test.rule-type',
  [ALERT_RULE_TAGS]: ['rule-', '-tags'],
  [ALERT_RULE_UUID]: '1',
  [ALERT_SEVERITY_IMPROVING]: false,
  [ALERT_START]: date,
  [ALERT_STATUS]: 'active',
  [ALERT_TIME_RANGE]: { gte: date },
  [ALERT_UUID]: 'uuid',
  [ALERT_WORKFLOW_STATUS]: 'open',
  [SPACE_IDS]: ['default'],
  [VERSION]: '8.9.0',
  [TAGS]: ['rule-', '-tags'],
  ...overrides,
});

const getOngoingIndexedAlertDoc = (overrides = {}) => ({
  ...getNewIndexedAlertDoc(),
  [EVENT_ACTION]: 'active',
  [ALERT_DURATION]: 36000000000,
  [ALERT_FLAPPING_HISTORY]: [true, false],
  [ALERT_START]: '2023-03-28T12:27:28.159Z',
  [ALERT_TIME_RANGE]: { gte: '2023-03-28T12:27:28.159Z' },
  [ALERT_PREVIOUS_ACTION_GROUP]: 'default',
  [ALERT_SEVERITY_IMPROVING]: undefined,
  [ALERT_MAINTENANCE_WINDOW_IDS]: [],
  ...overrides,
});

const getRecoveredIndexedAlertDoc = (overrides = {}) => ({
  ...getNewIndexedAlertDoc(),
  [EVENT_ACTION]: 'close',
  [ALERT_DURATION]: 36000000000,
  [ALERT_ACTION_GROUP]: 'recovered',
  [ALERT_FLAPPING_HISTORY]: [true, true],
  [ALERT_START]: '2023-03-28T12:27:28.159Z',
  [ALERT_END]: date,
  [ALERT_TIME_RANGE]: { gte: '2023-03-28T12:27:28.159Z', lte: date },
  [ALERT_STATUS]: 'recovered',
  [ALERT_CONSECUTIVE_MATCHES]: 0,
  [ALERT_PREVIOUS_ACTION_GROUP]: 'default',
  [ALERT_SEVERITY_IMPROVING]: true,
  [ALERT_MAINTENANCE_WINDOW_IDS]: [],
  ...overrides,
});

const defaultExecutionOpts = {
  maxAlerts,
  ruleLabel: `test: rule-name`,
  flappingSettings: DEFAULT_FLAPPING_SETTINGS,
  activeAlertsFromState: {},
  recoveredAlertsFromState: {},
  startedAt: null,
};

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

const ruleInfo = `for test.rule-type:1 'rule-name'`;
const logTags = { tags: ['test.rule-type', '1', 'alerts-client'] };

describe('Alerts Client', () => {
  let alertsClientParams: AlertsClientParams;
  let processAlertsOpts: ProcessAlertsOpts;
  let logAlertsOpts: LogAlertsOpts;

  beforeAll(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(date));
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  for (const useDataStreamForAlerts of [false, true]) {
    const label = useDataStreamForAlerts ? 'data streams' : 'aliases';

    describe(`using ${label} for alert indices`, () => {
      beforeEach(() => {
        jest.clearAllMocks();
        logger = loggingSystemMock.createLogger();
        alertsClientParams = {
          alertingEventLogger,
          logger,
          elasticsearchClientPromise: Promise.resolve(clusterClient),
          request: fakeRequest,
          ruleType,
          maintenanceWindowsService,
          namespace: 'default',
          rule: alertRuleData,
          kibanaVersion: '8.9.0',
          spaceId: 'space1',
          isServerless: false,
          dataStreamAdapter: getDataStreamAdapter({ useDataStreamForAlerts }),
        };
        maintenanceWindowsService.getMaintenanceWindows.mockReturnValue({
          maintenanceWindows: [
            {
              ...getMockMaintenanceWindow(),
              eventStartTime: new Date().toISOString(),
              eventEndTime: new Date().toISOString(),
              status: MaintenanceWindowStatus.Running,
              id: 'test-id1',
            },
            {
              ...getMockMaintenanceWindow(),
              eventStartTime: new Date().toISOString(),
              eventEndTime: new Date().toISOString(),
              status: MaintenanceWindowStatus.Running,
              id: 'test-id2',
            },
          ],
          maintenanceWindowsWithoutScopedQueryIds: ['test-id1', 'test-id2'],
        });
        processAlertsOpts = {
          ruleRunMetricsStore,
          flappingSettings: DEFAULT_FLAPPING_SETTINGS,
          alertDelay: 0,
        };
        logAlertsOpts = { shouldLogAlerts: false, ruleRunMetricsStore };
      });

      describe('initializeExecution()', () => {
        test('should initialize LegacyAlertsClient', async () => {
          mockLegacyAlertsClient.getTrackedAlerts.mockImplementation(() => ({
            active: {},
            recovered: {},
          }));
          const spy = jest
            .spyOn(LegacyAlertsClientModule, 'LegacyAlertsClient')
            .mockImplementation(() => mockLegacyAlertsClient);

          const alertsClient = new AlertsClient(alertsClientParams);

          await alertsClient.initializeExecution(defaultExecutionOpts);
          expect(mockLegacyAlertsClient.initializeExecution).toHaveBeenCalledWith(
            defaultExecutionOpts
          );

          // no alerts to query for
          expect(clusterClient.search).not.toHaveBeenCalled();

          spy.mockRestore();
        });

        test('should skip track alerts ruleType shouldWrite is false', async () => {
          const spy = jest
            .spyOn(LegacyAlertsClientModule, 'LegacyAlertsClient')
            .mockImplementation(() => mockLegacyAlertsClient);

          const alertsClient = new AlertsClient({
            ...alertsClientParams,
            ruleType: {
              ...alertsClientParams.ruleType,
              alerts: {
                context: 'test',
                mappings: { fieldMap: { field: { type: 'keyword', required: false } } },
                shouldWrite: false,
              },
            },
          });

          await alertsClient.initializeExecution(defaultExecutionOpts);
          expect(mockLegacyAlertsClient.initializeExecution).toHaveBeenCalledWith(
            defaultExecutionOpts
          );
          expect(mockLegacyAlertsClient.getTrackedAlerts).not.toHaveBeenCalled();
          spy.mockRestore();
        });

        test('should query for alert UUIDs if they exist', async () => {
          mockLegacyAlertsClient.getTrackedAlerts.mockImplementation(() => ({
            active: { '1': trackedAlert1, '2': trackedAlert2 },
            recovered: { '3': trackedRecovered3 },
          }));
          const spy = jest
            .spyOn(LegacyAlertsClientModule, 'LegacyAlertsClient')
            .mockImplementation(() => mockLegacyAlertsClient);

          const alertsClient = new AlertsClient(alertsClientParams);

          await alertsClient.initializeExecution(defaultExecutionOpts);
          expect(mockLegacyAlertsClient.initializeExecution).toHaveBeenCalledWith(
            defaultExecutionOpts
          );

          expect(clusterClient.search).toHaveBeenCalledWith({
            body: {
              query: {
                bool: {
                  filter: [
                    { term: { 'kibana.alert.rule.uuid': '1' } },
                    { terms: { 'kibana.alert.uuid': ['abc', 'def', 'xyz'] } },
                  ],
                },
              },
              seq_no_primary_term: true,
              size: 3,
            },
            index: useDataStreamForAlerts
              ? '.alerts-test.alerts-default'
              : '.internal.alerts-test.alerts-default-*',
            ignore_unavailable: true,
          });

          spy.mockRestore();
        });

        test('should split queries into chunks when there are greater than 10,000 alert UUIDs', async () => {
          mockLegacyAlertsClient.getTrackedAlerts.mockImplementation(() => ({
            active: range(15000).reduce((acc: Record<string, Alert<{}, {}>>, value: number) => {
              const id: string = `${value}`;
              acc[id] = new Alert(id, {
                state: { foo: true },
                meta: {
                  flapping: false,
                  flappingHistory: [true, false],
                  lastScheduledActions: { group: 'default', date: new Date().toISOString() },
                  uuid: id,
                },
              });
              return acc;
            }, {}),
            recovered: {},
          }));
          const spy = jest
            .spyOn(LegacyAlertsClientModule, 'LegacyAlertsClient')
            .mockImplementation(() => mockLegacyAlertsClient);

          const alertsClient = new AlertsClient(alertsClientParams);

          await alertsClient.initializeExecution(defaultExecutionOpts);
          expect(mockLegacyAlertsClient.initializeExecution).toHaveBeenCalledWith(
            defaultExecutionOpts
          );

          expect(clusterClient.search).toHaveBeenCalledTimes(2);

          spy.mockRestore();
        });

        test('should log but not throw if query returns error', async () => {
          clusterClient.search.mockImplementation(() => {
            throw new Error('search failed!');
          });
          mockLegacyAlertsClient.getTrackedAlerts.mockImplementation(() => ({
            active: { '1': trackedAlert1 },
            recovered: {},
          }));
          const spy = jest
            .spyOn(LegacyAlertsClientModule, 'LegacyAlertsClient')
            .mockImplementation(() => mockLegacyAlertsClient);

          const alertsClient = new AlertsClient(alertsClientParams);

          await alertsClient.initializeExecution(defaultExecutionOpts);
          expect(mockLegacyAlertsClient.initializeExecution).toHaveBeenCalledWith(
            defaultExecutionOpts
          );

          expect(clusterClient.search).toHaveBeenCalledWith({
            body: {
              query: {
                bool: {
                  filter: [
                    { term: { 'kibana.alert.rule.uuid': '1' } },
                    { terms: { 'kibana.alert.uuid': ['abc'] } },
                  ],
                },
              },
              size: 1,
              seq_no_primary_term: true,
            },
            index: useDataStreamForAlerts
              ? '.alerts-test.alerts-default'
              : '.internal.alerts-test.alerts-default-*',
            ignore_unavailable: true,
          });

          expect(logger.error).toHaveBeenCalledWith(
            `Error searching for tracked alerts by UUID ${ruleInfo} - search failed!`,
            logTags
          );

          spy.mockRestore();
        });
      });

      describe('persistAlerts()', () => {
        test('should index new alerts with refresh: wait_for in stateful', async () => {
          const alertsClient = new AlertsClient<{}, {}, {}, 'default', 'recovered'>({
            ...alertsClientParams,
            isServerless: false,
          });

          await alertsClient.initializeExecution(defaultExecutionOpts);

          // Report 2 new alerts
          const alertExecutorService = alertsClient.factory();
          alertExecutorService.create('1').scheduleActions('default');
          alertExecutorService.create('2').scheduleActions('default');

          await alertsClient.processAlerts(processAlertsOpts);
          alertsClient.logAlerts(logAlertsOpts);

          await alertsClient.persistAlerts();

          const { alertsToReturn } = alertsClient.getAlertsToSerialize();
          const uuid1 = alertsToReturn['1'].meta?.uuid;
          const uuid2 = alertsToReturn['2'].meta?.uuid;

          expect(clusterClient.bulk).toHaveBeenCalledWith({
            index: '.alerts-test.alerts-default',
            refresh: 'wait_for',
            require_alias: !useDataStreamForAlerts,
            body: [
              {
                create: { _id: uuid1, ...(useDataStreamForAlerts ? {} : { require_alias: true }) },
              },
              // new alert doc
              getNewIndexedAlertDoc({ [ALERT_UUID]: uuid1 }),
              {
                create: { _id: uuid2, ...(useDataStreamForAlerts ? {} : { require_alias: true }) },
              },
              // new alert doc
              getNewIndexedAlertDoc({ [ALERT_UUID]: uuid2, [ALERT_INSTANCE_ID]: '2' }),
            ],
          });
          expect(maintenanceWindowsService.getMaintenanceWindows).toHaveBeenCalledWith({
            eventLogger: alertingEventLogger,
            request: fakeRequest,
            ruleTypeCategory: 'test',
            spaceId: 'space1',
          });
        });

        test('should index new alerts with refresh: true in stateless', async () => {
          const alertsClient = new AlertsClient<{}, {}, {}, 'default', 'recovered'>({
            ...alertsClientParams,
            isServerless: true,
          });

          await alertsClient.initializeExecution(defaultExecutionOpts);

          // Report 2 new alerts
          const alertExecutorService = alertsClient.factory();
          alertExecutorService.create('1').scheduleActions('default');
          alertExecutorService.create('2').scheduleActions('default');

          await alertsClient.processAlerts(processAlertsOpts);
          alertsClient.logAlerts(logAlertsOpts);

          await alertsClient.persistAlerts();

          const { alertsToReturn } = alertsClient.getAlertsToSerialize();
          const uuid1 = alertsToReturn['1'].meta?.uuid;
          const uuid2 = alertsToReturn['2'].meta?.uuid;

          expect(clusterClient.bulk).toHaveBeenCalledWith({
            index: '.alerts-test.alerts-default',
            refresh: true,
            require_alias: !useDataStreamForAlerts,
            body: [
              {
                create: { _id: uuid1, ...(useDataStreamForAlerts ? {} : { require_alias: true }) },
              },
              // new alert doc
              getNewIndexedAlertDoc({ [ALERT_UUID]: uuid1 }),
              {
                create: { _id: uuid2, ...(useDataStreamForAlerts ? {} : { require_alias: true }) },
              },
              // new alert doc
              getNewIndexedAlertDoc({ [ALERT_UUID]: uuid2, [ALERT_INSTANCE_ID]: '2' }),
            ],
          });
          expect(maintenanceWindowsService.getMaintenanceWindows).toHaveBeenCalledWith({
            eventLogger: alertingEventLogger,
            request: fakeRequest,
            ruleTypeCategory: 'test',
            spaceId: 'space1',
          });
        });

        test('should not index new alerts if the activeCount is less than the rule alertDelay', async () => {
          const alertsClient = new AlertsClient<{}, {}, {}, 'default', 'recovered'>({
            ...alertsClientParams,
            rule: { ...alertsClientParams.rule, alertDelay: 3 },
          });

          await alertsClient.initializeExecution(defaultExecutionOpts);

          // Report 1 new alerts
          const alertExecutorService = alertsClient.factory();
          alertExecutorService.create('1').scheduleActions('default');

          await alertsClient.processAlerts(processAlertsOpts);
          alertsClient.logAlerts(logAlertsOpts);

          await alertsClient.persistAlerts();

          expect(clusterClient.bulk).not.toHaveBeenCalled();
          expect(maintenanceWindowsService.getMaintenanceWindows).toHaveBeenCalledWith({
            eventLogger: alertingEventLogger,
            request: fakeRequest,
            ruleTypeCategory: 'test',
            spaceId: 'space1',
          });
        });

        test('should update ongoing alerts in existing index', async () => {
          clusterClient.search.mockResolvedValue({
            took: 10,
            timed_out: false,
            _shards: { failed: 0, successful: 1, total: 1, skipped: 0 },
            hits: {
              total: { relation: 'eq', value: 1 },
              hits: [
                {
                  _id: 'abc',
                  _index: '.internal.alerts-test.alerts-default-000001',
                  _seq_no: 41,
                  _primary_term: 665,
                  _source: fetchedAlert1,
                },
              ],
            },
          });
          const alertsClient = new AlertsClient<{}, {}, {}, 'default', 'recovered'>(
            alertsClientParams
          );

          await alertsClient.initializeExecution({
            ...defaultExecutionOpts,
            activeAlertsFromState: {
              '1': trackedAlert1Raw,
            },
          });

          // Report 1 new alert and 1 active alert
          const alertExecutorService = alertsClient.factory();
          alertExecutorService.create('1').scheduleActions('default');
          alertExecutorService.create('2').scheduleActions('default');

          await alertsClient.processAlerts(processAlertsOpts);
          alertsClient.logAlerts(logAlertsOpts);

          await alertsClient.persistAlerts();

          const { alertsToReturn } = alertsClient.getAlertsToSerialize();
          const uuid2 = alertsToReturn['2'].meta?.uuid;

          expect(clusterClient.bulk).toHaveBeenCalledWith({
            index: '.alerts-test.alerts-default',
            refresh: 'wait_for',
            require_alias: !useDataStreamForAlerts,
            body: [
              {
                index: {
                  _id: 'abc',
                  _index: '.internal.alerts-test.alerts-default-000001',
                  if_seq_no: 41,
                  if_primary_term: 665,
                  require_alias: false,
                },
              },
              // ongoing alert doc
              getOngoingIndexedAlertDoc({ [ALERT_UUID]: 'abc' }),
              {
                create: { _id: uuid2, ...(useDataStreamForAlerts ? {} : { require_alias: true }) },
              },
              // new alert doc
              getNewIndexedAlertDoc({ [ALERT_UUID]: uuid2, [ALERT_INSTANCE_ID]: '2' }),
            ],
          });
          expect(maintenanceWindowsService.getMaintenanceWindows).toHaveBeenCalledWith({
            eventLogger: alertingEventLogger,
            request: fakeRequest,
            ruleTypeCategory: 'test',
            spaceId: 'space1',
          });
        });

        test('should update unflattened ongoing alerts in existing index', async () => {
          clusterClient.search.mockResolvedValue({
            took: 10,
            timed_out: false,
            _shards: { failed: 0, successful: 1, total: 1, skipped: 0 },
            hits: {
              total: { relation: 'eq', value: 1 },
              hits: [
                {
                  _id: 'abc',
                  _index: '.internal.alerts-test.alerts-default-000001',
                  _seq_no: 41,
                  _primary_term: 665,
                  _source: expandFlattenedAlert(fetchedAlert1),
                },
              ],
            },
          });
          const alertsClient = new AlertsClient<{}, {}, {}, 'default', 'recovered'>(
            alertsClientParams
          );

          await alertsClient.initializeExecution({
            ...defaultExecutionOpts,
            activeAlertsFromState: {
              '1': trackedAlert1Raw,
            },
          });

          // Report 1 new alert and 1 active alert
          const alertExecutorService = alertsClient.factory();
          alertExecutorService.create('1').scheduleActions('default');
          alertExecutorService.create('2').scheduleActions('default');

          await alertsClient.processAlerts(processAlertsOpts);
          alertsClient.logAlerts(logAlertsOpts);

          await alertsClient.persistAlerts();

          const { alertsToReturn } = alertsClient.getAlertsToSerialize();
          const uuid2 = alertsToReturn['2'].meta?.uuid;

          expect(clusterClient.bulk).toHaveBeenCalledWith({
            index: '.alerts-test.alerts-default',
            refresh: 'wait_for',
            require_alias: !useDataStreamForAlerts,
            body: [
              {
                index: {
                  _id: 'abc',
                  _index: '.internal.alerts-test.alerts-default-000001',
                  if_seq_no: 41,
                  if_primary_term: 665,
                  require_alias: false,
                },
              },
              // ongoing alert doc
              {
                event: { kind: 'signal' },
                kibana: {
                  alert: {
                    instance: { id: '1' },
                    start: '2023-03-28T12:27:28.159Z',
                    uuid: 'abc',
                  },
                },
                [TIMESTAMP]: date,
                [ALERT_RULE_EXECUTION_TIMESTAMP]: date,
                [EVENT_ACTION]: 'active',
                [ALERT_ACTION_GROUP]: 'default',
                [ALERT_CONSECUTIVE_MATCHES]: 1,
                [ALERT_DURATION]: 36000000000,
                [ALERT_FLAPPING]: false,
                [ALERT_FLAPPING_HISTORY]: [true, false],
                [ALERT_MAINTENANCE_WINDOW_IDS]: [],
                [ALERT_PREVIOUS_ACTION_GROUP]: 'default',
                [ALERT_RULE_CATEGORY]: 'My test rule',
                [ALERT_RULE_CONSUMER]: 'bar',
                [ALERT_RULE_EXECUTION_UUID]: '5f6aa57d-3e22-484e-bae8-cbed868f4d28',
                [ALERT_RULE_NAME]: 'rule-name',
                [ALERT_RULE_PARAMETERS]: { bar: true },
                [ALERT_RULE_PRODUCER]: 'alerts',
                [ALERT_RULE_REVISION]: 0,
                [ALERT_RULE_TYPE_ID]: 'test.rule-type',
                [ALERT_RULE_TAGS]: ['rule-', '-tags'],
                [ALERT_RULE_UUID]: '1',
                [ALERT_STATUS]: 'active',
                [ALERT_TIME_RANGE]: { gte: '2023-03-28T12:27:28.159Z' },
                [ALERT_WORKFLOW_STATUS]: 'open',
                [SPACE_IDS]: ['default'],
                [VERSION]: '8.9.0',
                [TAGS]: ['rule-', '-tags'],
              },
              {
                create: { _id: uuid2, ...(useDataStreamForAlerts ? {} : { require_alias: true }) },
              },
              // new alert doc
              getNewIndexedAlertDoc({ [ALERT_UUID]: uuid2, [ALERT_INSTANCE_ID]: '2' }),
            ],
          });
          expect(maintenanceWindowsService.getMaintenanceWindows).toHaveBeenCalledWith({
            eventLogger: alertingEventLogger,
            request: fakeRequest,
            ruleTypeCategory: 'test',
            spaceId: 'space1',
          });
        });

        test('should not update ongoing alerts in existing index when they are not in the processed alerts', async () => {
          const activeAlert = {
            state: { foo: true, start: '2023-03-28T12:27:28.159Z', duration: '36000000000000' },
            meta: {
              flapping: false,
              flappingHistory: [true, false],
              maintenanceWindowIds: [],
              lastScheduledActions: { group: 'default', date: new Date().toISOString() },
              uuid: 'abc',
            },
          };

          const activeAlertObj = new Alert<{}, {}, 'default'>('1', activeAlert);
          activeAlertObj.scheduleActions('default', {});
          const spy = jest
            .spyOn(LegacyAlertsClient.prototype, 'getProcessedAlerts')
            .mockReturnValueOnce({
              '1': activeAlertObj, // return only the first (tracked) alert
            })
            .mockReturnValueOnce({})
            .mockReturnValueOnce({});

          clusterClient.search.mockResolvedValue({
            took: 10,
            timed_out: false,
            _shards: { failed: 0, successful: 1, total: 1, skipped: 0 },
            hits: {
              total: { relation: 'eq', value: 1 },
              hits: [
                {
                  _id: 'abc',
                  _index: '.internal.alerts-test.alerts-default-000001',
                  _source: fetchedAlert1,
                },
              ],
            },
          });
          const alertsClient = new AlertsClient<{}, {}, {}, 'default', 'recovered'>(
            alertsClientParams
          );

          await alertsClient.initializeExecution({
            ...defaultExecutionOpts,
            activeAlertsFromState: {
              '1': activeAlert,
            },
          });

          // Report 1 new alert and 1 active alert
          const alertExecutorService = alertsClient.factory();
          alertExecutorService.create('1').scheduleActions('default');
          alertExecutorService.create('2').scheduleActions('default'); // will be skipped as getProcessedAlerts does not return it

          await alertsClient.processAlerts(processAlertsOpts);
          alertsClient.logAlerts(logAlertsOpts);

          await alertsClient.persistAlerts();

          expect(spy).toHaveBeenCalledTimes(5);
          expect(spy).toHaveBeenNthCalledWith(1, 'active');
          expect(spy).toHaveBeenNthCalledWith(2, 'recoveredCurrent');
          expect(spy).toHaveBeenNthCalledWith(3, 'new');

          expect(logger.error).toHaveBeenCalledWith(
            `Error writing alert(2) to .alerts-test.alerts-default - alert(2) doesn't exist in active alerts ${ruleInfo}.`,
            logTags
          );
          spy.mockRestore();

          expect(clusterClient.bulk).toHaveBeenCalledWith({
            index: '.alerts-test.alerts-default',
            refresh: 'wait_for',
            require_alias: !useDataStreamForAlerts,
            body: [
              {
                create: {
                  _id: 'abc',
                  ...(useDataStreamForAlerts ? {} : { require_alias: true }),
                },
              },
              // ongoing alert doc
              getOngoingIndexedAlertDoc({ [ALERT_UUID]: 'abc', [ALERT_CONSECUTIVE_MATCHES]: 0 }),
            ],
          });
          expect(maintenanceWindowsService.getMaintenanceWindows).toHaveBeenCalledWith({
            eventLogger: alertingEventLogger,
            request: fakeRequest,
            ruleTypeCategory: 'test',
            spaceId: 'space1',
          });
        });

        test('should recover recovered alerts in existing index', async () => {
          clusterClient.search.mockResolvedValue({
            took: 10,
            timed_out: false,
            _shards: { failed: 0, successful: 1, total: 1, skipped: 0 },
            hits: {
              total: { relation: 'eq', value: 2 },
              hits: [
                {
                  _id: 'abc',
                  _index: '.internal.alerts-test.alerts-default-000001',
                  _seq_no: 41,
                  _primary_term: 665,
                  _source: fetchedAlert1,
                },
                {
                  _id: 'def',
                  _index: '.internal.alerts-test.alerts-default-000002',
                  _seq_no: 42,
                  _primary_term: 666,
                  _source: fetchedAlert2,
                },
              ],
            },
          });
          const alertsClient = new AlertsClient<{}, {}, {}, 'default', 'recovered'>(
            alertsClientParams
          );

          await alertsClient.initializeExecution({
            ...defaultExecutionOpts,
            activeAlertsFromState: {
              '1': trackedAlert1Raw,
              '2': trackedAlert2Raw,
            },
          });

          // Report 1 new alert and 1 active alert, recover 1 alert
          const alertExecutorService = alertsClient.factory();
          alertExecutorService.create('2').scheduleActions('default');
          alertExecutorService.create('3').scheduleActions('default');

          await alertsClient.processAlerts(processAlertsOpts);
          alertsClient.logAlerts(logAlertsOpts);

          await alertsClient.persistAlerts();

          const { alertsToReturn } = alertsClient.getAlertsToSerialize();
          const uuid3 = alertsToReturn['3'].meta?.uuid;

          expect(clusterClient.bulk).toHaveBeenCalledWith({
            index: '.alerts-test.alerts-default',
            refresh: 'wait_for',
            require_alias: !useDataStreamForAlerts,
            body: [
              {
                index: {
                  _id: 'def',
                  _index: '.internal.alerts-test.alerts-default-000002',
                  if_seq_no: 42,
                  if_primary_term: 666,
                  require_alias: false,
                },
              },
              // ongoing alert doc
              getOngoingIndexedAlertDoc({
                [ALERT_UUID]: 'def',
                [ALERT_INSTANCE_ID]: '2',
                [ALERT_FLAPPING_HISTORY]: [true, false, false, false],
                [ALERT_DURATION]: 72000000000,
                [ALERT_START]: '2023-03-28T02:27:28.159Z',
                [ALERT_TIME_RANGE]: { gte: '2023-03-28T02:27:28.159Z' },
              }),
              {
                create: { _id: uuid3, ...(useDataStreamForAlerts ? {} : { require_alias: true }) },
              },
              // new alert doc
              getNewIndexedAlertDoc({ [ALERT_UUID]: uuid3, [ALERT_INSTANCE_ID]: '3' }),
              {
                index: {
                  _id: 'abc',
                  _index: '.internal.alerts-test.alerts-default-000001',
                  if_seq_no: 41,
                  if_primary_term: 665,
                  require_alias: false,
                },
              },
              // recovered alert doc
              getRecoveredIndexedAlertDoc({ [ALERT_UUID]: 'abc' }),
            ],
          });
          expect(maintenanceWindowsService.getMaintenanceWindows).toHaveBeenCalledWith({
            eventLogger: alertingEventLogger,
            request: fakeRequest,
            ruleTypeCategory: 'test',
            spaceId: 'space1',
          });
        });

        test('should recover unflattened recovered alerts in existing index', async () => {
          clusterClient.search.mockResolvedValue({
            took: 10,
            timed_out: false,
            _shards: { failed: 0, successful: 1, total: 1, skipped: 0 },
            hits: {
              total: { relation: 'eq', value: 2 },
              hits: [
                {
                  _id: 'abc',
                  _index: '.internal.alerts-test.alerts-default-000001',
                  _seq_no: 41,
                  _primary_term: 665,
                  _source: expandFlattenedAlert(fetchedAlert1),
                },
                {
                  _id: 'def',
                  _index: '.internal.alerts-test.alerts-default-000002',
                  _seq_no: 42,
                  _primary_term: 666,
                  _source: expandFlattenedAlert(fetchedAlert2),
                },
              ],
            },
          });
          const alertsClient = new AlertsClient<{}, {}, {}, 'default', 'recovered'>(
            alertsClientParams
          );

          await alertsClient.initializeExecution({
            ...defaultExecutionOpts,
            activeAlertsFromState: {
              '1': trackedAlert1Raw,
              '2': trackedAlert2Raw,
            },
          });

          // Report 1 new alert and 1 active alert, recover 1 alert
          const alertExecutorService = alertsClient.factory();
          alertExecutorService.create('2').scheduleActions('default');
          alertExecutorService.create('3').scheduleActions('default');

          await alertsClient.processAlerts(processAlertsOpts);
          alertsClient.logAlerts(logAlertsOpts);

          await alertsClient.persistAlerts();

          const { alertsToReturn } = alertsClient.getAlertsToSerialize();
          const uuid3 = alertsToReturn['3'].meta?.uuid;

          expect(clusterClient.bulk).toHaveBeenCalledWith({
            index: '.alerts-test.alerts-default',
            refresh: 'wait_for',
            require_alias: !useDataStreamForAlerts,
            body: [
              {
                index: {
                  _id: 'def',
                  _index: '.internal.alerts-test.alerts-default-000002',
                  if_seq_no: 42,
                  if_primary_term: 666,
                  require_alias: false,
                },
              },
              // ongoing alert doc
              {
                event: { kind: 'signal' },
                kibana: {
                  alert: {
                    instance: { id: '2' },
                    start: '2023-03-28T02:27:28.159Z',
                    uuid: 'def',
                  },
                },
                [TIMESTAMP]: date,
                [ALERT_RULE_EXECUTION_TIMESTAMP]: date,
                [EVENT_ACTION]: 'active',
                [ALERT_ACTION_GROUP]: 'default',
                [ALERT_CONSECUTIVE_MATCHES]: 1,
                [ALERT_DURATION]: 72000000000,
                [ALERT_FLAPPING]: false,
                [ALERT_FLAPPING_HISTORY]: [true, false, false, false],
                [ALERT_MAINTENANCE_WINDOW_IDS]: [],
                [ALERT_PREVIOUS_ACTION_GROUP]: 'default',
                [ALERT_RULE_CATEGORY]: 'My test rule',
                [ALERT_RULE_CONSUMER]: 'bar',
                [ALERT_RULE_EXECUTION_UUID]: '5f6aa57d-3e22-484e-bae8-cbed868f4d28',
                [ALERT_RULE_NAME]: 'rule-name',
                [ALERT_RULE_PARAMETERS]: { bar: true },
                [ALERT_RULE_PRODUCER]: 'alerts',
                [ALERT_RULE_REVISION]: 0,
                [ALERT_RULE_TYPE_ID]: 'test.rule-type',
                [ALERT_RULE_TAGS]: ['rule-', '-tags'],
                [ALERT_RULE_UUID]: '1',
                [ALERT_STATUS]: 'active',
                [ALERT_TIME_RANGE]: { gte: '2023-03-28T02:27:28.159Z' },
                [ALERT_WORKFLOW_STATUS]: 'open',
                [SPACE_IDS]: ['default'],
                [VERSION]: '8.9.0',
                [TAGS]: ['rule-', '-tags'],
              },
              {
                create: { _id: uuid3, ...(useDataStreamForAlerts ? {} : { require_alias: true }) },
              },
              // new alert doc
              getNewIndexedAlertDoc({ [ALERT_UUID]: uuid3, [ALERT_INSTANCE_ID]: '3' }),
              {
                index: {
                  _id: 'abc',
                  _index: '.internal.alerts-test.alerts-default-000001',
                  if_seq_no: 41,
                  if_primary_term: 665,
                  require_alias: false,
                },
              },
              // recovered alert doc
              {
                event: { kind: 'signal' },
                kibana: {
                  alert: {
                    instance: { id: '1' },
                    uuid: 'abc',
                  },
                },
                [TIMESTAMP]: date,
                [ALERT_RULE_EXECUTION_TIMESTAMP]: date,
                [EVENT_ACTION]: 'close',
                [ALERT_ACTION_GROUP]: 'recovered',
                [ALERT_CONSECUTIVE_MATCHES]: 0,
                [ALERT_DURATION]: 36000000000,
                [ALERT_FLAPPING]: false,
                [ALERT_FLAPPING_HISTORY]: [true, true],
                [ALERT_MAINTENANCE_WINDOW_IDS]: [],
                [ALERT_PREVIOUS_ACTION_GROUP]: 'default',
                [ALERT_RULE_CATEGORY]: 'My test rule',
                [ALERT_RULE_CONSUMER]: 'bar',
                [ALERT_RULE_EXECUTION_UUID]: '5f6aa57d-3e22-484e-bae8-cbed868f4d28',
                [ALERT_RULE_NAME]: 'rule-name',
                [ALERT_RULE_PARAMETERS]: { bar: true },
                [ALERT_RULE_PRODUCER]: 'alerts',
                [ALERT_RULE_REVISION]: 0,
                [ALERT_RULE_TYPE_ID]: 'test.rule-type',
                [ALERT_RULE_TAGS]: ['rule-', '-tags'],
                [ALERT_RULE_UUID]: '1',
                [ALERT_SEVERITY_IMPROVING]: true,
                [ALERT_START]: '2023-03-28T12:27:28.159Z',
                [ALERT_END]: date,
                [ALERT_STATUS]: 'recovered',
                [ALERT_TIME_RANGE]: { gte: '2023-03-28T12:27:28.159Z', lte: date },
                [ALERT_WORKFLOW_STATUS]: 'open',
                [SPACE_IDS]: ['default'],
                [VERSION]: '8.9.0',
                [TAGS]: ['rule-', '-tags'],
              },
            ],
          });
          expect(maintenanceWindowsService.getMaintenanceWindows).toHaveBeenCalledWith({
            eventLogger: alertingEventLogger,
            request: fakeRequest,
            ruleTypeCategory: 'test',
            spaceId: 'space1',
          });
        });

        test('should use startedAt time if provided', async () => {
          clusterClient.search.mockResolvedValue({
            took: 10,
            timed_out: false,
            _shards: { failed: 0, successful: 1, total: 1, skipped: 0 },
            hits: {
              total: { relation: 'eq', value: 2 },
              hits: [
                {
                  _id: 'abc',
                  _index: '.internal.alerts-test.alerts-default-000001',
                  _seq_no: 41,
                  _primary_term: 665,
                  _source: fetchedAlert1,
                },
                {
                  _id: 'def',
                  _index: '.internal.alerts-test.alerts-default-000002',
                  _seq_no: 42,
                  _primary_term: 666,
                  _source: fetchedAlert2,
                },
              ],
            },
          });
          const alertsClient = new AlertsClient<{}, {}, {}, 'default', 'recovered'>(
            alertsClientParams
          );

          await alertsClient.initializeExecution({
            ...defaultExecutionOpts,
            activeAlertsFromState: {
              '1': trackedAlert1Raw,
              '2': trackedAlert2Raw,
            },
            startedAt: new Date(startedAtDate),
          });

          // Report 1 new alert and 1 active alert, recover 1 alert
          const alertExecutorService = alertsClient.factory();
          alertExecutorService.create('2').scheduleActions('default');
          alertExecutorService.create('3').scheduleActions('default');

          await alertsClient.processAlerts(processAlertsOpts);
          alertsClient.logAlerts(logAlertsOpts);

          await alertsClient.persistAlerts();

          const { alertsToReturn } = alertsClient.getAlertsToSerialize();
          const uuid3 = alertsToReturn['3'].meta?.uuid;

          expect(clusterClient.bulk).toHaveBeenCalledWith({
            index: '.alerts-test.alerts-default',
            refresh: 'wait_for',
            require_alias: !useDataStreamForAlerts,
            body: [
              {
                index: {
                  _id: 'def',
                  _index: '.internal.alerts-test.alerts-default-000002',
                  if_seq_no: 42,
                  if_primary_term: 666,
                  require_alias: false,
                },
              },
              // ongoing alert doc
              getOngoingIndexedAlertDoc({
                [TIMESTAMP]: startedAtDate,
                [ALERT_RULE_EXECUTION_TIMESTAMP]: startedAtDate,
                [ALERT_UUID]: 'def',
                [ALERT_INSTANCE_ID]: '2',
                [ALERT_FLAPPING_HISTORY]: [true, false, false, false],
                [ALERT_DURATION]: 37951841000,
                [ALERT_START]: '2023-03-28T02:27:28.159Z',
                [ALERT_TIME_RANGE]: { gte: '2023-03-28T02:27:28.159Z' },
              }),
              {
                create: { _id: uuid3, ...(useDataStreamForAlerts ? {} : { require_alias: true }) },
              },
              // new alert doc
              getNewIndexedAlertDoc({
                [TIMESTAMP]: startedAtDate,
                [ALERT_RULE_EXECUTION_TIMESTAMP]: startedAtDate,
                [ALERT_UUID]: uuid3,
                [ALERT_INSTANCE_ID]: '3',
                [ALERT_START]: startedAtDate,
                [ALERT_TIME_RANGE]: { gte: startedAtDate },
              }),
              {
                index: {
                  _id: 'abc',
                  _index: '.internal.alerts-test.alerts-default-000001',
                  if_seq_no: 41,
                  if_primary_term: 665,
                  require_alias: false,
                },
              },
              // recovered alert doc
              getRecoveredIndexedAlertDoc({
                [TIMESTAMP]: startedAtDate,
                [ALERT_RULE_EXECUTION_TIMESTAMP]: startedAtDate,
                [ALERT_DURATION]: 1951841000,
                [ALERT_UUID]: 'abc',
                [ALERT_END]: startedAtDate,
                [ALERT_TIME_RANGE]: { gte: '2023-03-28T12:27:28.159Z', lte: startedAtDate },
              }),
            ],
          });
          expect(maintenanceWindowsService.getMaintenanceWindows).toHaveBeenCalledWith({
            eventLogger: alertingEventLogger,
            request: fakeRequest,
            ruleTypeCategory: 'test',
            spaceId: 'space1',
          });
        });

        test('should use runTimestamp time if provided', async () => {
          const runTimestamp = '2023-10-01T00:00:00.000Z';
          clusterClient.search.mockResolvedValue({
            took: 10,
            timed_out: false,
            _shards: { failed: 0, successful: 1, total: 1, skipped: 0 },
            hits: {
              total: { relation: 'eq', value: 2 },
              hits: [
                {
                  _id: 'abc',
                  _index: '.internal.alerts-test.alerts-default-000001',
                  _seq_no: 41,
                  _primary_term: 665,
                  _source: fetchedAlert1,
                },
                {
                  _id: 'def',
                  _index: '.internal.alerts-test.alerts-default-000002',
                  _seq_no: 42,
                  _primary_term: 666,
                  _source: fetchedAlert2,
                },
              ],
            },
          });
          const alertsClient = new AlertsClient<{}, {}, {}, 'default', 'recovered'>(
            alertsClientParams
          );

          await alertsClient.initializeExecution({
            ...defaultExecutionOpts,
            activeAlertsFromState: {
              '1': trackedAlert1Raw,
              '2': trackedAlert2Raw,
            },
            runTimestamp: new Date(runTimestamp),
            startedAt: new Date(startedAtDate),
          });

          // Report 1 new alert and 1 active alert, recover 1 alert
          const alertExecutorService = alertsClient.factory();
          alertExecutorService.create('2').scheduleActions('default');
          alertExecutorService.create('3').scheduleActions('default');

          await alertsClient.processAlerts(processAlertsOpts);
          alertsClient.logAlerts(logAlertsOpts);

          await alertsClient.persistAlerts();

          const { alertsToReturn } = alertsClient.getAlertsToSerialize();
          const uuid3 = alertsToReturn['3'].meta?.uuid;

          expect(clusterClient.bulk).toHaveBeenCalledWith({
            index: '.alerts-test.alerts-default',
            refresh: 'wait_for',
            require_alias: !useDataStreamForAlerts,
            body: [
              {
                index: {
                  _id: 'def',
                  _index: '.internal.alerts-test.alerts-default-000002',
                  if_seq_no: 42,
                  if_primary_term: 666,
                  require_alias: false,
                },
              },
              // ongoing alert doc
              getOngoingIndexedAlertDoc({
                [TIMESTAMP]: startedAtDate,
                [ALERT_RULE_EXECUTION_TIMESTAMP]: runTimestamp,
                [ALERT_UUID]: 'def',
                [ALERT_INSTANCE_ID]: '2',
                [ALERT_FLAPPING_HISTORY]: [true, false, false, false],
                [ALERT_DURATION]: 37951841000,
                [ALERT_START]: '2023-03-28T02:27:28.159Z',
                [ALERT_TIME_RANGE]: { gte: '2023-03-28T02:27:28.159Z' },
              }),
              {
                create: { _id: uuid3, ...(useDataStreamForAlerts ? {} : { require_alias: true }) },
              },
              // new alert doc
              getNewIndexedAlertDoc({
                [TIMESTAMP]: startedAtDate,
                [ALERT_RULE_EXECUTION_TIMESTAMP]: runTimestamp,
                [ALERT_UUID]: uuid3,
                [ALERT_INSTANCE_ID]: '3',
                [ALERT_START]: startedAtDate,
                [ALERT_TIME_RANGE]: { gte: startedAtDate },
              }),
              {
                index: {
                  _id: 'abc',
                  _index: '.internal.alerts-test.alerts-default-000001',
                  if_seq_no: 41,
                  if_primary_term: 665,
                  require_alias: false,
                },
              },
              // recovered alert doc
              getRecoveredIndexedAlertDoc({
                [TIMESTAMP]: startedAtDate,
                [ALERT_RULE_EXECUTION_TIMESTAMP]: runTimestamp,
                [ALERT_DURATION]: 1951841000,
                [ALERT_UUID]: 'abc',
                [ALERT_END]: startedAtDate,
                [ALERT_TIME_RANGE]: { gte: '2023-03-28T12:27:28.159Z', lte: startedAtDate },
              }),
            ],
          });
          expect(maintenanceWindowsService.getMaintenanceWindows).toHaveBeenCalledWith({
            eventLogger: alertingEventLogger,
            request: fakeRequest,
            ruleTypeCategory: 'test',
            spaceId: 'space1',
          });
        });

        test('should not try to index if no alerts', async () => {
          const alertsClient = new AlertsClient<{}, {}, {}, 'default', 'recovered'>(
            alertsClientParams
          );

          await alertsClient.initializeExecution(defaultExecutionOpts);

          // Report no alerts

          await alertsClient.processAlerts(processAlertsOpts);
          alertsClient.logAlerts(logAlertsOpts);

          await alertsClient.persistAlerts();

          expect(clusterClient.bulk).not.toHaveBeenCalled();
          expect(maintenanceWindowsService.getMaintenanceWindows).not.toHaveBeenCalled();
        });

        test('should log if bulk indexing fails for some alerts', async () => {
          clusterClient.bulk.mockResponseOnce({
            took: 1,
            errors: true,
            items: [
              {
                index: {
                  _index: '.internal.alerts-test.alerts-default-000001',
                  status: 400,
                  error: {
                    type: 'action_request_validation_exception',
                    reason: 'Validation Failed: 1: index is missing;2: type is missing;',
                  },
                },
              },
              {
                index: {
                  _index: '.internal.alerts-test.alerts-default-000001',
                  _id: '7',
                  status: 404,
                  error: {
                    type: 'mapper_parsing_exception',
                    reason:
                      "failed to parse field [process.command_line] of type [wildcard] in document with id 'f0c9805be95fedbc3c99c663f7f02cc15826c122'. Preview of field's value: 'we don't want this field value to be echoed'",
                    caused_by: {
                      type: 'illegal_state_exception',
                      reason: "Can't get text on a START_OBJECT at 1:3845",
                    },
                  },
                },
              },
              {
                index: {
                  _index: '.internal.alerts-test.alerts-default-000002',
                  _id: '1',
                  _version: 1,
                  result: 'created',
                  _shards: { total: 2, successful: 1, failed: 0 },
                  status: 201,
                  _seq_no: 0,
                  _primary_term: 1,
                },
              },
            ],
          });
          const alertsClient = new AlertsClient<{}, {}, {}, 'default', 'recovered'>(
            alertsClientParams
          );

          await alertsClient.initializeExecution(defaultExecutionOpts);

          // Report 2 new alerts
          const alertExecutorService = alertsClient.factory();
          alertExecutorService.create('1').scheduleActions('default');
          alertExecutorService.create('2').scheduleActions('default');

          await alertsClient.processAlerts(processAlertsOpts);
          alertsClient.logAlerts(logAlertsOpts);

          await alertsClient.persistAlerts();

          expect(clusterClient.bulk).toHaveBeenCalled();
          expect(logger.error).toHaveBeenCalledWith(
            `Error writing alerts ${ruleInfo}: 1 successful, 0 conflicts, 2 errors: Validation Failed: 1: index is missing;2: type is missing;; failed to parse field [process.command_line] of type [wildcard] in document with id 'f0c9805be95fedbc3c99c663f7f02cc15826c122'.`,
            { tags: ['test.rule-type', '1', 'resolve-alert-conflicts'] }
          );
          expect(maintenanceWindowsService.getMaintenanceWindows).toHaveBeenCalledWith({
            eventLogger: alertingEventLogger,
            request: fakeRequest,
            ruleTypeCategory: 'test',
            spaceId: 'space1',
          });
        });

        test('should log if alert to update belongs to a non-standard index', async () => {
          clusterClient.search.mockResolvedValue({
            took: 10,
            timed_out: false,
            _shards: { failed: 0, successful: 1, total: 1, skipped: 0 },
            hits: {
              total: { relation: 'eq', value: 2 },
              hits: [
                {
                  _id: 'abc',
                  _index: 'partial-.internal.alerts-test.alerts-default-000001',
                  _seq_no: 41,
                  _primary_term: 665,
                  _source: fetchedAlert1,
                },
                {
                  _id: 'def',
                  _index: '.internal.alerts-test.alerts-default-000002',
                  _seq_no: 42,
                  _primary_term: 666,
                  _source: fetchedAlert2,
                },
              ],
            },
          });
          const alertsClient = new AlertsClient<{}, {}, {}, 'default', 'recovered'>(
            alertsClientParams
          );

          await alertsClient.initializeExecution({
            ...defaultExecutionOpts,
            activeAlertsFromState: {
              '1': trackedAlert1Raw,
              '2': trackedAlert2Raw,
            },
          });

          // Report 2 active alerts
          const alertExecutorService = alertsClient.factory();
          alertExecutorService.create('1').scheduleActions('default');
          alertExecutorService.create('2').scheduleActions('default');

          await alertsClient.processAlerts(processAlertsOpts);
          alertsClient.logAlerts(logAlertsOpts);

          await alertsClient.persistAlerts();

          expect(clusterClient.bulk).toHaveBeenCalledWith({
            index: '.alerts-test.alerts-default',
            refresh: 'wait_for',
            require_alias: !useDataStreamForAlerts,
            body: [
              {
                index: {
                  _id: 'def',
                  _index: '.internal.alerts-test.alerts-default-000002',
                  if_seq_no: 42,
                  if_primary_term: 666,
                  require_alias: false,
                },
              },
              // ongoing alert doc
              getOngoingIndexedAlertDoc({
                [ALERT_UUID]: 'def',
                [ALERT_INSTANCE_ID]: '2',
                [ALERT_DURATION]: 72000000000,
                [ALERT_FLAPPING_HISTORY]: [true, false, false, false],
                [ALERT_START]: '2023-03-28T02:27:28.159Z',
                [ALERT_TIME_RANGE]: { gte: '2023-03-28T02:27:28.159Z' },
              }),
            ],
          });

          expect(logger.warn).toHaveBeenCalledWith(
            `Could not update alert abc in partial-.internal.alerts-test.alerts-default-000001. Partial and restored alert indices are not supported ${ruleInfo}.`,
            logTags
          );

          expect(maintenanceWindowsService.getMaintenanceWindows).toHaveBeenCalledWith({
            eventLogger: alertingEventLogger,
            request: fakeRequest,
            ruleTypeCategory: 'test',
            spaceId: 'space1',
          });
        });

        test('should log and swallow error if bulk indexing throws error', async () => {
          clusterClient.bulk.mockImplementation(() => {
            throw new Error('fail');
          });
          const alertsClient = new AlertsClient<{}, {}, {}, 'default', 'recovered'>(
            alertsClientParams
          );

          await alertsClient.initializeExecution(defaultExecutionOpts);

          // Report 2 new alerts
          const alertExecutorService = alertsClient.factory();
          alertExecutorService.create('1').scheduleActions('default');
          alertExecutorService.create('2').scheduleActions('default');

          await alertsClient.processAlerts(processAlertsOpts);
          alertsClient.logAlerts(logAlertsOpts);

          await alertsClient.persistAlerts();

          expect(clusterClient.bulk).toHaveBeenCalled();
          expect(logger.error).toHaveBeenCalledWith(
            `Error writing 2 alerts to .alerts-test.alerts-default ${ruleInfo} - fail`,
            logTags
          );

          expect(maintenanceWindowsService.getMaintenanceWindows).toHaveBeenCalledWith({
            eventLogger: alertingEventLogger,
            request: fakeRequest,
            ruleTypeCategory: 'test',
            spaceId: 'space1',
          });
        });

        test('should not persist alerts if shouldWrite is false', async () => {
          alertsClientParams = {
            alertingEventLogger,
            logger,
            elasticsearchClientPromise: Promise.resolve(clusterClient),
            maintenanceWindowsService,
            ruleType: {
              ...ruleType,
              alerts: {
                ...ruleType.alerts!,
                shouldWrite: false,
              },
            },
            isServerless: false,
            request: fakeRequest,
            namespace: 'default',
            rule: alertRuleData,
            kibanaVersion: '8.9.0',
            dataStreamAdapter: getDataStreamAdapter({ useDataStreamForAlerts }),
            spaceId: 'space1',
          };
          const alertsClient = new AlertsClient<{}, {}, {}, 'default', 'recovered'>(
            alertsClientParams
          );

          expect(await alertsClient.persistAlerts()).toStrictEqual({
            alertIds: [],
            maintenanceWindowIds: [],
          });

          expect(logger.debug).toHaveBeenCalledWith(
            `Resources registered and installed for test context but "shouldWrite" is set to false ${ruleInfo}.`,
            logTags
          );
          expect(clusterClient.bulk).not.toHaveBeenCalled();
          expect(maintenanceWindowsService.getMaintenanceWindows).not.toHaveBeenCalled();
        });
      });

      describe('getSummarizedAlerts', () => {
        beforeEach(() => {
          clusterClient.search.mockReturnValue({
            // @ts-ignore
            hits: { total: { value: 0 }, hits: [] },
          });
        });

        const excludedAlertInstanceIds = ['1', '2'];
        const alertsFilter: AlertsFilter = {
          query: {
            kql: 'kibana.alert.rule.name:test',
            dsl: '{"bool":{"minimum_should_match":1,"should":[{"match":{"kibana.alert.rule.name":"test"}}]}}',
            filters: [],
          },
          timeframe: {
            days: [1, 2, 3, 4, 5, 6, 7],
            hours: { start: '08:00', end: '17:00' },
            timezone: 'UTC',
          },
        };

        test('should get the persistent LifeCycle Alerts successfully', async () => {
          clusterClient.search
            .mockReturnValueOnce({
              // @ts-ignore
              hits: { total: { value: 1 }, hits: [mockAAD] },
            })
            .mockReturnValueOnce({
              // @ts-ignore
              hits: { total: { value: 1 }, hits: [mockAAD, mockAAD] },
            })
            .mockReturnValueOnce({
              // @ts-ignore
              hits: { total: { value: 0 }, hits: [] },
            });

          const alertsClient = new AlertsClient(alertsClientParams);
          const result = await alertsClient.getSummarizedAlerts(getParamsByExecutionUuid);

          expect(clusterClient.search).toHaveBeenCalledTimes(3);

          expect(result).toEqual({
            new: {
              count: 1,
              data: [
                {
                  _id: mockAAD._id,
                  _index: mockAAD._index,
                  ...expandFlattenedAlert(mockAAD._source),
                },
              ],
            },
            ongoing: {
              count: 1,
              data: [
                {
                  _id: mockAAD._id,
                  _index: mockAAD._index,
                  ...expandFlattenedAlert(mockAAD._source),
                },
                {
                  _id: mockAAD._id,
                  _index: mockAAD._index,
                  ...expandFlattenedAlert(mockAAD._source),
                },
              ],
            },
            recovered: { count: 0, data: [] },
          });
        });

        test('should get the persistent Continual Alerts successfully', async () => {
          clusterClient.search.mockReturnValueOnce({
            // @ts-ignore
            hits: { total: { value: 1 }, hits: [mockAAD] },
          });
          const alertsClient = new AlertsClient({
            ...alertsClientParams,
            ruleType: {
              ...alertsClientParams.ruleType,
              autoRecoverAlerts: false,
            },
          });

          const result = await alertsClient.getSummarizedAlerts(getParamsByExecutionUuid);

          expect(clusterClient.search).toHaveBeenCalledTimes(1);

          expect(result).toEqual({
            new: {
              count: 1,
              data: [
                {
                  _id: mockAAD._id,
                  _index: mockAAD._index,
                  ...expandFlattenedAlert(mockAAD._source),
                },
              ],
            },
            ongoing: { count: 0, data: [] },
            recovered: { count: 0, data: [] },
          });
        });

        test('formats alerts with formatAlert when provided', async () => {
          interface AlertData extends RuleAlertData {
            'signal.rule.consumer': string;
          }
          const alertsClient = new AlertsClient<AlertData, {}, {}, 'default', 'recovered'>({
            ...alertsClientParams,
            ruleType: {
              ...alertsClientParams.ruleType,
              autoRecoverAlerts: false,
              alerts: {
                context: 'test',
                mappings: { fieldMap: { field: { type: 'keyword', required: false } } },
                shouldWrite: true,
                formatAlert: (alert) => {
                  const alertCopy = { ...alert } as Partial<AlertData>;
                  alertCopy['kibana.alert.rule.consumer'] = alert['signal.rule.consumer'];
                  delete alertCopy['signal.rule.consumer'];
                  return alertCopy;
                },
              },
            },
          });

          clusterClient.search.mockReturnValueOnce({
            // @ts-ignore
            hits: {
              total: { value: 1 },
              hits: [
                {
                  ...mockAAD,
                  _source: { ...mockAAD._source, 'signal.rule.consumer': 'signalConsumer' },
                },
              ],
            },
          });

          const result = await alertsClient.getSummarizedAlerts(getParamsByExecutionUuid);

          expect(clusterClient.search).toHaveBeenCalledTimes(1);

          const expectedResult = { ...mockAAD._source };
          expectedResult['kibana.alert.rule.consumer'] = 'signalConsumer';

          expect(result).toEqual({
            new: {
              count: 1,
              data: [
                {
                  _id: mockAAD._id,
                  _index: mockAAD._index,
                  ...expandFlattenedAlert(expectedResult),
                },
              ],
            },
            ongoing: { count: 0, data: [] },
            recovered: { count: 0, data: [] },
          });
        });

        describe.each([
          { alertType: 'LifeCycle Alerts Query', isLifecycleAlert: true },
          { alertType: 'Continual Alerts Query', isLifecycleAlert: false },
        ])('$alertType', ({ isLifecycleAlert }) => {
          describe.each([
            {
              queryByType: 'ByExecutionUuid',
              baseParams: getParamsByExecutionUuid,
              getQuery: getExpectedQueryByExecutionUuid,
            },
            {
              queryByType: 'ByTimeRange',
              baseParams: getParamsByTimeQuery,
              getQuery: getExpectedQueryByTimeRange,
            },
          ])('$queryByType', ({ baseParams, getQuery }) => {
            const indexName = useDataStreamForAlerts
              ? '.alerts-test.alerts-default'
              : '.internal.alerts-test.alerts-default-*';
            test.each([
              {
                text: 'should generate the correct query',
                params: baseParams,
                call1: getQuery({
                  indexName,
                  alertType: 'new',
                  isLifecycleAlert,
                }),
                call2: getQuery({
                  indexName,
                  alertType: 'ongoing',
                }),
                call3: getQuery({
                  indexName,
                  alertType: 'recovered',
                }),
              },
              {
                text: 'should filter by excludedAlertInstanceIds',
                params: {
                  ...baseParams,
                  excludedAlertInstanceIds,
                },
                call1: getQuery({
                  indexName,
                  alertType: 'new',
                  isLifecycleAlert,
                  excludedAlertInstanceIds,
                }),
                call2: getQuery({
                  indexName,
                  alertType: 'ongoing',
                  excludedAlertInstanceIds,
                }),
                call3: getQuery({
                  indexName,
                  alertType: 'recovered',
                  excludedAlertInstanceIds,
                }),
              },
              {
                text: 'should filter by alertsFilter',
                params: {
                  ...baseParams,
                  alertsFilter,
                },
                call1: getQuery({
                  indexName,
                  alertType: 'new',
                  isLifecycleAlert,
                  alertsFilter,
                }),
                call2: getQuery({
                  indexName,
                  alertType: 'ongoing',
                  alertsFilter,
                }),
                call3: getQuery({
                  indexName,
                  alertType: 'recovered',
                  alertsFilter,
                }),
              },
              {
                text: 'alertsFilter uses the all the days (ISO_WEEKDAYS) when no day is selected',
                params: {
                  ...baseParams,
                  alertsFilter: {
                    ...alertsFilter,
                    timeframe: {
                      ...alertsFilter.timeframe!,
                      days: [],
                    },
                  },
                },
                call1: getQuery({
                  indexName,
                  alertType: 'new',
                  isLifecycleAlert,
                  alertsFilter,
                }),
                call2: getQuery({
                  indexName,
                  alertType: 'ongoing',
                  alertsFilter,
                }),
                call3: getQuery({
                  indexName,
                  alertType: 'recovered',
                  alertsFilter,
                }),
              },
            ])('$text', async ({ params, call1, call2, call3 }) => {
              const alertsClient = new AlertsClient({
                ...alertsClientParams,
                ruleType: {
                  ...alertsClientParams.ruleType,
                  autoRecoverAlerts: isLifecycleAlert,
                },
              });
              await alertsClient.getSummarizedAlerts(params);
              expect(clusterClient.search).toHaveBeenCalledTimes(isLifecycleAlert ? 3 : 1);
              expect(clusterClient.search).toHaveBeenNthCalledWith(1, call1);
              if (isLifecycleAlert) {
                expect(clusterClient.search).toHaveBeenNthCalledWith(2, call2);
                expect(clusterClient.search).toHaveBeenNthCalledWith(3, call3);
              }
            });
          });
        });

        describe('throws error', () => {
          let alertsClient: AlertsClient<{}, {}, {}, 'default', 'recovered'>;

          beforeEach(() => {
            alertsClient = new AlertsClient(alertsClientParams);
          });
          test('if ruleId is not specified', async () => {
            const { ruleId, ...paramsWithoutRuleId } = getParamsByExecutionUuid;

            await expect(
              alertsClient.getSummarizedAlerts(paramsWithoutRuleId as GetSummarizedAlertsParams)
            ).rejects.toThrowError(`Must specify both rule ID and space ID for AAD alert query.`);
          });

          test('if spaceId is not specified', async () => {
            const { spaceId, ...paramsWithoutSpaceId } = getParamsByExecutionUuid;

            await expect(
              alertsClient.getSummarizedAlerts(paramsWithoutSpaceId as GetSummarizedAlertsParams)
            ).rejects.toThrowError(`Must specify both rule ID and space ID for AAD alert query.`);
          });

          test('if executionUuid or start date are not specified', async () => {
            const { executionUuid, ...paramsWithoutExecutionUuid } = getParamsByExecutionUuid;

            await expect(
              alertsClient.getSummarizedAlerts(
                paramsWithoutExecutionUuid as GetSummarizedAlertsParams
              )
            ).rejects.toThrowError(
              'Must specify either execution UUID or time range for AAD alert query.'
            );
          });

          test('if start date is not specified for a TimeRange query', async () => {
            const { start, ...paramsWithoutStart } = getParamsByTimeQuery;

            await expect(
              alertsClient.getSummarizedAlerts(paramsWithoutStart as GetSummarizedAlertsParams)
            ).rejects.toThrowError(
              'Must specify either execution UUID or time range for AAD alert query.'
            );
          });

          test('if end date is not specified for a TimeRange query', async () => {
            const { end, ...paramsWithoutEnd } = getParamsByTimeQuery;

            await expect(
              alertsClient.getSummarizedAlerts(paramsWithoutEnd as GetSummarizedAlertsParams)
            ).rejects.toThrowError(
              'Must specify either execution UUID or time range for AAD alert query.'
            );
          });
        });
      });

      describe('getMaintenanceWindowScopedQueryAlerts', () => {
        const alertWithMwId1 = {
          ...mockAAD,
          _id: 'alert_id_1',
          _source: {
            ...mockAAD._source,
            [ALERT_UUID]: 'alert_id_1',
            [ALERT_MAINTENANCE_WINDOW_IDS]: ['mw1', 'mw2'],
          },
        };

        const alertWithMwId2 = {
          ...mockAAD,
          _id: 'alert_id_2',
          _source: {
            ...mockAAD._source,
            [ALERT_UUID]: 'alert_id_2',
            [ALERT_MAINTENANCE_WINDOW_IDS]: ['mw1'],
          },
        };

        beforeEach(() => {
          clusterClient.search.mockReturnValueOnce({
            // @ts-ignore
            hits: { total: { value: 2 }, hits: [alertWithMwId1, alertWithMwId2] },
            aggregations: {
              mw1: {
                doc_count: 2,
                alertId: {
                  hits: {
                    hits: [
                      {
                        _id: 'alert_id_1',
                        _source: { [ALERT_UUID]: 'alert_id_1' },
                      },
                      {
                        _id: 'alert_id_2',
                        _source: { [ALERT_UUID]: 'alert_id_2' },
                      },
                    ],
                  },
                },
              },
              mw2: {
                doc_count: 1,
                alertId: {
                  hits: {
                    hits: [
                      {
                        _id: 'alert_id_1',
                        _source: { [ALERT_UUID]: 'alert_id_1' },
                      },
                    ],
                  },
                },
              },
            },
          });
        });

        test('should get the persistent lifecycle alerts affected by scoped query successfully', async () => {
          const alertsClient = new AlertsClient(alertsClientParams);
          // @ts-ignore
          const result = await alertsClient.getMaintenanceWindowScopedQueryAlerts(
            getParamsByMaintenanceWindowScopedQuery
          );

          expect(result).toEqual({
            mw1: ['alert_id_1', 'alert_id_2'],
            mw2: ['alert_id_1'],
          });
        });

        test('should get the persistent continual alerts affected by scoped query successfully', async () => {
          const alertsClient = new AlertsClient({
            ...alertsClientParams,
            ruleType: {
              ...alertsClientParams.ruleType,
              autoRecoverAlerts: false,
            },
          });
          // @ts-ignore
          const result = await alertsClient.getMaintenanceWindowScopedQueryAlerts(
            getParamsByMaintenanceWindowScopedQuery
          );

          expect(result).toEqual({
            mw1: ['alert_id_1', 'alert_id_2'],
            mw2: ['alert_id_1'],
          });
        });

        test('should throw if ruleId is not specified', async () => {
          const alertsClient = new AlertsClient(alertsClientParams);
          const { ruleId, ...paramsWithoutRuleId } = getParamsByMaintenanceWindowScopedQuery;

          await expect(
            // @ts-ignore
            alertsClient.getMaintenanceWindowScopedQueryAlerts(
              paramsWithoutRuleId as GetMaintenanceWindowScopedQueryAlertsParams
            )
          ).rejects.toThrowError(
            'Must specify rule ID, space ID, and executionUuid for scoped query AAD alert query.'
          );
        });

        test('should throw if spaceId is not specified', async () => {
          const alertsClient = new AlertsClient(alertsClientParams);
          const { spaceId, ...paramsWithoutRuleId } = getParamsByMaintenanceWindowScopedQuery;

          await expect(
            // @ts-ignore
            alertsClient.getMaintenanceWindowScopedQueryAlerts(
              paramsWithoutRuleId as GetMaintenanceWindowScopedQueryAlertsParams
            )
          ).rejects.toThrowError(
            'Must specify rule ID, space ID, and executionUuid for scoped query AAD alert query.'
          );
        });

        test('should throw if executionUuid is not specified', async () => {
          const alertsClient = new AlertsClient(alertsClientParams);
          const { executionUuid, ...paramsWithoutRuleId } = getParamsByMaintenanceWindowScopedQuery;

          await expect(
            // @ts-ignore
            alertsClient.getMaintenanceWindowScopedQueryAlerts(
              paramsWithoutRuleId as GetMaintenanceWindowScopedQueryAlertsParams
            )
          ).rejects.toThrowError(
            'Must specify rule ID, space ID, and executionUuid for scoped query AAD alert query.'
          );
        });
      });

      describe('updateAlertMaintenanceWindowIds', () => {
        test('should update alerts with new maintenance window Ids', async () => {
          const alertsClient = new AlertsClient(alertsClientParams);

          const alert1 = new Alert('1', { meta: { maintenanceWindowIds: ['mw1'] } });
          const alert2 = new Alert('2', { meta: { maintenanceWindowIds: ['mw1', 'mw2'] } });
          const alert3 = new Alert('3', { meta: { maintenanceWindowIds: ['mw2', 'mw3'] } });

          jest.spyOn(LegacyAlertsClient.prototype, 'getProcessedAlerts').mockReturnValueOnce({
            '1': alert1,
            '2': alert2,
            '3': alert3,
          });

          // @ts-ignore
          await alertsClient.updateAlertMaintenanceWindowIds([
            alert1.getUuid(),
            alert2.getUuid(),
            alert3.getUuid(),
          ]);

          const params = clusterClient.updateByQuery.mock.calls[0][0] as UpdateByQueryRequest;

          expect(params.query).toEqual({
            terms: {
              _id: [alert1.getUuid(), alert2.getUuid(), alert3.getUuid()],
            },
          });

          expect(params.script).toEqual({
            source: expect.anything(),
            lang: 'painless',
            params: {
              [alert1.getUuid()]: ['mw1'],
              [alert2.getUuid()]: ['mw1', 'mw2'],
              [alert3.getUuid()]: ['mw2', 'mw3'],
            },
          });
        });

        test('should call warn if ES errors', async () => {
          clusterClient.updateByQuery.mockRejectedValueOnce('something went wrong!');
          const alertsClient = new AlertsClient(alertsClientParams);

          const alert1 = new Alert('1', { meta: { maintenanceWindowIds: ['mw1'] } });

          jest.spyOn(LegacyAlertsClient.prototype, 'getProcessedAlerts').mockReturnValueOnce({
            '1': alert1,
          });

          await expect(
            // @ts-ignore
            alertsClient.updateAlertMaintenanceWindowIds([alert1.getUuid()])
          ).rejects.toBe('something went wrong!');

          expect(logger.warn).toHaveBeenCalledWith(
            `Error updating alert maintenance window IDs for test.rule-type:1 'rule-name': something went wrong!`,
            logTags
          );
        });
      });

      describe('updatePersistedAlertsWithMaintenanceWindowIds', () => {
        test('should update alerts with MW ids when provided with maintenance windows', async () => {
          maintenanceWindowsService.getMaintenanceWindows.mockReturnValueOnce({
            maintenanceWindows: [
              ...getParamsByUpdateMaintenanceWindowIds.maintenanceWindows,
              { id: 'mw3' } as unknown as MaintenanceWindow,
            ],
            maintenanceWindowsWithoutScopedQueryIds: [],
          });
          const alertsClient = new AlertsClient(alertsClientParams);

          const alert1 = new Alert('1');
          const alert2 = new Alert('2');
          const alert3 = new Alert('3');
          const alert4 = new Alert('4');

          jest.spyOn(LegacyAlertsClient.prototype, 'getProcessedAlerts').mockReturnValueOnce({
            '1': alert1,
            '2': alert2,
            '3': alert3,
            '4': alert4,
          });

          jest
            // @ts-ignore
            .spyOn(AlertsClient.prototype, 'getMaintenanceWindowScopedQueryAlerts')
            // @ts-ignore
            .mockResolvedValueOnce({
              mw1: [alert1.getUuid(), alert2.getUuid()],
              mw2: [alert3.getUuid()],
            });

          const updateSpy = jest
            // @ts-ignore
            .spyOn(AlertsClient.prototype, 'updateAlertMaintenanceWindowIds')
            // @ts-ignore
            .mockResolvedValueOnce({});

          // @ts-ignore - accessing private function
          const result = await alertsClient.updatePersistedAlertsWithMaintenanceWindowIds();

          expect(alert1.getMaintenanceWindowIds()).toEqual(['mw3', 'mw1']);
          expect(alert2.getMaintenanceWindowIds()).toEqual(['mw3', 'mw1']);
          expect(alert3.getMaintenanceWindowIds()).toEqual(['mw3', 'mw2']);

          expect(result).toEqual({
            alertIds: [alert1.getUuid(), alert2.getUuid(), alert3.getUuid()],
            maintenanceWindowIds: ['mw3', 'mw1', 'mw2'],
          });

          expect(updateSpy).toHaveBeenLastCalledWith([
            alert1.getUuid(),
            alert2.getUuid(),
            alert3.getUuid(),
          ]);
        });
      });

      describe('report()', () => {
        test('should create legacy alert with id, action group', async () => {
          const mockGetUuidCurrent = jest
            .fn()
            .mockReturnValueOnce('uuid1')
            .mockReturnValueOnce('uuid2');
          const mockGetStartCurrent = jest.fn().mockReturnValue(null);
          const mockScheduleActionsCurrent = jest.fn().mockImplementation(() => ({
            replaceState: mockReplaceState,
            getUuid: mockGetUuidCurrent,
            getStart: mockGetStartCurrent,
          }));
          const mockCreateCurrent = jest.fn().mockImplementation(() => ({
            scheduleActions: mockScheduleActionsCurrent,
          }));
          mockLegacyAlertsClient.factory.mockImplementation(() => ({ create: mockCreateCurrent }));
          const spy = jest
            .spyOn(LegacyAlertsClientModule, 'LegacyAlertsClient')
            .mockImplementation(() => mockLegacyAlertsClient);
          const alertsClient = new AlertsClient<{}, {}, {}, 'default', 'recovered'>(
            alertsClientParams
          );

          await alertsClient.initializeExecution(defaultExecutionOpts);

          // Report 2 new alerts
          const { uuid: uuid1, start: start1 } = alertsClient.report({
            id: '1',
            actionGroup: 'default',
            state: {},
            context: {},
          });
          const { uuid: uuid2, start: start2 } = alertsClient.report({
            id: '2',
            actionGroup: 'default',
            state: {},
            context: {},
          });

          expect(mockCreateCurrent).toHaveBeenCalledTimes(2);
          expect(mockCreateCurrent).toHaveBeenNthCalledWith(1, '1');
          expect(mockCreateCurrent).toHaveBeenNthCalledWith(2, '2');
          expect(mockScheduleActionsCurrent).toHaveBeenCalledTimes(2);
          expect(mockScheduleActionsCurrent).toHaveBeenNthCalledWith(1, 'default', {});
          expect(mockScheduleActionsCurrent).toHaveBeenNthCalledWith(2, 'default', {});

          expect(mockReplaceState).not.toHaveBeenCalled();
          spy.mockRestore();

          expect(uuid1).toEqual('uuid1');
          expect(uuid2).toEqual('uuid2');
          expect(start1).toBeNull();
          expect(start2).toBeNull();
        });

        test('should use startedAt time if provided', async () => {
          const mockGetUuidCurrent = jest
            .fn()
            .mockReturnValueOnce('uuid1')
            .mockReturnValueOnce('uuid2');
          const mockGetStartCurrent = jest.fn().mockReturnValue(null);
          const mockScheduleActionsCurrent = jest.fn().mockImplementation(() => ({
            replaceState: mockReplaceState,
            getUuid: mockGetUuidCurrent,
            getStart: mockGetStartCurrent,
          }));
          const mockCreateCurrent = jest.fn().mockImplementation(() => ({
            scheduleActions: mockScheduleActionsCurrent,
          }));
          mockLegacyAlertsClient.factory.mockImplementation(() => ({ create: mockCreateCurrent }));
          const spy = jest
            .spyOn(LegacyAlertsClientModule, 'LegacyAlertsClient')
            .mockImplementation(() => mockLegacyAlertsClient);
          const alertsClient = new AlertsClient<{}, {}, {}, 'default', 'recovered'>(
            alertsClientParams
          );

          await alertsClient.initializeExecution({
            ...defaultExecutionOpts,
            startedAt: new Date(startedAtDate),
          });

          // Report 2 new alerts
          const { uuid: uuid1, start: start1 } = alertsClient.report({
            id: '1',
            actionGroup: 'default',
            state: {},
            context: {},
          });
          const { uuid: uuid2, start: start2 } = alertsClient.report({
            id: '2',
            actionGroup: 'default',
            state: {},
            context: {},
          });

          expect(mockCreateCurrent).toHaveBeenCalledTimes(2);
          expect(mockCreateCurrent).toHaveBeenNthCalledWith(1, '1');
          expect(mockCreateCurrent).toHaveBeenNthCalledWith(2, '2');
          expect(mockScheduleActionsCurrent).toHaveBeenCalledTimes(2);
          expect(mockScheduleActionsCurrent).toHaveBeenNthCalledWith(1, 'default', {});
          expect(mockScheduleActionsCurrent).toHaveBeenNthCalledWith(2, 'default', {});

          expect(mockReplaceState).not.toHaveBeenCalled();
          spy.mockRestore();

          expect(uuid1).toEqual('uuid1');
          expect(uuid2).toEqual('uuid2');
          expect(start1).toEqual(startedAtDate);
          expect(start2).toEqual(startedAtDate);
        });

        test('should set context if defined', async () => {
          mockLegacyAlertsClient.factory.mockImplementation(() => ({ create: mockCreate }));
          const spy = jest
            .spyOn(LegacyAlertsClientModule, 'LegacyAlertsClient')
            .mockImplementation(() => mockLegacyAlertsClient);
          const alertsClient = new AlertsClient<{}, {}, { foo?: string }, 'default', 'recovered'>(
            alertsClientParams
          );

          await alertsClient.initializeExecution(defaultExecutionOpts);

          // Report 2 new alerts
          alertsClient.report({
            id: '1',
            actionGroup: 'default',
            state: {},
            context: { foo: 'cheese' },
          });
          alertsClient.report({ id: '2', actionGroup: 'default', state: {}, context: {} });

          expect(mockCreate).toHaveBeenCalledTimes(2);
          expect(mockCreate).toHaveBeenNthCalledWith(1, '1');
          expect(mockCreate).toHaveBeenNthCalledWith(2, '2');
          expect(mockScheduleActions).toHaveBeenCalledTimes(2);
          expect(mockScheduleActions).toHaveBeenNthCalledWith(1, 'default', { foo: 'cheese' });
          expect(mockScheduleActions).toHaveBeenNthCalledWith(2, 'default', {});

          expect(mockReplaceState).not.toHaveBeenCalled();
          spy.mockRestore();
        });

        test('should set state if defined', async () => {
          mockLegacyAlertsClient.factory.mockImplementation(() => ({ create: mockCreate }));
          const spy = jest
            .spyOn(LegacyAlertsClientModule, 'LegacyAlertsClient')
            .mockImplementation(() => mockLegacyAlertsClient);
          const alertsClient = new AlertsClient<{}, { count: number }, {}, 'default', 'recovered'>(
            alertsClientParams
          );

          await alertsClient.initializeExecution(defaultExecutionOpts);

          // Report 2 new alerts
          alertsClient.report({
            id: '1',
            actionGroup: 'default',
            state: { count: 1 },
            context: {},
          });
          alertsClient.report({
            id: '2',
            actionGroup: 'default',
            state: { count: 2 },
            context: {},
          });

          expect(mockCreate).toHaveBeenCalledTimes(2);
          expect(mockCreate).toHaveBeenNthCalledWith(1, '1');
          expect(mockCreate).toHaveBeenNthCalledWith(2, '2');
          expect(mockScheduleActions).toHaveBeenCalledTimes(2);
          expect(mockScheduleActions).toHaveBeenNthCalledWith(1, 'default', {});
          expect(mockScheduleActions).toHaveBeenNthCalledWith(2, 'default', {});
          expect(mockReplaceState).toHaveBeenCalledTimes(2);
          expect(mockReplaceState).toHaveBeenNthCalledWith(1, { count: 1 });
          expect(mockReplaceState).toHaveBeenNthCalledWith(2, { count: 2 });
          spy.mockRestore();
        });

        test('should set payload if defined and write out to alert doc', async () => {
          const alertsClient = new AlertsClient<
            { count: number; url: string },
            {},
            {},
            'default',
            'recovered'
          >(alertsClientParams);

          await alertsClient.initializeExecution(defaultExecutionOpts);

          // Report 2 new alerts
          alertsClient.report({
            id: '1',
            actionGroup: 'default',
            state: {},
            context: {},
            payload: { count: 1, url: `https://url1` },
          });
          alertsClient.report({
            id: '2',
            actionGroup: 'default',
            state: {},
            context: {},
            payload: { count: 2, url: `https://url2` },
          });

          await alertsClient.processAlerts(processAlertsOpts);
          alertsClient.logAlerts(logAlertsOpts);

          await alertsClient.persistAlerts();

          const { alertsToReturn } = alertsClient.getAlertsToSerialize();
          const uuid1 = alertsToReturn['1'].meta?.uuid;
          const uuid2 = alertsToReturn['2'].meta?.uuid;

          expect(clusterClient.bulk).toHaveBeenCalledWith({
            index: '.alerts-test.alerts-default',
            refresh: 'wait_for',
            require_alias: !useDataStreamForAlerts,
            body: [
              {
                create: { _id: uuid1, ...(useDataStreamForAlerts ? {} : { require_alias: true }) },
              },
              // new alert doc
              {
                ...getNewIndexedAlertDoc({ [ALERT_UUID]: uuid1 }),
                count: 1,
                url: `https://url1`,
                [EVENT_ACTION]: 'open',
                [EVENT_KIND]: 'signal',
                [ALERT_ACTION_GROUP]: 'default',
                [ALERT_DURATION]: 0,
                [ALERT_FLAPPING]: false,
                [ALERT_FLAPPING_HISTORY]: [true],
                [ALERT_INSTANCE_ID]: '1',
                [ALERT_MAINTENANCE_WINDOW_IDS]: ['test-id1', 'test-id2'],
                [ALERT_RULE_CATEGORY]: 'My test rule',
                [ALERT_RULE_CONSUMER]: 'bar',
                [ALERT_RULE_EXECUTION_UUID]: '5f6aa57d-3e22-484e-bae8-cbed868f4d28',
                [ALERT_RULE_NAME]: 'rule-name',
                [ALERT_RULE_PARAMETERS]: { bar: true },
                [ALERT_RULE_PRODUCER]: 'alerts',
                [ALERT_RULE_REVISION]: 0,
                [ALERT_RULE_TYPE_ID]: 'test.rule-type',
                [ALERT_RULE_TAGS]: ['rule-', '-tags'],
                [ALERT_RULE_UUID]: '1',
                [ALERT_START]: date,
                [ALERT_STATUS]: 'active',
                [ALERT_TIME_RANGE]: { gte: date },
                [ALERT_UUID]: uuid1,
                [ALERT_WORKFLOW_STATUS]: 'open',
                [SPACE_IDS]: ['default'],
                [VERSION]: '8.9.0',
                [TAGS]: ['rule-', '-tags'],
              },
              {
                create: { _id: uuid2, ...(useDataStreamForAlerts ? {} : { require_alias: true }) },
              },
              // new alert doc
              {
                ...getNewIndexedAlertDoc({ [ALERT_UUID]: uuid2, [ALERT_INSTANCE_ID]: '2' }),
                count: 2,
                url: `https://url2`,
                [EVENT_ACTION]: 'open',
                [EVENT_KIND]: 'signal',
                [ALERT_ACTION_GROUP]: 'default',
                [ALERT_DURATION]: 0,
                [ALERT_FLAPPING]: false,
                [ALERT_FLAPPING_HISTORY]: [true],
                [ALERT_INSTANCE_ID]: '2',
                [ALERT_MAINTENANCE_WINDOW_IDS]: ['test-id1', 'test-id2'],
                [ALERT_RULE_CATEGORY]: 'My test rule',
                [ALERT_RULE_CONSUMER]: 'bar',
                [ALERT_RULE_EXECUTION_UUID]: '5f6aa57d-3e22-484e-bae8-cbed868f4d28',
                [ALERT_RULE_NAME]: 'rule-name',
                [ALERT_RULE_PARAMETERS]: { bar: true },
                [ALERT_RULE_PRODUCER]: 'alerts',
                [ALERT_RULE_REVISION]: 0,
                [ALERT_RULE_TYPE_ID]: 'test.rule-type',
                [ALERT_RULE_TAGS]: ['rule-', '-tags'],
                [ALERT_RULE_UUID]: '1',
                [ALERT_START]: date,
                [ALERT_STATUS]: 'active',
                [ALERT_TIME_RANGE]: { gte: date },
                [ALERT_UUID]: uuid2,
                [ALERT_WORKFLOW_STATUS]: 'open',
                [SPACE_IDS]: ['default'],
                [VERSION]: '8.9.0',
                [TAGS]: ['rule-', '-tags'],
              },
            ],
          });
        });

        test('should return undefined if an alert doc with provided id do not exist', async () => {
          const mockAlertPayload = { count: 1, url: `https://url1` };
          const alertInstanceId = 'existing_alert';
          const alertSource = {
            ...mockAlertPayload,
            [ALERT_INSTANCE_ID]: alertInstanceId,
          };

          clusterClient.search.mockResolvedValue({
            took: 10,
            timed_out: false,
            _shards: { failed: 0, successful: 1, total: 1, skipped: 0 },
            hits: {
              total: { relation: 'eq', value: 1 },
              hits: [
                {
                  _id: 'abc',
                  _index: '.internal.alerts-test.alerts-default-000001',
                  _source: alertSource,
                },
              ],
            },
          });

          const alertsClient = new AlertsClient<{}, {}, {}, 'default', 'recovered'>(
            alertsClientParams
          );

          await alertsClient.initializeExecution({
            ...defaultExecutionOpts,
            activeAlertsFromState: {
              [alertInstanceId]: {},
            },
          });

          const { alertDoc } = alertsClient.report({
            id: 'another_alert',
            actionGroup: 'default',
            state: {},
            context: {},
          });

          expect(alertDoc).toBeUndefined();
        });

        test('should return a previous alert payload if one exists', async () => {
          const mockAlertPayload = { count: 1, url: `https://url1` };
          const alertInstanceId = 'existing_alert';
          const alertSource = {
            ...mockAlertPayload,
            [ALERT_INSTANCE_ID]: alertInstanceId,
          };

          clusterClient.search.mockResolvedValue({
            took: 10,
            timed_out: false,
            _shards: { failed: 0, successful: 1, total: 1, skipped: 0 },
            hits: {
              total: { relation: 'eq', value: 1 },
              hits: [
                {
                  _id: 'abc',
                  _index: '.internal.alerts-test.alerts-default-000001',
                  _source: alertSource,
                },
              ],
            },
          });

          const alertsClient = new AlertsClient<
            { count: number; url: string },
            {},
            {},
            'default',
            'recovered'
          >(alertsClientParams);

          await alertsClient.initializeExecution({
            ...defaultExecutionOpts,
            activeAlertsFromState: {
              [alertInstanceId]: {},
            },
          });

          // Report the same alert again
          const { alertDoc } = alertsClient.report({
            id: alertInstanceId,
            actionGroup: 'default',
          });

          expect(alertDoc).toEqual(alertSource);
        });
      });

      describe('setAlertData()', () => {
        test('should call setContext on legacy alert', async () => {
          mockLegacyAlertsClient.getAlert.mockReturnValueOnce({
            getId: jest.fn().mockReturnValue('1'),
            setContext: mockSetContext,
          });
          mockLegacyAlertsClient.getAlert.mockReturnValueOnce({
            getId: jest.fn().mockReturnValue('1'),
            setContext: mockSetContext,
          });
          const spy = jest
            .spyOn(LegacyAlertsClientModule, 'LegacyAlertsClient')
            .mockImplementation(() => mockLegacyAlertsClient);
          const alertsClient = new AlertsClient<{}, {}, {}, 'default', 'recovered'>(
            alertsClientParams
          );

          await alertsClient.initializeExecution({
            ...defaultExecutionOpts,
            activeAlertsFromState: {
              '1': trackedAlert1Raw,
              '2': trackedAlert2Raw,
            },
          });

          // Set context on 2 recovered alerts
          alertsClient.setAlertData({ id: '1', context: { foo: 'bar' } });
          alertsClient.setAlertData({ id: '2' });

          expect(mockSetContext).toHaveBeenCalledTimes(2);
          expect(mockSetContext).toHaveBeenNthCalledWith(1, { foo: 'bar' });
          expect(mockSetContext).toHaveBeenNthCalledWith(2, {});
          spy.mockRestore();
        });

        test('should throw error if called on unknown alert id', async () => {
          mockLegacyAlertsClient.getAlert.mockReturnValueOnce(null);
          const spy = jest
            .spyOn(LegacyAlertsClientModule, 'LegacyAlertsClient')
            .mockImplementation(() => mockLegacyAlertsClient);
          const alertsClient = new AlertsClient<{}, {}, { foo?: string }, 'default', 'recovered'>(
            alertsClientParams
          );

          await alertsClient.initializeExecution({
            ...defaultExecutionOpts,
            activeAlertsFromState: {
              '1': trackedAlert1Raw,
              '2': trackedAlert2Raw,
            },
          });

          // Set context on 2 recovered alerts
          expect(() => {
            alertsClient.setAlertData({ id: '1', context: { foo: 'bar' } });
          }).toThrowErrorMatchingInlineSnapshot(
            `"Cannot set alert data for alert 1 because it has not been reported and it is not recovered."`
          );
          spy.mockRestore();
        });

        test('should successfully update context and payload for new alert', async () => {
          clusterClient.search.mockResolvedValue({
            took: 10,
            timed_out: false,
            _shards: { failed: 0, successful: 1, total: 1, skipped: 0 },
            hits: {
              total: { relation: 'eq', value: 0 },
              hits: [],
            },
          });
          const alertsClient = new AlertsClient<
            { count: number; url: string },
            {},
            {},
            'default',
            'recovered'
          >(alertsClientParams);

          await alertsClient.initializeExecution(defaultExecutionOpts);

          // Report new alert
          alertsClient.report({
            id: '1',
            actionGroup: 'default',
            context: { foo: 'bar' },
            payload: { count: 1, url: `http://localhost:5601` },
          });

          // Update context and payload on the new alert
          alertsClient.setAlertData({
            id: '1',
            context: { foo: 'notbar' },
            payload: { count: 100, url: `https://elastic.co` },
          });

          await alertsClient.processAlerts(processAlertsOpts);
          alertsClient.logAlerts(logAlertsOpts);

          await alertsClient.persistAlerts();

          expect(clusterClient.bulk).toHaveBeenCalledWith({
            index: '.alerts-test.alerts-default',
            refresh: 'wait_for',
            require_alias: !useDataStreamForAlerts,
            body: [
              {
                create: {
                  _id: expect.any(String),
                  ...(useDataStreamForAlerts ? {} : { require_alias: true }),
                },
              },
              {
                ...getNewIndexedAlertDoc({ [ALERT_UUID]: expect.any(String) }),
                count: 100,
                url: 'https://elastic.co',
                [EVENT_ACTION]: 'open',
                [EVENT_KIND]: 'signal',
                [ALERT_ACTION_GROUP]: 'default',
                [ALERT_DURATION]: 0,
                [ALERT_FLAPPING]: false,
                [ALERT_FLAPPING_HISTORY]: [true],
                [ALERT_INSTANCE_ID]: '1',
                [ALERT_MAINTENANCE_WINDOW_IDS]: ['test-id1', 'test-id2'],
                [ALERT_RULE_CATEGORY]: 'My test rule',
                [ALERT_RULE_CONSUMER]: 'bar',
                [ALERT_RULE_EXECUTION_UUID]: '5f6aa57d-3e22-484e-bae8-cbed868f4d28',
                [ALERT_RULE_NAME]: 'rule-name',
                [ALERT_RULE_PARAMETERS]: { bar: true },
                [ALERT_RULE_PRODUCER]: 'alerts',
                [ALERT_RULE_REVISION]: 0,
                [ALERT_RULE_TYPE_ID]: 'test.rule-type',
                [ALERT_RULE_TAGS]: ['rule-', '-tags'],
                [ALERT_RULE_UUID]: '1',
                [ALERT_START]: date,
                [ALERT_STATUS]: 'active',
                [ALERT_TIME_RANGE]: { gte: date },
                [ALERT_UUID]: expect.any(String),
                [ALERT_WORKFLOW_STATUS]: 'open',
                [SPACE_IDS]: ['default'],
                [VERSION]: '8.9.0',
                [TAGS]: ['rule-', '-tags'],
              },
            ],
          });
        });

        test('should successfully update context and payload for ongoing alert', async () => {
          clusterClient.search.mockResolvedValue({
            took: 10,
            timed_out: false,
            _shards: { failed: 0, successful: 1, total: 1, skipped: 0 },
            hits: {
              total: { relation: 'eq', value: 1 },
              hits: [
                {
                  _id: 'abc',
                  _index: '.internal.alerts-test.alerts-default-000001',
                  _source: {
                    ...fetchedAlert1,
                    count: 1,
                    url: 'https://localhost:5601/abc',
                  },
                },
              ],
            },
          });
          const alertsClient = new AlertsClient<
            { count: number; url: string },
            {},
            {},
            'default',
            'recovered'
          >(alertsClientParams);

          await alertsClient.initializeExecution({
            ...defaultExecutionOpts,
            activeAlertsFromState: {
              '1': trackedAlert1Raw,
            },
          });

          // Report ongoing alert
          alertsClient.report({
            id: '1',
            actionGroup: 'default',
            context: { foo: 'bar' },
            payload: { count: 1, url: `http://localhost:5601` },
          });

          // Update context and payload on the new alert
          alertsClient.setAlertData({
            id: '1',
            context: { foo: 'notbar' },
            payload: { count: 100, url: `https://elastic.co` },
          });

          await alertsClient.processAlerts(processAlertsOpts);
          alertsClient.logAlerts(logAlertsOpts);

          await alertsClient.persistAlerts();

          expect(clusterClient.bulk).toHaveBeenCalledWith({
            index: '.alerts-test.alerts-default',
            refresh: 'wait_for',
            require_alias: !useDataStreamForAlerts,
            body: [
              {
                create: {
                  _id: 'abc',
                  ...(useDataStreamForAlerts ? {} : { require_alias: true }),
                },
              },
              {
                ...getOngoingIndexedAlertDoc({ [ALERT_UUID]: 'abc' }),
                count: 100,
                url: 'https://elastic.co',
                [EVENT_ACTION]: 'active',
                [EVENT_KIND]: 'signal',
                [ALERT_ACTION_GROUP]: 'default',
                [ALERT_DURATION]: 36000000000,
                [ALERT_FLAPPING]: false,
                [ALERT_FLAPPING_HISTORY]: [true, false],
                [ALERT_INSTANCE_ID]: '1',
                [ALERT_MAINTENANCE_WINDOW_IDS]: [],
                [ALERT_RULE_CATEGORY]: 'My test rule',
                [ALERT_RULE_CONSUMER]: 'bar',
                [ALERT_RULE_EXECUTION_UUID]: '5f6aa57d-3e22-484e-bae8-cbed868f4d28',
                [ALERT_RULE_NAME]: 'rule-name',
                [ALERT_RULE_PARAMETERS]: { bar: true },
                [ALERT_RULE_PRODUCER]: 'alerts',
                [ALERT_RULE_REVISION]: 0,
                [ALERT_RULE_TYPE_ID]: 'test.rule-type',
                [ALERT_RULE_TAGS]: ['rule-', '-tags'],
                [ALERT_RULE_UUID]: '1',
                [ALERT_UUID]: 'abc',
                [ALERT_START]: '2023-03-28T12:27:28.159Z',
                [ALERT_STATUS]: 'active',
                [ALERT_TIME_RANGE]: { gte: '2023-03-28T12:27:28.159Z' },
                [ALERT_WORKFLOW_STATUS]: 'open',
                [SPACE_IDS]: ['default'],
                [VERSION]: '8.9.0',
                [TAGS]: ['rule-', '-tags'],
              },
            ],
          });
        });

        test('should successfully update context and payload for recovered alert', async () => {
          clusterClient.search.mockResolvedValue({
            took: 10,
            timed_out: false,
            _shards: { failed: 0, successful: 1, total: 1, skipped: 0 },
            hits: {
              total: { relation: 'eq', value: 1 },
              hits: [
                {
                  _id: 'abc',
                  _index: '.internal.alerts-test.alerts-default-000001',
                  _seq_no: 42,
                  _primary_term: 666,
                  _source: {
                    ...fetchedAlert1,
                    count: 1,
                    url: 'https://localhost:5601/abc',
                  },
                },
              ],
            },
          });
          const alertsClient = new AlertsClient<
            { count: number; url: string },
            {},
            {},
            'default',
            'recovered'
          >(alertsClientParams);

          await alertsClient.initializeExecution({
            ...defaultExecutionOpts,
            activeAlertsFromState: {
              '1': trackedAlert1Raw,
            },
          });

          // Don't report any alerts so existing alert recovers

          // Update context and payload on the new alert
          alertsClient.setAlertData({
            id: '1',
            context: { foo: 'notbar' },
            payload: { count: 100, url: `https://elastic.co` },
          });

          await alertsClient.processAlerts(processAlertsOpts);
          alertsClient.logAlerts(logAlertsOpts);

          await alertsClient.persistAlerts();

          expect(clusterClient.bulk).toHaveBeenCalledWith({
            index: '.alerts-test.alerts-default',
            refresh: 'wait_for',
            require_alias: !useDataStreamForAlerts,
            body: [
              {
                index: {
                  _id: 'abc',
                  if_primary_term: 666,
                  if_seq_no: 42,
                  _index: '.internal.alerts-test.alerts-default-000001',
                  require_alias: false,
                },
              },
              {
                ...getRecoveredIndexedAlertDoc({ [ALERT_UUID]: 'abc' }),
                count: 100,
                url: 'https://elastic.co',
                [EVENT_ACTION]: 'close',
                [EVENT_KIND]: 'signal',
                [ALERT_ACTION_GROUP]: 'recovered',
                [ALERT_DURATION]: 36000000000,
                [ALERT_END]: date,
                [ALERT_FLAPPING]: false,
                [ALERT_FLAPPING_HISTORY]: [true, true],
                [ALERT_INSTANCE_ID]: '1',
                [ALERT_MAINTENANCE_WINDOW_IDS]: [],
                [ALERT_RULE_CATEGORY]: 'My test rule',
                [ALERT_RULE_CONSUMER]: 'bar',
                [ALERT_RULE_EXECUTION_UUID]: '5f6aa57d-3e22-484e-bae8-cbed868f4d28',
                [ALERT_RULE_NAME]: 'rule-name',
                [ALERT_RULE_PARAMETERS]: { bar: true },
                [ALERT_RULE_PRODUCER]: 'alerts',
                [ALERT_RULE_REVISION]: 0,
                [ALERT_RULE_TYPE_ID]: 'test.rule-type',
                [ALERT_RULE_TAGS]: ['rule-', '-tags'],
                [ALERT_RULE_UUID]: '1',
                [ALERT_UUID]: 'abc',
                [ALERT_START]: '2023-03-28T12:27:28.159Z',
                [ALERT_STATUS]: 'recovered',
                [ALERT_TIME_RANGE]: { gte: '2023-03-28T12:27:28.159Z', lte: date },
                [ALERT_WORKFLOW_STATUS]: 'open',
                [SPACE_IDS]: ['default'],
                [VERSION]: '8.9.0',
                [TAGS]: ['rule-', '-tags'],
              },
            ],
          });
        });
      });

      describe('client()', () => {
        test('only returns subset of functionality', async () => {
          const alertsClient = new AlertsClient<{}, {}, {}, 'default', 'recovered'>(
            alertsClientParams
          );

          await alertsClient.initializeExecution(defaultExecutionOpts);

          const publicAlertsClient = alertsClient.client();

          expect(keys(publicAlertsClient)).toEqual([
            'report',
            'isTrackedAlert',
            'setAlertData',
            'getAlertLimitValue',
            'setAlertLimitReached',
            'getRecoveredAlerts',
          ]);
        });

        test('should return recovered alert document with recovered alert, if it exists', async () => {
          clusterClient.search.mockResolvedValue({
            took: 10,
            timed_out: false,
            _shards: { failed: 0, successful: 1, total: 1, skipped: 0 },
            hits: {
              total: { relation: 'eq', value: 1 },
              hits: [
                {
                  _id: 'abc',
                  _index: '.internal.alerts-test.alerts-default-000001',
                  _seq_no: 42,
                  _primary_term: 666,
                  _source: fetchedAlert1,
                },
              ],
            },
          });
          const alertsClient = new AlertsClient<{}, {}, {}, 'default', 'recovered'>(
            alertsClientParams
          );
          await alertsClient.initializeExecution({
            ...defaultExecutionOpts,
            activeAlertsFromState: {
              '1': trackedAlert1Raw,
            },
          });

          // report no alerts to allow existing alert to recover

          const publicAlertsClient = alertsClient.client();
          const recoveredAlerts = publicAlertsClient.getRecoveredAlerts();
          expect(recoveredAlerts.length).toEqual(1);
          const recoveredAlert = recoveredAlerts[0];
          expect(recoveredAlert.alert.getId()).toEqual('1');
          expect(recoveredAlert.alert.getUuid()).toEqual('abc');
          expect(recoveredAlert.alert.getStart()).toEqual('2023-03-28T12:27:28.159Z');
          expect(recoveredAlert.hit).toEqual(fetchedAlert1);
        });

        test('should return undefined document with recovered alert, if it does not exists', async () => {
          clusterClient.search.mockResolvedValue({
            took: 10,
            timed_out: false,
            _shards: { failed: 0, successful: 1, total: 1, skipped: 0 },
            hits: {
              total: { relation: 'eq', value: 0 },
              hits: [],
            },
          });
          const alertsClient = new AlertsClient<{}, {}, {}, 'default', 'recovered'>(
            alertsClientParams
          );
          await alertsClient.initializeExecution({
            ...defaultExecutionOpts,
            activeAlertsFromState: {
              '1': trackedAlert1Raw,
            },
          });

          // report no alerts to allow existing alert to recover

          const publicAlertsClient = alertsClient.client();
          const recoveredAlerts = publicAlertsClient.getRecoveredAlerts();
          expect(recoveredAlerts.length).toEqual(1);
          const recoveredAlert = recoveredAlerts[0];
          expect(recoveredAlert.alert.getId()).toEqual('1');
          expect(recoveredAlert.alert.getUuid()).toEqual('abc');
          expect(recoveredAlert.alert.getStart()).toEqual('2023-03-28T12:27:28.159Z');
          expect(recoveredAlert.hit).toBeUndefined();
        });
      });

      describe('isTrackedAlert()', () => {
        test('should return true if alert was active in a previous execution, false otherwise', async () => {
          const alertsClient = new AlertsClient<{}, {}, {}, 'default', 'recovered'>(
            alertsClientParams
          );

          await alertsClient.initializeExecution({
            ...defaultExecutionOpts,
            activeAlertsFromState: { '1': trackedAlert1Raw, '2': trackedAlert2Raw },
          });
          expect(alertsClient.isTrackedAlert('1')).toBe(true);
          expect(alertsClient.isTrackedAlert('2')).toBe(true);
          expect(alertsClient.isTrackedAlert('3')).toBe(false);
        });
      });
    });
  }
});
