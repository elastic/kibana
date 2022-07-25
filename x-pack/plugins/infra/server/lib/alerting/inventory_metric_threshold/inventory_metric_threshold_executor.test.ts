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
import { Comparator, InventoryMetricConditions } from '../../../../common/alerting/metrics';
import { InfraSources } from '../../sources';
import {
  createInventoryMetricThresholdExecutor,
  FIRED_ACTIONS,
} from './inventory_metric_threshold_executor';
import { ConditionResult } from './evaluate_condition';
import type { LogMeta, Logger } from '@kbn/logging';

jest.mock('./evaluate_condition', () => ({ evaluateCondition: jest.fn() }));

interface AlertTestInstance {
  instance: AlertInstanceMock;
  actionQueue: any[];
  state: any;
}

let persistAlertInstances = false; // eslint-disable-line prefer-const

type TestRuleState = Record<string, unknown> & {
  aRuleStateKey: string;
  groups: string[];
  groupBy?: string | string[];
};

const initialRuleState: TestRuleState = {
  aRuleStateKey: 'INITIAL_RULE_STATE_VALUE',
  groups: [],
};

const mockOptions = {
  alertId: '',
  executionId: '',
  startedAt: new Date(),
  previousStartedAt: null,
  state: {
    wrapped: initialRuleState,
    trackedAlerts: {
      TEST_ALERT_0: {
        alertId: 'TEST_ALERT_0',
        alertUuid: 'TEST_ALERT_0_UUID',
        started: '2020-01-01T12:00:00.000Z',
      },
      TEST_ALERT_1: {
        alertId: 'TEST_ALERT_1',
        alertUuid: 'TEST_ALERT_1_UUID',
        started: '2020-01-02T12:00:00.000Z',
      },
    },
  },
  spaceId: '',
  name: '',
  tags: [],
  createdBy: null,
  updatedBy: null,
  rule: {
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
    ruleTypeId: '',
    ruleTypeName: '',
  },
};

const setEvaluationResults = (response: Record<string, ConditionResult>) => {
  jest.requireMock('./evaluate_condition').evaluateCondition.mockImplementation(() => response);
};

describe('The inventory metric threshold alert type', () => {
  afterAll(() => clearInstances());
  const instanceID = '*';
  const execute = (
    comparator: Comparator,
    threshold: number[],
    warningComparator: Comparator,
    warningThreshold: number[],
    sourceId: string = 'default'
  ) =>
    executor({
      ...mockOptions,
      services,
      params: {
        sourceId,
        nodeType: 'host',
        criteria: [
          {
            ...baseCriterion,
            comparator,
            threshold,
            warningThreshold,
            warningComparator,
          },
        ],
      },
    });
  const setResults = (
    comparator: Comparator,
    threshold: number[],
    warningComparator: Comparator,
    warningThreshold: number[],
    currentValue: number,
    shouldFire: boolean = false,
    shouldWarn: boolean = false,
    isNoData: boolean = false
  ) =>
    setEvaluationResults({
      '*': {
        ...baseCriterion,
        comparator,
        threshold,
        warningComparator,
        warningThreshold,
        metric: 'cpu',
        currentValue,
        shouldFire,
        shouldWarn,
        isNoData,
        isError: false,
      },
    });

  test('reports expected warning threshold values to the action context', async () => {
    setResults(Comparator.GT, [0.9], Comparator.GT, [0.7], 0.8, false, true, false);
    await execute(Comparator.GT, [0.9], Comparator.GT, [0.7]);

    const { action } = mostRecentAction(instanceID);
    expect(action.reason).toContain(
      'CPU usage is 80% in the last 1 min for all hosts. Alert when > 0.7%.'
    );
    expect(action.threshold).toEqual({ condition0: [0.7] });
  });

  test('reports expected alert threshold values to the action context', async () => {
    setResults(Comparator.GT, [0.9], Comparator.GT, [0.7], 0.91, true, false, false);
    await execute(Comparator.GT, [0.9], Comparator.GT, [0.7]);

    const { action } = mostRecentAction(instanceID);
    expect(action.reason).toContain(
      'CPU usage is 91% in the last 1 min for all hosts. Alert when > 0.9%.'
    );
    expect(action.threshold).toEqual({ condition0: [0.9] });
  });
});

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

const mockLibs: any = {
  sources: new InfraSources({
    config: createMockStaticConfiguration({}),
  }),
  configuration: createMockStaticConfiguration({}),
  metricsRules: {
    createLifecycleRuleExecutor: createLifecycleRuleExecutorMock,
  },
  basePath: {
    publicBaseUrl: 'http://localhost:5601',
    prepend: (path: string) => path,
  },
  logger,
  getStartServices: () => [
    null,
    null,
    { logViews: { getClient: () => ({ getResolvedLogView: async () => ({ indices: 'foo' }) }) } },
  ],
};

const executor = createInventoryMetricThresholdExecutor(mockLibs);

const alertsServices = alertsMock.createRuleExecutorServices();
const services: RuleExecutorServicesMock &
  LifecycleAlertServices<AlertState, AlertContext, string> = {
  ...alertsServices,
  ...ruleRegistryMocks.createLifecycleAlertServices(alertsServices),
};
services.savedObjectsClient.get.mockImplementation(async (type: string, sourceId: string) => {
  if (sourceId === 'alternate')
    return {
      id: 'alternate',
      attributes: { metricAlias: 'alternatebeat-*' },
      type,
      references: [],
    };
  if (sourceId === 'empty-response')
    return {
      id: 'empty',
      attributes: { metricAlias: 'empty-response' },
      type,
      references: [],
    };
  return { id: 'default', attributes: { metricAlias: 'metricbeat-*' }, type, references: [] };
});

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

  alertInstance.instance.replaceState.mockImplementation((newState: any) => {
    alertInstance.state = newState;
    return alertInstance.instance;
  });
  alertInstance.instance.scheduleActions.mockImplementation((id: string, action: any) => {
    alertInstance.actionQueue.push({ id, action });
    return alertInstance.instance;
  });
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

interface Action {
  id: string;
  action: { alertState: string };
}

expect.extend({
  toBeAlertAction(action?: Action) {
    const pass = action?.id === FIRED_ACTIONS.id && action?.action.alertState === 'ALERT';
    const message = () => `expected ${action} to be an ALERT action`;
    return {
      message,
      pass,
    };
  },
  toBeErrorAction(action?: Action) {
    const pass = action?.id === FIRED_ACTIONS.id && action?.action.alertState === 'ERROR';
    const message = () => `expected ${action} to be an ERROR action`;
    return {
      message,
      pass,
    };
  },
});

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace jest {
    interface Matchers<R> {
      toBeAlertAction(action?: Action): R;

      toBeNoDataAction(action?: Action): R;

      toBeErrorAction(action?: Action): R;
    }
  }
}

const baseCriterion: Pick<InventoryMetricConditions, 'metric' | 'timeSize' | 'timeUnit'> = {
  metric: 'cpu',
  timeSize: 1,
  timeUnit: 'm',
};
