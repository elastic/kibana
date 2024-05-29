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
import { RuleExecutorServicesMock, alertsMock } from '@kbn/alerting-plugin/server/mocks';
import { LifecycleAlertServices } from '@kbn/rule-registry-plugin/server';
import { ruleRegistryMocks } from '@kbn/rule-registry-plugin/server/mocks';
import { createLifecycleRuleExecutorMock } from '@kbn/rule-registry-plugin/server/utils/create_lifecycle_rule_executor_mock';
import { COMPARATORS } from '@kbn/alerting-comparators';
import { Aggregators, InventoryMetricConditions } from '../../../../common/alerting/metrics';
import type { LogMeta, Logger } from '@kbn/logging';
import { DEFAULT_FLAPPING_SETTINGS } from '@kbn/alerting-plugin/common';
import { createInventoryMetricThresholdExecutor } from './inventory_metric_threshold_executor';
import { ConditionResult } from './evaluate_condition';
import { InfraBackendLibs } from '../../infra_types';
import { infraPluginMock } from '../../../mocks';
import { logsSharedPluginMock } from '@kbn/logs-shared-plugin/server/mocks';

jest.mock('./evaluate_condition', () => ({ evaluateCondition: jest.fn() }));

interface AlertTestInstance {
  actionGroup: string;
  payload: any[];
  context: any[];
}

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
  getTimeRange: () => {
    const date = new Date().toISOString();
    return { dateStart: date, dateEnd: date };
  },
};

const setEvaluationResults = (response: Record<string, ConditionResult>) => {
  return jest
    .requireMock('./evaluate_condition')
    .evaluateCondition.mockImplementation(() => response);
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
const alerts = new Map<string, AlertTestInstance>();
let services: RuleExecutorServicesMock & LifecycleAlertServices<AlertState, AlertContext, string>;

const setup = () => {
  const alertsServices = alertsMock.createRuleExecutorServices();
  services = {
    ...alertsServices,
    ...ruleRegistryMocks.createLifecycleAlertServices(alertsServices),
  };

  services.alertsClient.report.mockImplementation((params: any) => {
    alerts.set(params.id, { actionGroup: params.actionGroup, context: [], payload: [] });
    return {
      uuid: `uuid-${params.id}`,
      start: new Date().toISOString(),
      alertDoc: {},
    };
  });

  services.alertsClient.setAlertData.mockImplementation((params: any) => {
    const alert = alerts.get(params.id);
    if (alert) {
      alert.payload.push(params.payload);
      alert.context.push(params.context);
    }
  });
};

function mostRecentAction(id: string) {
  const instance = alerts.get(id);
  if (!instance) return undefined;
  return instance.context.pop();
}

function clearInstances() {
  alerts.clear();
}

const executor = createInventoryMetricThresholdExecutor(mockLibs);

const baseCriterion = {
  aggType: Aggregators.AVERAGE,
  metric: 'count',
  timeSize: 1,
  timeUnit: 'm',
  threshold: [0],
  comparator: COMPARATORS.GREATER_THAN,
} as InventoryMetricConditions;

describe('The inventory threshold alert type', () => {
  describe('querying with Hosts and rule tags', () => {
    afterAll(() => clearInstances());

    setup();

    const execute = (comparator: COMPARATORS, threshold: number[], options?: any) =>
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
        state: {},
        rule: {
          ...mockOptions.rule,
          tags: ['ruleTag1', 'ruleTag2'],
        },
        ...options,
      });

    const instanceIdA = 'host-01';
    const instanceIdB = 'host-02';

    test('throws error when alertsClient is null', async () => {
      try {
        services.alertsClient = null;
        await execute(COMPARATORS.GREATER_THAN, [0.75]);
      } catch (e) {
        expect(e).toMatchInlineSnapshot(
          '[Error: Expected alertsClient not to be null! There may have been an issue installing alert resources.]'
        );
        setup();
      }
    });

    test('when tags are present in the source, rule tags and source tags are combined in alert context', async () => {
      setEvaluationResults({
        'host-01': {
          ...baseCriterion,
          metric: 'count',
          timeSize: 1,
          timeUnit: 'm',
          threshold: [0.75],
          comparator: COMPARATORS.GREATER_THAN,
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
          comparator: COMPARATORS.GREATER_THAN,
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
      await execute(COMPARATORS.GREATER_THAN, [0.75]);
      expect(mostRecentAction(instanceIdA).tags).toStrictEqual([
        'host-01_tag1',
        'host-01_tag2',
        'ruleTag1',
        'ruleTag2',
      ]);
      expect(mostRecentAction(instanceIdB).tags).toStrictEqual([
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
          comparator: COMPARATORS.GREATER_THAN,
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
          comparator: COMPARATORS.GREATER_THAN,
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
      await execute(COMPARATORS.GREATER_THAN, [0.75]);
      expect(mostRecentAction(instanceIdA).tags).toStrictEqual(['ruleTag1', 'ruleTag2']);
      expect(mostRecentAction(instanceIdB).tags).toStrictEqual(['ruleTag1', 'ruleTag2']);
    });

    test('should call evaluation query with delay', async () => {
      const mockedStartDate = new Date('2023-11-06T10:04:26.465Z');
      const mockedEndDate = new Date('2023-11-06T10:05:26.465Z');
      const options = {
        getTimeRange: () => {
          return { dateStart: mockedStartDate, dateEnd: mockedEndDate };
        },
      };
      const evaluateConditionFn = setEvaluationResults({
        'host-01': {
          ...baseCriterion,
          metric: 'count',
          timeSize: 1,
          timeUnit: 'm',
          threshold: [0.75],
          comparator: COMPARATORS.GREATER_THAN,
          shouldFire: true,
          shouldWarn: false,
          currentValue: 1.0,
          isNoData: false,
          isError: false,
          context: {
            cloud: undefined,
          },
        },
      });
      await execute(COMPARATORS.GREATER_THAN, [0.75], options);
      expect(evaluateConditionFn).toHaveBeenCalledWith(
        expect.objectContaining({
          executionTimestamp: mockedEndDate,
        })
      );
    });
  });
});
