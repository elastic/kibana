/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { elasticsearchServiceMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { UntypedNormalizedRuleType } from '../rule_type_registry';
import {
  AlertsFilter,
  DEFAULT_FLAPPING_SETTINGS,
  RecoveredActionGroup,
  RuleAlertData,
  RuleNotifyWhen,
} from '../types';
import * as LegacyAlertsClientModule from './legacy_alerts_client';
import { Alert } from '../alert/alert';
import { AlertsClient, AlertsClientParams } from './alerts_client';
import { GetSummarizedAlertsParams, ProcessAndLogAlertsOpts } from './types';
import { legacyAlertsClientMock } from './legacy_alerts_client.mock';
import { keys, range } from 'lodash';
import { alertingEventLoggerMock } from '../lib/alerting_event_logger/alerting_event_logger.mock';
import { ruleRunMetricsStoreMock } from '../lib/rule_run_metrics_store.mock';
import { expandFlattenedAlert } from './lib/get_summarized_alerts_query';
import {
  alertRuleData,
  getExpectedQueryByExecutionUuid,
  getExpectedQueryByTimeRange,
  getParamsByExecutionUuid,
  getParamsByTimeQuery,
  mockAAD,
} from './alerts_client_fixtures';

const date = '2023-03-28T22:27:28.159Z';
const maxAlerts = 1000;
let logger: ReturnType<typeof loggingSystemMock['createLogger']>;
const clusterClient = elasticsearchServiceMock.createClusterClient().asInternalUser;
const alertingEventLogger = alertingEventLoggerMock.create();
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

describe('Alerts Client', () => {
  let alertsClientParams: AlertsClientParams;
  let processAndLogAlertsOpts: ProcessAndLogAlertsOpts;
  beforeAll(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(date));
  });

  beforeEach(() => {
    jest.clearAllMocks();
    logger = loggingSystemMock.createLogger();
    alertsClientParams = {
      logger,
      elasticsearchClientPromise: Promise.resolve(clusterClient),
      ruleType,
      namespace: 'default',
      rule: alertRuleData,
      kibanaVersion: '8.9.0',
    };
    processAndLogAlertsOpts = {
      eventLogger: alertingEventLogger,
      ruleRunMetricsStore,
      shouldLogAlerts: false,
      flappingSettings: DEFAULT_FLAPPING_SETTINGS,
      notifyWhen: RuleNotifyWhen.CHANGE,
      maintenanceWindowIds: [],
    };
  });

  afterAll(() => {
    jest.useRealTimers();
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

      const opts = {
        maxAlerts,
        ruleLabel: `test: rule-name`,
        flappingSettings: DEFAULT_FLAPPING_SETTINGS,
        activeAlertsFromState: {},
        recoveredAlertsFromState: {},
      };
      await alertsClient.initializeExecution(opts);
      expect(mockLegacyAlertsClient.initializeExecution).toHaveBeenCalledWith(opts);

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

      const opts = {
        maxAlerts,
        ruleLabel: `test: rule-name`,
        flappingSettings: DEFAULT_FLAPPING_SETTINGS,
        activeAlertsFromState: {},
        recoveredAlertsFromState: {},
      };
      await alertsClient.initializeExecution(opts);
      expect(mockLegacyAlertsClient.initializeExecution).toHaveBeenCalledWith(opts);
      expect(mockLegacyAlertsClient.getTrackedAlerts).not.toHaveBeenCalled();
      spy.mockRestore();
    });

    test('should query for alert UUIDs if they exist', async () => {
      mockLegacyAlertsClient.getTrackedAlerts.mockImplementation(() => ({
        active: {
          '1': new Alert('1', {
            state: { foo: true },
            meta: {
              flapping: false,
              flappingHistory: [true, false],
              lastScheduledActions: { group: 'default', date: new Date() },
              uuid: 'abc',
            },
          }),
          '2': new Alert('2', {
            state: { foo: false },
            meta: {
              flapping: false,
              flappingHistory: [true, false, false],
              lastScheduledActions: { group: 'default', date: new Date() },
              uuid: 'def',
            },
          }),
        },
        recovered: {
          '3': new Alert('3', {
            state: { foo: false },
            meta: {
              flapping: false,
              flappingHistory: [true, false, false],
              uuid: 'xyz',
            },
          }),
        },
      }));
      const spy = jest
        .spyOn(LegacyAlertsClientModule, 'LegacyAlertsClient')
        .mockImplementation(() => mockLegacyAlertsClient);

      const alertsClient = new AlertsClient(alertsClientParams);

      const opts = {
        maxAlerts,
        ruleLabel: `test: rule-name`,
        flappingSettings: DEFAULT_FLAPPING_SETTINGS,
        activeAlertsFromState: {},
        recoveredAlertsFromState: {},
      };
      await alertsClient.initializeExecution(opts);
      expect(mockLegacyAlertsClient.initializeExecution).toHaveBeenCalledWith(opts);

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
          size: 3,
        },
        index: '.internal.alerts-test.alerts-default-*',
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
              lastScheduledActions: { group: 'default', date: new Date() },
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

      const opts = {
        maxAlerts,
        ruleLabel: `test: rule-name`,
        flappingSettings: DEFAULT_FLAPPING_SETTINGS,
        activeAlertsFromState: {},
        recoveredAlertsFromState: {},
      };
      await alertsClient.initializeExecution(opts);
      expect(mockLegacyAlertsClient.initializeExecution).toHaveBeenCalledWith(opts);

      expect(clusterClient.search).toHaveBeenCalledTimes(2);

      spy.mockRestore();
    });

    test('should log but not throw if query returns error', async () => {
      clusterClient.search.mockImplementation(() => {
        throw new Error('search failed!');
      });
      mockLegacyAlertsClient.getTrackedAlerts.mockImplementation(() => ({
        active: {
          '1': new Alert('1', {
            state: { foo: true },
            meta: {
              flapping: false,
              flappingHistory: [true, false],
              lastScheduledActions: { group: 'default', date: new Date() },
              uuid: 'abc',
            },
          }),
        },
        recovered: {},
      }));
      const spy = jest
        .spyOn(LegacyAlertsClientModule, 'LegacyAlertsClient')
        .mockImplementation(() => mockLegacyAlertsClient);

      const alertsClient = new AlertsClient(alertsClientParams);

      const opts = {
        maxAlerts,
        ruleLabel: `test: rule-name`,
        flappingSettings: DEFAULT_FLAPPING_SETTINGS,
        activeAlertsFromState: {},
        recoveredAlertsFromState: {},
      };
      await alertsClient.initializeExecution(opts);
      expect(mockLegacyAlertsClient.initializeExecution).toHaveBeenCalledWith(opts);

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
        },
        index: '.internal.alerts-test.alerts-default-*',
      });

      expect(logger.error).toHaveBeenCalledWith(
        `Error searching for tracked alerts by UUID - search failed!`
      );

      spy.mockRestore();
    });
  });

  describe('persistAlerts()', () => {
    test('should index new alerts', async () => {
      const alertsClient = new AlertsClient<{}, {}, {}, 'default', 'recovered'>(alertsClientParams);

      await alertsClient.initializeExecution({
        maxAlerts,
        ruleLabel: `test: rule-name`,
        flappingSettings: DEFAULT_FLAPPING_SETTINGS,
        activeAlertsFromState: {},
        recoveredAlertsFromState: {},
      });

      // Report 2 new alerts
      const alertExecutorService = alertsClient.factory();
      alertExecutorService.create('1').scheduleActions('default');
      alertExecutorService.create('2').scheduleActions('default');

      alertsClient.processAndLogAlerts(processAndLogAlertsOpts);

      await alertsClient.persistAlerts();

      const { alertsToReturn } = alertsClient.getAlertsToSerialize();
      const uuid1 = alertsToReturn['1'].meta?.uuid;
      const uuid2 = alertsToReturn['2'].meta?.uuid;

      expect(clusterClient.bulk).toHaveBeenCalledWith({
        index: '.alerts-test.alerts-default',
        refresh: 'wait_for',
        require_alias: true,
        body: [
          { index: { _id: uuid1 } },
          // new alert doc
          {
            '@timestamp': date,
            event: {
              action: 'open',
              kind: 'signal',
            },
            kibana: {
              alert: {
                action_group: 'default',
                duration: {
                  us: '0',
                },
                flapping: false,
                flapping_history: [true],
                instance: {
                  id: '1',
                },
                maintenance_window_ids: [],
                rule: {
                  category: 'My test rule',
                  consumer: 'bar',
                  execution: {
                    uuid: '5f6aa57d-3e22-484e-bae8-cbed868f4d28',
                  },
                  name: 'rule-name',
                  parameters: {
                    bar: true,
                  },
                  producer: 'alerts',
                  revision: 0,
                  rule_type_id: 'test.rule-type',
                  tags: ['rule-', '-tags'],
                  uuid: '1',
                },
                start: date,
                status: 'active',
                time_range: {
                  gte: date,
                },
                uuid: uuid1,
                workflow_status: 'open',
              },
              space_ids: ['default'],
              version: '8.9.0',
            },
            tags: ['rule-', '-tags'],
          },
          { index: { _id: uuid2 } },
          // new alert doc
          {
            '@timestamp': date,
            event: {
              action: 'open',
              kind: 'signal',
            },
            kibana: {
              alert: {
                action_group: 'default',
                duration: {
                  us: '0',
                },
                flapping: false,
                flapping_history: [true],
                instance: {
                  id: '2',
                },
                maintenance_window_ids: [],
                rule: {
                  category: 'My test rule',
                  consumer: 'bar',
                  execution: {
                    uuid: '5f6aa57d-3e22-484e-bae8-cbed868f4d28',
                  },
                  name: 'rule-name',
                  parameters: {
                    bar: true,
                  },
                  producer: 'alerts',
                  revision: 0,
                  rule_type_id: 'test.rule-type',
                  tags: ['rule-', '-tags'],
                  uuid: '1',
                },
                start: date,
                status: 'active',
                time_range: {
                  gte: date,
                },
                uuid: uuid2,
                workflow_status: 'open',
              },
              space_ids: ['default'],
              version: '8.9.0',
            },
            tags: ['rule-', '-tags'],
          },
        ],
      });
    });

    test('should update ongoing alerts in existing index', async () => {
      clusterClient.search.mockResolvedValue({
        took: 10,
        timed_out: false,
        _shards: { failed: 0, successful: 1, total: 1, skipped: 0 },
        hits: {
          total: {
            relation: 'eq',
            value: 1,
          },
          hits: [
            {
              _id: 'abc',
              _index: '.internal.alerts-test.alerts-default-000001',
              _source: {
                '@timestamp': '2023-03-28T12:27:28.159Z',
                event: {
                  action: 'active',
                  kind: 'signal',
                },
                kibana: {
                  alert: {
                    action_group: 'default',
                    duration: {
                      us: '0',
                    },
                    flapping: false,
                    flapping_history: [true],
                    instance: {
                      id: '1',
                    },
                    rule: {
                      category: 'My test rule',
                      consumer: 'bar',
                      execution: {
                        uuid: '5f6aa57d-3e22-484e-bae8-cbed868f4d28',
                      },
                      name: 'rule-name',
                      parameters: {
                        bar: true,
                      },
                      producer: 'alerts',
                      revision: 0,
                      rule_type_id: 'test.rule-type',
                      tags: ['rule-', '-tags'],
                      uuid: '1',
                    },
                    start: '2023-03-28T12:27:28.159Z',
                    status: 'active',
                    time_range: {
                      gte: '2023-03-28T12:27:28.159Z',
                    },
                    uuid: 'abc',
                    workflow_status: 'open',
                  },
                  space_ids: ['default'],
                  version: '8.8.0',
                },
                tags: ['rule-', '-tags'],
              },
            },
          ],
        },
      });
      const alertsClient = new AlertsClient<{}, {}, {}, 'default', 'recovered'>(alertsClientParams);

      await alertsClient.initializeExecution({
        maxAlerts,
        ruleLabel: `test: rule-name`,
        flappingSettings: DEFAULT_FLAPPING_SETTINGS,
        activeAlertsFromState: {
          '1': {
            state: { foo: true, start: '2023-03-28T12:27:28.159Z', duration: '0' },
            meta: {
              flapping: false,
              flappingHistory: [true],
              maintenanceWindowIds: [],
              lastScheduledActions: { group: 'default', date: new Date() },
              uuid: 'abc',
            },
          },
        },
        recoveredAlertsFromState: {},
      });

      // Report 1 new alert and 1 active alert
      const alertExecutorService = alertsClient.factory();
      alertExecutorService.create('1').scheduleActions('default');
      alertExecutorService.create('2').scheduleActions('default');

      alertsClient.processAndLogAlerts(processAndLogAlertsOpts);

      await alertsClient.persistAlerts();

      const { alertsToReturn } = alertsClient.getAlertsToSerialize();
      const uuid2 = alertsToReturn['2'].meta?.uuid;

      expect(clusterClient.bulk).toHaveBeenCalledWith({
        index: '.alerts-test.alerts-default',
        refresh: 'wait_for',
        require_alias: true,
        body: [
          {
            index: {
              _id: 'abc',
              _index: '.internal.alerts-test.alerts-default-000001',
              require_alias: false,
            },
          },
          // ongoing alert doc
          {
            '@timestamp': date,
            event: {
              action: 'active',
              kind: 'signal',
            },
            kibana: {
              alert: {
                action_group: 'default',
                duration: {
                  us: '36000000000000',
                },
                flapping: false,
                flapping_history: [true, false],
                instance: {
                  id: '1',
                },
                maintenance_window_ids: [],
                rule: {
                  category: 'My test rule',
                  consumer: 'bar',
                  execution: {
                    uuid: '5f6aa57d-3e22-484e-bae8-cbed868f4d28',
                  },
                  name: 'rule-name',
                  parameters: {
                    bar: true,
                  },
                  producer: 'alerts',
                  revision: 0,
                  rule_type_id: 'test.rule-type',
                  tags: ['rule-', '-tags'],
                  uuid: '1',
                },
                start: '2023-03-28T12:27:28.159Z',
                status: 'active',
                time_range: {
                  gte: '2023-03-28T12:27:28.159Z',
                },
                uuid: 'abc',
                workflow_status: 'open',
              },
              space_ids: ['default'],
              version: '8.9.0',
            },
            tags: ['rule-', '-tags'],
          },
          { index: { _id: uuid2 } },
          // new alert doc
          {
            '@timestamp': date,
            event: {
              action: 'open',
              kind: 'signal',
            },
            kibana: {
              alert: {
                action_group: 'default',
                duration: {
                  us: '0',
                },
                flapping: false,
                flapping_history: [true],
                instance: {
                  id: '2',
                },
                maintenance_window_ids: [],
                rule: {
                  category: 'My test rule',
                  consumer: 'bar',
                  execution: {
                    uuid: '5f6aa57d-3e22-484e-bae8-cbed868f4d28',
                  },
                  name: 'rule-name',
                  parameters: {
                    bar: true,
                  },
                  producer: 'alerts',
                  revision: 0,
                  rule_type_id: 'test.rule-type',
                  tags: ['rule-', '-tags'],
                  uuid: '1',
                },
                start: date,
                status: 'active',
                time_range: {
                  gte: date,
                },
                uuid: uuid2,
                workflow_status: 'open',
              },
              space_ids: ['default'],
              version: '8.9.0',
            },
            tags: ['rule-', '-tags'],
          },
        ],
      });
    });

    test('should recover recovered alerts in existing index', async () => {
      clusterClient.search.mockResolvedValue({
        took: 10,
        timed_out: false,
        _shards: { failed: 0, successful: 1, total: 1, skipped: 0 },
        hits: {
          total: {
            relation: 'eq',
            value: 1,
          },
          hits: [
            {
              _id: 'abc',
              _index: '.internal.alerts-test.alerts-default-000001',
              _source: {
                '@timestamp': '2023-03-28T12:27:28.159Z',
                event: {
                  action: 'open',
                  kind: 'signal',
                },
                kibana: {
                  alert: {
                    action_group: 'default',
                    duration: {
                      us: '0',
                    },
                    flapping: false,
                    flapping_history: [true],
                    instance: {
                      id: '1',
                    },
                    rule: {
                      category: 'My test rule',
                      consumer: 'bar',
                      execution: {
                        uuid: '5f6aa57d-3e22-484e-bae8-cbed868f4d28',
                      },
                      name: 'rule-name',
                      parameters: {
                        bar: true,
                      },
                      producer: 'alerts',
                      revision: 0,
                      rule_type_id: 'test.rule-type',
                      tags: ['rule-', '-tags'],
                      uuid: '1',
                    },
                    start: '2023-03-28T12:27:28.159Z',
                    status: 'active',
                    time_range: {
                      gte: '2023-03-28T12:27:28.159Z',
                    },
                    uuid: 'abc',
                    workflow_status: 'open',
                  },
                  space_ids: ['default'],
                  version: '8.8.0',
                },
                tags: ['rule-', '-tags'],
              },
            },
            {
              _id: 'def',
              _index: '.internal.alerts-test.alerts-default-000002',
              _source: {
                '@timestamp': '2023-03-28T12:27:28.159Z',
                event: {
                  action: 'active',
                  kind: 'signal',
                },
                kibana: {
                  alert: {
                    action_group: 'default',
                    duration: {
                      us: '36000000000000',
                    },
                    flapping: false,
                    flapping_history: [true, false],
                    instance: {
                      id: '2',
                    },
                    rule: {
                      category: 'My test rule',
                      consumer: 'bar',
                      execution: {
                        uuid: '5f6aa57d-3e22-484e-bae8-cbed868f4d28',
                      },
                      name: 'rule-name',
                      parameters: {
                        bar: true,
                      },
                      producer: 'alerts',
                      revision: 0,
                      rule_type_id: 'test.rule-type',
                      tags: ['rule-', '-tags'],
                      uuid: '1',
                    },
                    start: '2023-03-28T02:27:28.159Z',
                    status: 'active',
                    time_range: {
                      gte: '2023-03-28T02:27:28.159Z',
                    },
                    uuid: 'def',
                    workflow_status: 'open',
                  },
                  space_ids: ['default'],
                  version: '8.8.0',
                },
                tags: ['rule-', '-tags'],
              },
            },
          ],
        },
      });
      const alertsClient = new AlertsClient<{}, {}, {}, 'default', 'recovered'>(alertsClientParams);

      await alertsClient.initializeExecution({
        maxAlerts,
        ruleLabel: `test: rule-name`,
        flappingSettings: DEFAULT_FLAPPING_SETTINGS,
        activeAlertsFromState: {
          '1': {
            state: { foo: true, start: '2023-03-28T12:27:28.159Z', duration: '0' },
            meta: {
              flapping: false,
              flappingHistory: [true],
              maintenanceWindowIds: [],
              lastScheduledActions: { group: 'default', date: new Date() },
              uuid: 'abc',
            },
          },
          '2': {
            state: { foo: true, start: '2023-03-28T02:27:28.159Z', duration: '36000000000000' },
            meta: {
              flapping: false,
              flappingHistory: [true, false],
              maintenanceWindowIds: [],
              lastScheduledActions: { group: 'default', date: new Date() },
              uuid: 'def',
            },
          },
        },
        recoveredAlertsFromState: {},
      });

      // Report 1 new alert and 1 active alert, recover 1 alert
      const alertExecutorService = alertsClient.factory();
      alertExecutorService.create('2').scheduleActions('default');
      alertExecutorService.create('3').scheduleActions('default');

      alertsClient.processAndLogAlerts(processAndLogAlertsOpts);

      await alertsClient.persistAlerts();

      const { alertsToReturn } = alertsClient.getAlertsToSerialize();
      const uuid3 = alertsToReturn['3'].meta?.uuid;

      expect(clusterClient.bulk).toHaveBeenCalledWith({
        index: '.alerts-test.alerts-default',
        refresh: 'wait_for',
        require_alias: true,
        body: [
          {
            index: {
              _id: 'def',
              _index: '.internal.alerts-test.alerts-default-000002',
              require_alias: false,
            },
          },
          // ongoing alert doc
          {
            '@timestamp': date,
            event: {
              action: 'active',
              kind: 'signal',
            },
            kibana: {
              alert: {
                action_group: 'default',
                duration: {
                  us: '72000000000000',
                },
                flapping: false,
                flapping_history: [true, false, false],
                instance: {
                  id: '2',
                },
                maintenance_window_ids: [],
                rule: {
                  category: 'My test rule',
                  consumer: 'bar',
                  execution: {
                    uuid: '5f6aa57d-3e22-484e-bae8-cbed868f4d28',
                  },
                  name: 'rule-name',
                  parameters: {
                    bar: true,
                  },
                  producer: 'alerts',
                  revision: 0,
                  rule_type_id: 'test.rule-type',
                  tags: ['rule-', '-tags'],
                  uuid: '1',
                },
                start: '2023-03-28T02:27:28.159Z',
                status: 'active',
                time_range: {
                  gte: '2023-03-28T02:27:28.159Z',
                },
                uuid: 'def',
                workflow_status: 'open',
              },
              space_ids: ['default'],
              version: '8.9.0',
            },
            tags: ['rule-', '-tags'],
          },
          { index: { _id: uuid3 } },
          // new alert doc
          {
            '@timestamp': date,
            event: {
              action: 'open',
              kind: 'signal',
            },
            kibana: {
              alert: {
                action_group: 'default',
                duration: {
                  us: '0',
                },
                flapping: false,
                flapping_history: [true],
                instance: {
                  id: '3',
                },
                maintenance_window_ids: [],
                rule: {
                  category: 'My test rule',
                  consumer: 'bar',
                  execution: {
                    uuid: '5f6aa57d-3e22-484e-bae8-cbed868f4d28',
                  },
                  name: 'rule-name',
                  parameters: {
                    bar: true,
                  },
                  producer: 'alerts',
                  revision: 0,
                  rule_type_id: 'test.rule-type',
                  tags: ['rule-', '-tags'],
                  uuid: '1',
                },
                start: date,
                status: 'active',
                time_range: {
                  gte: date,
                },
                uuid: uuid3,
                workflow_status: 'open',
              },
              space_ids: ['default'],
              version: '8.9.0',
            },
            tags: ['rule-', '-tags'],
          },
          {
            index: {
              _id: 'abc',
              _index: '.internal.alerts-test.alerts-default-000001',
              require_alias: false,
            },
          },
          // recovered alert doc
          {
            '@timestamp': date,
            event: {
              action: 'close',
              kind: 'signal',
            },
            kibana: {
              alert: {
                action_group: 'recovered',
                duration: {
                  us: '36000000000000',
                },
                end: date,
                flapping: false,
                flapping_history: [true, true],
                instance: {
                  id: '1',
                },
                maintenance_window_ids: [],
                rule: {
                  category: 'My test rule',
                  consumer: 'bar',
                  execution: {
                    uuid: '5f6aa57d-3e22-484e-bae8-cbed868f4d28',
                  },
                  name: 'rule-name',
                  parameters: {
                    bar: true,
                  },
                  producer: 'alerts',
                  revision: 0,
                  rule_type_id: 'test.rule-type',
                  tags: ['rule-', '-tags'],
                  uuid: '1',
                },
                start: '2023-03-28T12:27:28.159Z',
                status: 'recovered',
                time_range: {
                  gte: '2023-03-28T12:27:28.159Z',
                  lte: date,
                },
                uuid: 'abc',
                workflow_status: 'open',
              },
              space_ids: ['default'],
              version: '8.9.0',
            },
            tags: ['rule-', '-tags'],
          },
        ],
      });
    });

    test('should not try to index if no alerts', async () => {
      const alertsClient = new AlertsClient<{}, {}, {}, 'default', 'recovered'>(alertsClientParams);

      await alertsClient.initializeExecution({
        maxAlerts,
        ruleLabel: `test: rule-name`,
        flappingSettings: DEFAULT_FLAPPING_SETTINGS,
        activeAlertsFromState: {},
        recoveredAlertsFromState: {},
      });

      // Report no alerts

      alertsClient.processAndLogAlerts(processAndLogAlertsOpts);

      await alertsClient.persistAlerts();

      expect(clusterClient.bulk).not.toHaveBeenCalled();
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
              _index: '.internal.alerts-test.alerts-default-000002',
              _id: '1',
              _version: 1,
              result: 'created',
              _shards: {
                total: 2,
                successful: 1,
                failed: 0,
              },
              status: 201,
              _seq_no: 0,
              _primary_term: 1,
            },
          },
        ],
      });
      const alertsClient = new AlertsClient<{}, {}, {}, 'default', 'recovered'>(alertsClientParams);

      await alertsClient.initializeExecution({
        maxAlerts,
        ruleLabel: `test: rule-name`,
        flappingSettings: DEFAULT_FLAPPING_SETTINGS,
        activeAlertsFromState: {},
        recoveredAlertsFromState: {},
      });

      // Report 2 new alerts
      const alertExecutorService = alertsClient.factory();
      alertExecutorService.create('1').scheduleActions('default');
      alertExecutorService.create('2').scheduleActions('default');

      alertsClient.processAndLogAlerts(processAndLogAlertsOpts);

      await alertsClient.persistAlerts();

      expect(clusterClient.bulk).toHaveBeenCalled();
      expect(logger.error).toHaveBeenCalledWith(
        `Error writing 1 out of 2 alerts - [{\"type\":\"action_request_validation_exception\",\"reason\":\"Validation Failed: 1: index is missing;2: type is missing;\"}]`
      );
    });

    test('should log and swallow error if bulk indexing throws error', async () => {
      clusterClient.bulk.mockImplementation(() => {
        throw new Error('fail');
      });
      const alertsClient = new AlertsClient<{}, {}, {}, 'default', 'recovered'>(alertsClientParams);

      await alertsClient.initializeExecution({
        maxAlerts,
        ruleLabel: `test: rule-name`,
        flappingSettings: DEFAULT_FLAPPING_SETTINGS,
        activeAlertsFromState: {},
        recoveredAlertsFromState: {},
      });

      // Report 2 new alerts
      const alertExecutorService = alertsClient.factory();
      alertExecutorService.create('1').scheduleActions('default');
      alertExecutorService.create('2').scheduleActions('default');

      alertsClient.processAndLogAlerts(processAndLogAlertsOpts);

      await alertsClient.persistAlerts();

      expect(clusterClient.bulk).toHaveBeenCalled();
      expect(logger.error).toHaveBeenCalledWith(
        `Error writing 2 alerts to .alerts-test.alerts-default - fail`
      );
    });

    test('should not persist alerts if shouldWrite is false', async () => {
      alertsClientParams = {
        logger,
        elasticsearchClientPromise: Promise.resolve(clusterClient),
        ruleType: {
          ...ruleType,
          alerts: {
            ...ruleType.alerts!,
            shouldWrite: false,
          },
        },
        namespace: 'default',
        rule: alertRuleData,
        kibanaVersion: '8.9.0',
      };
      const alertsClient = new AlertsClient<{}, {}, {}, 'default', 'recovered'>(alertsClientParams);

      expect(await alertsClient.persistAlerts()).toBe(void 0);

      expect(logger.debug).toHaveBeenCalledWith(
        `Resources registered and installed for test context but "shouldWrite" is set to false.`
      );
      expect(clusterClient.bulk).not.toHaveBeenCalled();
    });
  });

  // FLAKY: https://github.com/elastic/kibana/issues/163193
  // FLAKY: https://github.com/elastic/kibana/issues/163194
  // FLAKY: https://github.com/elastic/kibana/issues/163195
  describe.skip('getSummarizedAlerts', () => {
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
        test.each([
          {
            text: 'should generate the correct query',
            params: baseParams,
            call1: getQuery({
              alertType: 'new',
              isLifecycleAlert,
            }),
            call2: getQuery({
              alertType: 'ongoing',
            }),
            call3: getQuery({
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
              alertType: 'new',
              isLifecycleAlert,
              excludedAlertInstanceIds,
            }),
            call2: getQuery({
              alertType: 'ongoing',
              excludedAlertInstanceIds,
            }),
            call3: getQuery({
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
              alertType: 'new',
              isLifecycleAlert,
              alertsFilter,
            }),
            call2: getQuery({
              alertType: 'ongoing',
              alertsFilter,
            }),
            call3: getQuery({
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
              alertType: 'new',
              isLifecycleAlert,
              alertsFilter,
            }),
            call2: getQuery({
              alertType: 'ongoing',
              alertsFilter,
            }),
            call3: getQuery({
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
          alertsClient.getSummarizedAlerts(paramsWithoutExecutionUuid as GetSummarizedAlertsParams)
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
      const alertsClient = new AlertsClient<{}, {}, {}, 'default', 'recovered'>(alertsClientParams);

      await alertsClient.initializeExecution({
        maxAlerts,
        ruleLabel: `test: rule-name`,
        flappingSettings: DEFAULT_FLAPPING_SETTINGS,
        activeAlertsFromState: {},
        recoveredAlertsFromState: {},
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
      expect(start1).toBeNull();
      expect(start2).toBeNull();
    });

    test('should set context if defined', async () => {
      mockLegacyAlertsClient.factory.mockImplementation(() => ({ create: mockCreate }));
      const spy = jest
        .spyOn(LegacyAlertsClientModule, 'LegacyAlertsClient')
        .mockImplementation(() => mockLegacyAlertsClient);
      const alertsClient = new AlertsClient<{}, {}, { foo?: string }, 'default', 'recovered'>(
        alertsClientParams
      );

      await alertsClient.initializeExecution({
        maxAlerts,
        ruleLabel: `test: rule-name`,
        flappingSettings: DEFAULT_FLAPPING_SETTINGS,
        activeAlertsFromState: {},
        recoveredAlertsFromState: {},
      });

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

      await alertsClient.initializeExecution({
        maxAlerts,
        ruleLabel: `test: rule-name`,
        flappingSettings: DEFAULT_FLAPPING_SETTINGS,
        activeAlertsFromState: {},
        recoveredAlertsFromState: {},
      });

      // Report 2 new alerts
      alertsClient.report({ id: '1', actionGroup: 'default', state: { count: 1 }, context: {} });
      alertsClient.report({ id: '2', actionGroup: 'default', state: { count: 2 }, context: {} });

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

      await alertsClient.initializeExecution({
        maxAlerts,
        ruleLabel: `test: rule-name`,
        flappingSettings: DEFAULT_FLAPPING_SETTINGS,
        activeAlertsFromState: {},
        recoveredAlertsFromState: {},
      });

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

      alertsClient.processAndLogAlerts(processAndLogAlertsOpts);

      await alertsClient.persistAlerts();

      const { alertsToReturn } = alertsClient.getAlertsToSerialize();
      const uuid1 = alertsToReturn['1'].meta?.uuid;
      const uuid2 = alertsToReturn['2'].meta?.uuid;

      expect(clusterClient.bulk).toHaveBeenCalledWith({
        index: '.alerts-test.alerts-default',
        refresh: 'wait_for',
        require_alias: true,
        body: [
          { index: { _id: uuid1 } },
          // new alert doc
          {
            '@timestamp': date,
            count: 1,
            event: {
              action: 'open',
              kind: 'signal',
            },
            kibana: {
              alert: {
                action_group: 'default',
                duration: {
                  us: '0',
                },
                flapping: false,
                flapping_history: [true],
                instance: {
                  id: '1',
                },
                maintenance_window_ids: [],
                rule: {
                  category: 'My test rule',
                  consumer: 'bar',
                  execution: {
                    uuid: '5f6aa57d-3e22-484e-bae8-cbed868f4d28',
                  },
                  name: 'rule-name',
                  parameters: {
                    bar: true,
                  },
                  producer: 'alerts',
                  revision: 0,
                  rule_type_id: 'test.rule-type',
                  tags: ['rule-', '-tags'],
                  uuid: '1',
                },
                start: date,
                status: 'active',
                time_range: {
                  gte: date,
                },
                uuid: uuid1,
                workflow_status: 'open',
              },
              space_ids: ['default'],
              version: '8.9.0',
            },
            tags: ['rule-', '-tags'],
            url: `https://url1`,
          },
          { index: { _id: uuid2 } },
          // new alert doc
          {
            '@timestamp': date,
            count: 2,
            event: {
              action: 'open',
              kind: 'signal',
            },
            kibana: {
              alert: {
                action_group: 'default',
                duration: {
                  us: '0',
                },
                flapping: false,
                flapping_history: [true],
                instance: {
                  id: '2',
                },
                maintenance_window_ids: [],
                rule: {
                  category: 'My test rule',
                  consumer: 'bar',
                  execution: {
                    uuid: '5f6aa57d-3e22-484e-bae8-cbed868f4d28',
                  },
                  name: 'rule-name',
                  parameters: {
                    bar: true,
                  },
                  producer: 'alerts',
                  revision: 0,
                  rule_type_id: 'test.rule-type',
                  tags: ['rule-', '-tags'],
                  uuid: '1',
                },
                start: date,
                status: 'active',
                time_range: {
                  gte: date,
                },
                uuid: uuid2,
                workflow_status: 'open',
              },
              space_ids: ['default'],
              version: '8.9.0',
            },
            tags: ['rule-', '-tags'],
            url: `https://url2`,
          },
        ],
      });
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
      const alertsClient = new AlertsClient<{}, {}, {}, 'default', 'recovered'>(alertsClientParams);

      await alertsClient.initializeExecution({
        maxAlerts,
        ruleLabel: `test: rule-name`,
        flappingSettings: DEFAULT_FLAPPING_SETTINGS,
        activeAlertsFromState: {
          '1': {
            state: { foo: true, start: '2023-03-28T12:27:28.159Z', duration: '0' },
            meta: {
              flapping: false,
              flappingHistory: [true],
              maintenanceWindowIds: [],
              lastScheduledActions: { group: 'default', date: new Date() },
              uuid: 'abc',
            },
          },
          '2': {
            state: { foo: true, start: '2023-03-28T02:27:28.159Z', duration: '36000000000000' },
            meta: {
              flapping: false,
              flappingHistory: [true, false],
              maintenanceWindowIds: [],
              lastScheduledActions: { group: 'default', date: new Date() },
              uuid: 'def',
            },
          },
        },
        recoveredAlertsFromState: {},
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
        maxAlerts,
        ruleLabel: `test: rule-name`,
        flappingSettings: DEFAULT_FLAPPING_SETTINGS,
        activeAlertsFromState: {
          '1': {
            state: { foo: true, start: '2023-03-28T12:27:28.159Z', duration: '0' },
            meta: {
              flapping: false,
              flappingHistory: [true],
              maintenanceWindowIds: [],
              lastScheduledActions: { group: 'default', date: new Date() },
              uuid: 'abc',
            },
          },
          '2': {
            state: { foo: true, start: '2023-03-28T02:27:28.159Z', duration: '36000000000000' },
            meta: {
              flapping: false,
              flappingHistory: [true, false],
              maintenanceWindowIds: [],
              lastScheduledActions: { group: 'default', date: new Date() },
              uuid: 'def',
            },
          },
        },
        recoveredAlertsFromState: {},
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
          total: {
            relation: 'eq',
            value: 0,
          },
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

      await alertsClient.initializeExecution({
        maxAlerts,
        ruleLabel: `test: rule-name`,
        flappingSettings: DEFAULT_FLAPPING_SETTINGS,
        activeAlertsFromState: {},
        recoveredAlertsFromState: {},
      });

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

      alertsClient.processAndLogAlerts(processAndLogAlertsOpts);

      await alertsClient.persistAlerts();

      expect(clusterClient.bulk).toHaveBeenCalledWith({
        index: '.alerts-test.alerts-default',
        refresh: 'wait_for',
        require_alias: true,
        body: [
          {
            index: {
              _id: expect.any(String),
            },
          },
          {
            '@timestamp': date,
            count: 100,
            event: {
              action: 'open',
              kind: 'signal',
            },
            kibana: {
              alert: {
                action_group: 'default',
                duration: {
                  us: '0',
                },
                flapping: false,
                flapping_history: [true],
                instance: {
                  id: '1',
                },
                maintenance_window_ids: [],
                rule: {
                  category: 'My test rule',
                  consumer: 'bar',
                  execution: {
                    uuid: '5f6aa57d-3e22-484e-bae8-cbed868f4d28',
                  },
                  name: 'rule-name',
                  parameters: {
                    bar: true,
                  },
                  producer: 'alerts',
                  revision: 0,
                  rule_type_id: 'test.rule-type',
                  tags: ['rule-', '-tags'],
                  uuid: '1',
                },
                start: date,
                status: 'active',
                time_range: {
                  gte: date,
                },
                uuid: expect.any(String),
                workflow_status: 'open',
              },
              space_ids: ['default'],
              version: '8.9.0',
            },
            tags: ['rule-', '-tags'],
            url: 'https://elastic.co',
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
          total: {
            relation: 'eq',
            value: 1,
          },
          hits: [
            {
              _id: 'abc',
              _index: '.internal.alerts-test.alerts-default-000001',
              _source: {
                '@timestamp': '2023-03-28T12:27:28.159Z',
                count: 1,
                url: 'https://localhost:5601/abc',
                event: {
                  action: 'active',
                  kind: 'signal',
                },
                kibana: {
                  alert: {
                    action_group: 'default',
                    duration: {
                      us: '0',
                    },
                    flapping: false,
                    flapping_history: [true],
                    instance: {
                      id: '1',
                    },
                    rule: {
                      category: 'My test rule',
                      consumer: 'bar',
                      execution: {
                        uuid: '5f6aa57d-3e22-484e-bae8-cbed868f4d28',
                      },
                      name: 'rule-name',
                      parameters: {
                        bar: true,
                      },
                      producer: 'alerts',
                      revision: 0,
                      rule_type_id: 'test.rule-type',
                      tags: ['rule-', '-tags'],
                      uuid: '1',
                    },
                    start: '2023-03-28T12:27:28.159Z',
                    status: 'active',
                    time_range: {
                      gte: '2023-03-28T12:27:28.159Z',
                    },
                    uuid: 'abc',
                    workflow_status: 'open',
                  },
                  space_ids: ['default'],
                  version: '8.8.0',
                },
                tags: ['rule-', '-tags'],
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
        maxAlerts,
        ruleLabel: `test: rule-name`,
        flappingSettings: DEFAULT_FLAPPING_SETTINGS,
        activeAlertsFromState: {
          '1': {
            state: { foo: true, start: '2023-03-28T12:27:28.159Z', duration: '0' },
            meta: {
              flapping: false,
              flappingHistory: [true],
              maintenanceWindowIds: [],
              lastScheduledActions: { group: 'default', date: new Date() },
              uuid: 'abc',
            },
          },
        },
        recoveredAlertsFromState: {},
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

      alertsClient.processAndLogAlerts(processAndLogAlertsOpts);

      await alertsClient.persistAlerts();

      expect(clusterClient.bulk).toHaveBeenCalledWith({
        index: '.alerts-test.alerts-default',
        refresh: 'wait_for',
        require_alias: true,
        body: [
          {
            index: {
              _id: 'abc',
              _index: '.internal.alerts-test.alerts-default-000001',
              require_alias: false,
            },
          },
          {
            '@timestamp': date,
            count: 100,
            event: {
              action: 'active',
              kind: 'signal',
            },
            kibana: {
              alert: {
                action_group: 'default',
                duration: {
                  us: '36000000000000',
                },
                flapping: false,
                flapping_history: [true, false],
                instance: {
                  id: '1',
                },
                maintenance_window_ids: [],
                rule: {
                  category: 'My test rule',
                  consumer: 'bar',
                  execution: {
                    uuid: '5f6aa57d-3e22-484e-bae8-cbed868f4d28',
                  },
                  name: 'rule-name',
                  parameters: {
                    bar: true,
                  },
                  producer: 'alerts',
                  revision: 0,
                  rule_type_id: 'test.rule-type',
                  tags: ['rule-', '-tags'],
                  uuid: '1',
                },
                start: '2023-03-28T12:27:28.159Z',
                status: 'active',
                time_range: {
                  gte: '2023-03-28T12:27:28.159Z',
                },
                uuid: 'abc',
                workflow_status: 'open',
              },
              space_ids: ['default'],
              version: '8.9.0',
            },
            tags: ['rule-', '-tags'],
            url: 'https://elastic.co',
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
          total: {
            relation: 'eq',
            value: 1,
          },
          hits: [
            {
              _id: 'abc',
              _index: '.internal.alerts-test.alerts-default-000001',
              _source: {
                '@timestamp': '2023-03-28T12:27:28.159Z',
                count: 1,
                url: 'https://localhost:5601/abc',
                event: {
                  action: 'active',
                  kind: 'signal',
                },
                kibana: {
                  alert: {
                    action_group: 'default',
                    duration: {
                      us: '0',
                    },
                    flapping: false,
                    flapping_history: [true],
                    instance: {
                      id: '1',
                    },
                    rule: {
                      category: 'My test rule',
                      consumer: 'bar',
                      execution: {
                        uuid: '5f6aa57d-3e22-484e-bae8-cbed868f4d28',
                      },
                      name: 'rule-name',
                      parameters: {
                        bar: true,
                      },
                      producer: 'alerts',
                      revision: 0,
                      rule_type_id: 'test.rule-type',
                      tags: ['rule-', '-tags'],
                      uuid: '1',
                    },
                    start: '2023-03-28T11:27:28.159Z',
                    status: 'active',
                    time_range: {
                      gte: '2023-03-28T11:27:28.159Z',
                    },
                    uuid: 'abc',
                    workflow_status: 'open',
                  },
                  space_ids: ['default'],
                  version: '8.8.0',
                },
                tags: ['rule-', '-tags'],
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
        maxAlerts,
        ruleLabel: `test: rule-name`,
        flappingSettings: DEFAULT_FLAPPING_SETTINGS,
        activeAlertsFromState: {
          '1': {
            state: { foo: true, start: '2023-03-28T11:27:28.159Z', duration: '0' },
            meta: {
              flapping: false,
              flappingHistory: [true],
              maintenanceWindowIds: [],
              lastScheduledActions: { group: 'default', date: new Date() },
              uuid: 'abc',
            },
          },
        },
        recoveredAlertsFromState: {},
      });

      // Don't report any alerts so existing alert recovers

      // Update context and payload on the new alert
      alertsClient.setAlertData({
        id: '1',
        context: { foo: 'notbar' },
        payload: { count: 100, url: `https://elastic.co` },
      });

      alertsClient.processAndLogAlerts(processAndLogAlertsOpts);

      await alertsClient.persistAlerts();

      expect(clusterClient.bulk).toHaveBeenCalledWith({
        index: '.alerts-test.alerts-default',
        refresh: 'wait_for',
        require_alias: true,
        body: [
          {
            index: {
              _id: 'abc',
              _index: '.internal.alerts-test.alerts-default-000001',
              require_alias: false,
            },
          },
          {
            '@timestamp': date,
            count: 100,
            event: {
              action: 'close',
              kind: 'signal',
            },
            kibana: {
              alert: {
                action_group: 'recovered',
                duration: {
                  us: '39600000000000',
                },
                end: date,
                flapping: false,
                flapping_history: [true, true],
                instance: {
                  id: '1',
                },
                maintenance_window_ids: [],
                rule: {
                  category: 'My test rule',
                  consumer: 'bar',
                  execution: {
                    uuid: '5f6aa57d-3e22-484e-bae8-cbed868f4d28',
                  },
                  name: 'rule-name',
                  parameters: {
                    bar: true,
                  },
                  producer: 'alerts',
                  revision: 0,
                  rule_type_id: 'test.rule-type',
                  tags: ['rule-', '-tags'],
                  uuid: '1',
                },
                start: '2023-03-28T11:27:28.159Z',
                status: 'recovered',
                time_range: {
                  gte: '2023-03-28T11:27:28.159Z',
                  lte: date,
                },
                uuid: 'abc',
                workflow_status: 'open',
              },
              space_ids: ['default'],
              version: '8.9.0',
            },
            tags: ['rule-', '-tags'],
            url: 'https://elastic.co',
          },
        ],
      });
    });
  });

  describe('client()', () => {
    test('only returns subset of functionality', async () => {
      const alertsClient = new AlertsClient<{}, {}, {}, 'default', 'recovered'>(alertsClientParams);

      await alertsClient.initializeExecution({
        maxAlerts,
        ruleLabel: `test: rule-name`,
        flappingSettings: DEFAULT_FLAPPING_SETTINGS,
        activeAlertsFromState: {},
        recoveredAlertsFromState: {},
      });

      const publicAlertsClient = alertsClient.client();

      expect(keys(publicAlertsClient)).toEqual([
        'report',
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
          total: {
            relation: 'eq',
            value: 1,
          },
          hits: [
            {
              _id: 'abc',
              _index: '.internal.alerts-test.alerts-default-000001',
              _source: {
                '@timestamp': '2023-03-28T12:27:28.159Z',
                event: {
                  action: 'active',
                  kind: 'signal',
                },
                kibana: {
                  alert: {
                    action_group: 'default',
                    duration: {
                      us: '0',
                    },
                    flapping: false,
                    flapping_history: [true],
                    instance: {
                      id: '1',
                    },
                    rule: {
                      category: 'My test rule',
                      consumer: 'bar',
                      execution: {
                        uuid: '5f6aa57d-3e22-484e-bae8-cbed868f4d28',
                      },
                      name: 'rule-name',
                      parameters: {
                        bar: true,
                      },
                      producer: 'alerts',
                      revision: 0,
                      rule_type_id: 'test.rule-type',
                      tags: ['rule-', '-tags'],
                      uuid: '1',
                    },
                    start: '2023-03-28T12:27:28.159Z',
                    status: 'active',
                    time_range: {
                      gte: '2023-03-28T12:27:28.159Z',
                    },
                    uuid: 'abc',
                    workflow_status: 'open',
                  },
                  space_ids: ['default'],
                  version: '8.8.0',
                },
                tags: ['rule-', '-tags'],
              },
            },
          ],
        },
      });
      const alertsClient = new AlertsClient<{}, {}, {}, 'default', 'recovered'>(alertsClientParams);
      await alertsClient.initializeExecution({
        maxAlerts,
        ruleLabel: `test: rule-name`,
        flappingSettings: DEFAULT_FLAPPING_SETTINGS,
        activeAlertsFromState: {
          '1': {
            state: { foo: true, start: '2023-03-28T12:27:28.159Z', duration: '0' },
            meta: {
              flapping: false,
              flappingHistory: [true],
              maintenanceWindowIds: [],
              lastScheduledActions: { group: 'default', date: new Date() },
              uuid: 'abc',
            },
          },
        },
        recoveredAlertsFromState: {},
      });

      // report no alerts to allow existing alert to recover

      const publicAlertsClient = alertsClient.client();
      const recoveredAlerts = publicAlertsClient.getRecoveredAlerts();
      expect(recoveredAlerts.length).toEqual(1);
      const recoveredAlert = recoveredAlerts[0];
      expect(recoveredAlert.alert.getId()).toEqual('1');
      expect(recoveredAlert.alert.getUuid()).toEqual('abc');
      expect(recoveredAlert.alert.getStart()).toEqual('2023-03-28T12:27:28.159Z');
      expect(recoveredAlert.hit).toEqual({
        '@timestamp': '2023-03-28T12:27:28.159Z',
        event: {
          action: 'active',
          kind: 'signal',
        },
        kibana: {
          alert: {
            action_group: 'default',
            duration: {
              us: '0',
            },
            flapping: false,
            flapping_history: [true],
            instance: {
              id: '1',
            },
            rule: {
              category: 'My test rule',
              consumer: 'bar',
              execution: {
                uuid: '5f6aa57d-3e22-484e-bae8-cbed868f4d28',
              },
              name: 'rule-name',
              parameters: {
                bar: true,
              },
              producer: 'alerts',
              revision: 0,
              rule_type_id: 'test.rule-type',
              tags: ['rule-', '-tags'],
              uuid: '1',
            },
            start: '2023-03-28T12:27:28.159Z',
            status: 'active',
            time_range: {
              gte: '2023-03-28T12:27:28.159Z',
            },
            uuid: 'abc',
            workflow_status: 'open',
          },
          space_ids: ['default'],
          version: '8.8.0',
        },
        tags: ['rule-', '-tags'],
      });
    });

    test('should return undefined document with recovered alert, if it does not exists', async () => {
      clusterClient.search.mockResolvedValue({
        took: 10,
        timed_out: false,
        _shards: { failed: 0, successful: 1, total: 1, skipped: 0 },
        hits: {
          total: {
            relation: 'eq',
            value: 0,
          },
          hits: [],
        },
      });
      const alertsClient = new AlertsClient<{}, {}, {}, 'default', 'recovered'>(alertsClientParams);
      await alertsClient.initializeExecution({
        maxAlerts,
        ruleLabel: `test: rule-name`,
        flappingSettings: DEFAULT_FLAPPING_SETTINGS,
        activeAlertsFromState: {
          '1': {
            state: { foo: true, start: '2023-03-28T12:27:28.159Z', duration: '0' },
            meta: {
              flapping: false,
              flappingHistory: [true],
              maintenanceWindowIds: [],
              lastScheduledActions: { group: 'default', date: new Date() },
              uuid: 'abc',
            },
          },
        },
        recoveredAlertsFromState: {},
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
});
