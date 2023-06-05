/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { elasticsearchServiceMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { UntypedNormalizedRuleType } from '../rule_type_registry';
import { DEFAULT_FLAPPING_SETTINGS, RecoveredActionGroup, RuleNotifyWhen } from '../types';
import * as LegacyAlertsClientModule from './legacy_alerts_client';
import { Alert } from '../alert/alert';
import { AlertsClient } from './alerts_client';
import { AlertRuleData } from './types';
import { legacyAlertsClientMock } from './legacy_alerts_client.mock';
import { keys, range } from 'lodash';
import { alertingEventLoggerMock } from '../lib/alerting_event_logger/alerting_event_logger.mock';
import { ruleRunMetricsStoreMock } from '../lib/rule_run_metrics_store.mock';

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
const mockScheduleActions = jest
  .fn()
  .mockImplementation(() => ({ replaceState: mockReplaceState }));
const mockCreate = jest.fn().mockImplementation(() => ({ scheduleActions: mockScheduleActions }));
const alertRuleData: AlertRuleData = {
  consumer: 'bar',
  executionId: '5f6aa57d-3e22-484e-bae8-cbed868f4d28',
  id: '1',
  name: 'rule-name',
  parameters: {
    bar: true,
  },
  revision: 0,
  spaceId: 'default',
  tags: ['rule-', '-tags'],
};

describe('Alerts Client', () => {
  beforeAll(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(date));
  });

  beforeEach(() => {
    jest.clearAllMocks();
    logger = loggingSystemMock.createLogger();
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

      const alertsClient = new AlertsClient({
        logger,
        elasticsearchClientPromise: Promise.resolve(clusterClient),
        ruleType,
        namespace: 'default',
        rule: alertRuleData,
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

      // no alerts to query for
      expect(clusterClient.search).not.toHaveBeenCalled();

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

      const alertsClient = new AlertsClient({
        logger,
        elasticsearchClientPromise: Promise.resolve(clusterClient),
        ruleType,
        namespace: 'default',
        rule: alertRuleData,
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

      const alertsClient = new AlertsClient({
        logger,
        elasticsearchClientPromise: Promise.resolve(clusterClient),
        ruleType,
        namespace: 'default',
        rule: alertRuleData,
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

      const alertsClient = new AlertsClient({
        logger,
        elasticsearchClientPromise: Promise.resolve(clusterClient),
        ruleType,
        namespace: 'default',
        rule: alertRuleData,
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
      const alertsClient = new AlertsClient<{}, {}, {}, 'default', 'recovered'>({
        logger,
        elasticsearchClientPromise: Promise.resolve(clusterClient),
        ruleType,
        namespace: 'default',
        rule: alertRuleData,
      });

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

      alertsClient.processAndLogAlerts({
        eventLogger: alertingEventLogger,
        ruleRunMetricsStore,
        shouldLogAlerts: false,
        flappingSettings: DEFAULT_FLAPPING_SETTINGS,
        notifyWhen: RuleNotifyWhen.CHANGE,
        maintenanceWindowIds: [],
      });

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
                uuid: uuid1,
              },
              space_ids: ['default'],
            },
          },
          { index: { _id: uuid2 } },
          // new alert doc
          {
            '@timestamp': date,
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
                uuid: uuid2,
              },
              space_ids: ['default'],
            },
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
                    uuid: 'abc',
                  },
                  space_ids: ['default'],
                },
              },
            },
          ],
        },
      });
      const alertsClient = new AlertsClient<{}, {}, {}, 'default', 'recovered'>({
        logger,
        elasticsearchClientPromise: Promise.resolve(clusterClient),
        ruleType,
        namespace: 'default',
        rule: alertRuleData,
      });

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

      alertsClient.processAndLogAlerts({
        eventLogger: alertingEventLogger,
        ruleRunMetricsStore,
        shouldLogAlerts: false,
        flappingSettings: DEFAULT_FLAPPING_SETTINGS,
        notifyWhen: RuleNotifyWhen.CHANGE,
        maintenanceWindowIds: [],
      });

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
                uuid: 'abc',
              },
              space_ids: ['default'],
            },
          },
          { index: { _id: uuid2 } },
          // new alert doc
          {
            '@timestamp': date,
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
                uuid: uuid2,
              },
              space_ids: ['default'],
            },
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
                    uuid: 'abc',
                  },
                  space_ids: ['default'],
                },
              },
            },
            {
              _id: 'def',
              _index: '.internal.alerts-test.alerts-default-000002',
              _source: {
                '@timestamp': '2023-03-28T12:27:28.159Z',
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
                    uuid: 'def',
                  },
                  space_ids: ['default'],
                },
              },
            },
          ],
        },
      });
      const alertsClient = new AlertsClient<{}, {}, {}, 'default', 'recovered'>({
        logger,
        elasticsearchClientPromise: Promise.resolve(clusterClient),
        ruleType,
        namespace: 'default',
        rule: alertRuleData,
      });

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

      alertsClient.processAndLogAlerts({
        eventLogger: alertingEventLogger,
        ruleRunMetricsStore,
        shouldLogAlerts: false,
        flappingSettings: DEFAULT_FLAPPING_SETTINGS,
        notifyWhen: RuleNotifyWhen.CHANGE,
        maintenanceWindowIds: [],
      });

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
                uuid: 'def',
              },
              space_ids: ['default'],
            },
          },
          { index: { _id: uuid3 } },
          // new alert doc
          {
            '@timestamp': date,
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
                uuid: uuid3,
              },
              space_ids: ['default'],
            },
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
                uuid: 'abc',
              },
              space_ids: ['default'],
            },
          },
        ],
      });
    });

    test('should not try to index if no alerts', async () => {
      const alertsClient = new AlertsClient<{}, {}, {}, 'default', 'recovered'>({
        logger,
        elasticsearchClientPromise: Promise.resolve(clusterClient),
        ruleType,
        namespace: 'default',
        rule: alertRuleData,
      });

      await alertsClient.initializeExecution({
        maxAlerts,
        ruleLabel: `test: rule-name`,
        flappingSettings: DEFAULT_FLAPPING_SETTINGS,
        activeAlertsFromState: {},
        recoveredAlertsFromState: {},
      });

      // Report no alerts

      alertsClient.processAndLogAlerts({
        eventLogger: alertingEventLogger,
        ruleRunMetricsStore,
        shouldLogAlerts: false,
        flappingSettings: DEFAULT_FLAPPING_SETTINGS,
        notifyWhen: RuleNotifyWhen.CHANGE,
        maintenanceWindowIds: [],
      });

      await alertsClient.persistAlerts();

      expect(clusterClient.bulk).not.toHaveBeenCalled();
    });

    test('should log and swallow error if bulk indexing throws error', async () => {
      clusterClient.bulk.mockImplementation(() => {
        throw new Error('fail');
      });
      const alertsClient = new AlertsClient<{}, {}, {}, 'default', 'recovered'>({
        logger,
        elasticsearchClientPromise: Promise.resolve(clusterClient),
        ruleType,
        namespace: 'default',
        rule: alertRuleData,
      });

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

      alertsClient.processAndLogAlerts({
        eventLogger: alertingEventLogger,
        ruleRunMetricsStore,
        shouldLogAlerts: false,
        flappingSettings: DEFAULT_FLAPPING_SETTINGS,
        notifyWhen: RuleNotifyWhen.CHANGE,
        maintenanceWindowIds: [],
      });

      await alertsClient.persistAlerts();

      expect(clusterClient.bulk).toHaveBeenCalled();
      expect(logger.error).toHaveBeenCalledWith(
        `Error writing 2 alerts to .alerts-test.alerts-default - fail`
      );
    });
  });

  describe('create()', () => {
    test('should create legacy alert with id, action group', async () => {
      mockLegacyAlertsClient.factory.mockImplementation(() => ({ create: mockCreate }));
      const spy = jest
        .spyOn(LegacyAlertsClientModule, 'LegacyAlertsClient')
        .mockImplementation(() => mockLegacyAlertsClient);
      const alertsClient = new AlertsClient<{}, {}, {}, 'default', 'recovered'>({
        logger,
        elasticsearchClientPromise: Promise.resolve(clusterClient),
        ruleType,
        namespace: 'default',
        rule: alertRuleData,
      });

      await alertsClient.initializeExecution({
        maxAlerts,
        ruleLabel: `test: rule-name`,
        flappingSettings: DEFAULT_FLAPPING_SETTINGS,
        activeAlertsFromState: {},
        recoveredAlertsFromState: {},
      });

      // Report 2 new alerts
      alertsClient.create({ id: '1', actionGroup: 'default', state: {}, context: {} });
      alertsClient.create({ id: '2', actionGroup: 'default', state: {}, context: {} });

      expect(mockCreate).toHaveBeenCalledTimes(2);
      expect(mockCreate).toHaveBeenNthCalledWith(1, '1');
      expect(mockCreate).toHaveBeenNthCalledWith(2, '2');
      expect(mockScheduleActions).toHaveBeenCalledTimes(2);
      expect(mockScheduleActions).toHaveBeenNthCalledWith(1, 'default', {});
      expect(mockScheduleActions).toHaveBeenNthCalledWith(2, 'default', {});

      expect(mockReplaceState).not.toHaveBeenCalled();
      spy.mockRestore();
    });

    test('should set context if defined', async () => {
      mockLegacyAlertsClient.factory.mockImplementation(() => ({ create: mockCreate }));
      const spy = jest
        .spyOn(LegacyAlertsClientModule, 'LegacyAlertsClient')
        .mockImplementation(() => mockLegacyAlertsClient);
      const alertsClient = new AlertsClient<{}, {}, { foo?: string }, 'default', 'recovered'>({
        logger,
        elasticsearchClientPromise: Promise.resolve(clusterClient),
        ruleType,
        namespace: 'default',
        rule: alertRuleData,
      });

      await alertsClient.initializeExecution({
        maxAlerts,
        ruleLabel: `test: rule-name`,
        flappingSettings: DEFAULT_FLAPPING_SETTINGS,
        activeAlertsFromState: {},
        recoveredAlertsFromState: {},
      });

      // Report 2 new alerts
      alertsClient.create({
        id: '1',
        actionGroup: 'default',
        state: {},
        context: { foo: 'cheese' },
      });
      alertsClient.create({ id: '2', actionGroup: 'default', state: {}, context: {} });

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
      const alertsClient = new AlertsClient<{}, { count: number }, {}, 'default', 'recovered'>({
        logger,
        elasticsearchClientPromise: Promise.resolve(clusterClient),
        ruleType,
        namespace: 'default',
        rule: alertRuleData,
      });

      await alertsClient.initializeExecution({
        maxAlerts,
        ruleLabel: `test: rule-name`,
        flappingSettings: DEFAULT_FLAPPING_SETTINGS,
        activeAlertsFromState: {},
        recoveredAlertsFromState: {},
      });

      // Report 2 new alerts
      alertsClient.create({ id: '1', actionGroup: 'default', state: { count: 1 }, context: {} });
      alertsClient.create({ id: '2', actionGroup: 'default', state: { count: 2 }, context: {} });

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
      >({
        logger,
        elasticsearchClientPromise: Promise.resolve(clusterClient),
        ruleType,
        namespace: 'default',
        rule: alertRuleData,
      });

      await alertsClient.initializeExecution({
        maxAlerts,
        ruleLabel: `test: rule-name`,
        flappingSettings: DEFAULT_FLAPPING_SETTINGS,
        activeAlertsFromState: {},
        recoveredAlertsFromState: {},
      });

      // Report 2 new alerts
      alertsClient.create({
        id: '1',
        actionGroup: 'default',
        state: {},
        context: {},
        payload: { count: 1, url: `https://url1` },
      });
      alertsClient.create({
        id: '2',
        actionGroup: 'default',
        state: {},
        context: {},
        payload: { count: 2, url: `https://url2` },
      });

      alertsClient.processAndLogAlerts({
        eventLogger: alertingEventLogger,
        ruleRunMetricsStore,
        shouldLogAlerts: false,
        flappingSettings: DEFAULT_FLAPPING_SETTINGS,
        notifyWhen: RuleNotifyWhen.CHANGE,
        maintenanceWindowIds: [],
      });

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
                uuid: uuid1,
              },
              space_ids: ['default'],
            },
            url: `https://url1`,
          },
          { index: { _id: uuid2 } },
          // new alert doc
          {
            '@timestamp': date,
            count: 2,
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
                uuid: uuid2,
              },
              space_ids: ['default'],
            },
            url: `https://url2`,
          },
        ],
      });
    });
  });

  describe('client()', () => {
    test('only returns subset of functionality', async () => {
      const alertsClient = new AlertsClient<{}, {}, {}, 'default', 'recovered'>({
        logger,
        elasticsearchClientPromise: Promise.resolve(clusterClient),
        ruleType,
        namespace: 'default',
        rule: alertRuleData,
      });

      await alertsClient.initializeExecution({
        maxAlerts,
        ruleLabel: `test: rule-name`,
        flappingSettings: DEFAULT_FLAPPING_SETTINGS,
        activeAlertsFromState: {},
        recoveredAlertsFromState: {},
      });

      const publicAlertsClient = alertsClient.client();

      expect(keys(publicAlertsClient)).toEqual([
        'create',
        'getAlertLimitValue',
        'setAlertLimitReached',
        'getRecoveredAlerts',
      ]);
    });
  });
});
