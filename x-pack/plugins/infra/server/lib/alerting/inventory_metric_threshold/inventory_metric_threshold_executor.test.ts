/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  AlertInstanceContext as AlertContext,
  AlertInstanceState as AlertState,
} from '@kbn/alerting-plugin/server';
import {
  AlertInstanceMock,
  RuleExecutorServicesMock,
  alertsMock,
} from '@kbn/alerting-plugin/server/mocks';
import { LifecycleAlertServices } from '@kbn/rule-registry-plugin/server';
import { ruleRegistryMocks } from '@kbn/rule-registry-plugin/server/mocks';
import { createLifecycleRuleExecutorMock } from '@kbn/rule-registry-plugin/server/utils/create_lifecycle_rule_executor_mock';
import {
  Aggregators,
  Comparator,
  InventoryMetricConditions,
} from '../../../../common/alerting/metrics';

import type { LogMeta, Logger } from '@kbn/logging';
import { DEFAULT_FLAPPING_SETTINGS } from '@kbn/alerting-plugin/common';
import { createInventoryMetricThresholdExecutor } from './inventory_metric_threshold_executor';
import { ConditionResult } from './evaluate_condition';
import { InfraBackendLibs } from '../../infra_types';
import { infraPluginMock } from '../../../mocks';
import { logsSharedPluginMock } from '@kbn/logs-shared-plugin/server/mocks';

jest.mock('./evaluate_condition', () => ({ evaluateCondition: jest.fn() }));

interface AlertTestInstance {
  instance: AlertInstanceMock;
  actionQueue: any[];
  state: any;
}

const persistAlertInstances = false;

const fakeLogger = <Meta extends LogMeta = LogMeta>(msg: string, meta?: Meta) => {};

const logger = {
  trace: fakeLogger,
  debug: fakeLogger,
  info: fakeLogger,
  warn: fakeLogger,
  error: fakeLogger,
  fatal: fakeLogger,
  log: () => void 0,
  get: () => logger,
} as unknown as Logger;

const mockOptions = {
  executionId: '',
  startedAt: new Date(),
  previousStartedAt: null,
  spaceId: '',
  rule: {
    id: '',
    name: '',
    tags: [],
    consumer: '',
    enabled: true,
    schedule: {
      interval: '1h',
    },
    actions: [],
    createdBy: null,
    updatedBy: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    throttle: null,
    notifyWhen: null,
    producer: '',
    revision: 0,
    ruleTypeId: '',
    ruleTypeName: '',
    muteAll: false,
  },
  logger,
  flappingSettings: DEFAULT_FLAPPING_SETTINGS,
};

const setEvaluationResults = (response: Record<string, ConditionResult>) => {
  jest.requireMock('./evaluate_condition').evaluateCondition.mockImplementation(() => response);
};
const createMockStaticConfiguration = (sources: any) => ({
  alerting: {
    inventory_threshold: {
      group_by_page_size: 100,
    },
    metric_threshold: {
      group_by_page_size: 100,
    },
  },
  inventory: {
    compositeSize: 2000,
  },
  logs: {
    app_target: 'logs-ui',
  },
  sources,
});

const mockLibs = {
  sources: {
    getSourceConfiguration: (savedObjectsClient: any, sourceId: string) => {
      return Promise.resolve({
        id: sourceId,
        configuration: {
          logIndices: {
            type: 'index_pattern',
            indexPatternId: 'some-id',
          },
        },
      });
    },
  },
  getStartServices: () => [
    null,
    { logsShared: logsSharedPluginMock.createStartContract() },
    infraPluginMock.createStartContract(),
  ],
  configuration: createMockStaticConfiguration({}),
  metricsRules: {
    createLifecycleRuleExecutor: createLifecycleRuleExecutorMock,
  },
  basePath: {
    publicBaseUrl: 'http://localhost:5601',
    prepend: (path: string) => path,
  },
  logger,
} as unknown as InfraBackendLibs;

const alertsServices = alertsMock.createRuleExecutorServices();
const services: RuleExecutorServicesMock &
  LifecycleAlertServices<AlertState, AlertContext, string> = {
  ...alertsServices,
  ...ruleRegistryMocks.createLifecycleAlertServices(alertsServices),
};

const alertInstances = new Map<string, AlertTestInstance>();

services.alertFactory.create.mockImplementation((instanceID: string) => {
  const newAlertInstance: AlertTestInstance = {
    instance: alertsMock.createAlertFactory.create(),
    actionQueue: [],
    state: {},
  };

  const alertInstance: AlertTestInstance = persistAlertInstances
    ? alertInstances.get(instanceID) || newAlertInstance
    : newAlertInstance;
  alertInstances.set(instanceID, alertInstance);

  (alertInstance.instance.scheduleActions as jest.Mock).mockImplementation(
    (id: string, action: any) => {
      alertInstance.actionQueue.push({ id, action });
      return alertInstance.instance;
    }
  );

  return alertInstance.instance;
});

function mostRecentAction(id: string) {
  const instance = alertInstances.get(id);
  if (!instance) return undefined;
  return instance.actionQueue.pop();
}

function clearInstances() {
  alertInstances.clear();
}

const executor = createInventoryMetricThresholdExecutor(mockLibs);

const baseCriterion = {
  aggType: Aggregators.AVERAGE,
  metric: 'count',
  timeSize: 1,
  timeUnit: 'm',
  threshold: [0],
  comparator: Comparator.GT,
} as InventoryMetricConditions;

describe('The inventory threshold alert type', () => {
  describe('querying with Hosts and rule tags', () => {
    afterAll(() => clearInstances());
    const execute = (comparator: Comparator, threshold: number[], state?: any) =>
      executor({
        ...mockOptions,
        services,
        params: {
          nodeType: 'host',
          criteria: [
            {
              ...baseCriterion,
              comparator,
              threshold,
            },
          ],
        },
        state: state ?? {},
        rule: {
          ...mockOptions.rule,
          tags: ['ruleTag1', 'ruleTag2'],
        },
      });

    const instanceIdA = 'host-01';
    const instanceIdB = 'host-02';

    test('when tags are present in the source, rule tags and source tags are combined in alert context', async () => {
      setEvaluationResults({
        'host-01': {
          ...baseCriterion,
          metric: 'count',
          timeSize: 1,
          timeUnit: 'm',
          threshold: [0.75],
          comparator: Comparator.GT,
          shouldFire: true,
          shouldWarn: false,
          currentValue: 1.0,
          isNoData: false,
          isError: false,
          context: {
            tags: ['host-01_tag1', 'host-01_tag2'],
          },
        },
        'host-02': {
          ...baseCriterion,
          metric: 'count',
          timeSize: 1,
          timeUnit: 'm',
          threshold: [0.75],
          comparator: Comparator.GT,
          shouldFire: true,
          shouldWarn: false,
          currentValue: 1.0,
          isNoData: false,
          isError: false,
          context: {
            tags: ['host-02_tag1', 'host-02_tag2'],
          },
        },
      });
      await execute(Comparator.GT, [0.75]);
      expect(mostRecentAction(instanceIdA).action.tags).toStrictEqual([
        'host-01_tag1',
        'host-01_tag2',
        'ruleTag1',
        'ruleTag2',
      ]);
      expect(mostRecentAction(instanceIdB).action.tags).toStrictEqual([
        'host-02_tag1',
        'host-02_tag2',
        'ruleTag1',
        'ruleTag2',
      ]);
    });

    test('when tags are NOT present in the source, rule tags are added in alert context', async () => {
      setEvaluationResults({
        'host-01': {
          ...baseCriterion,
          metric: 'count',
          timeSize: 1,
          timeUnit: 'm',
          threshold: [0.75],
          comparator: Comparator.GT,
          shouldFire: true,
          shouldWarn: false,
          currentValue: 1.0,
          isNoData: false,
          isError: false,
          context: {
            cloud: undefined,
          },
        },
        'host-02': {
          ...baseCriterion,
          metric: 'count',
          timeSize: 1,
          timeUnit: 'm',
          threshold: [0.75],
          comparator: Comparator.GT,
          shouldFire: true,
          shouldWarn: false,
          currentValue: 1.0,
          isNoData: false,
          isError: false,
          context: {
            tags: undefined,
          },
        },
      });
      await execute(Comparator.GT, [0.75]);
      expect(mostRecentAction(instanceIdA).action.tags).toStrictEqual(['ruleTag1', 'ruleTag2']);
      expect(mostRecentAction(instanceIdB).action.tags).toStrictEqual(['ruleTag1', 'ruleTag2']);
    });
  });
});
