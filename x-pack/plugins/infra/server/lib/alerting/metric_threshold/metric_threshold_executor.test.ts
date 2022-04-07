/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  AlertInstanceContext as AlertContext,
  AlertInstanceState as AlertState,
} from '../../../../../alerting/server';
// import { RecoveredActionGroup } from '../../../../../alerting/common';
import {
  AlertInstanceMock,
  RuleExecutorServicesMock,
  alertsMock,
} from '../../../../../alerting/server/mocks';
import { LifecycleAlertServices } from '../../../../../rule_registry/server';
import { ruleRegistryMocks } from '../../../../../rule_registry/server/mocks';
import { createLifecycleRuleExecutorMock } from '../../../../../rule_registry/server/utils/create_lifecycle_rule_executor_mock';
import {
  Aggregators,
  Comparator,
  CountMetricExpressionParams,
  NonCountMetricExpressionParams,
} from '../../../../common/alerting/metrics';
import { InfraSources } from '../../sources';
import {
  createMetricThresholdExecutor,
  FIRED_ACTIONS,
  NO_DATA_ACTIONS,
} from './metric_threshold_executor';
import { Evaluation } from './lib/evaluate_rule';

jest.mock('./lib/evaluate_rule', () => ({ evaluateRule: jest.fn() }));

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

const setEvaluationResults = (response: Array<Record<string, Evaluation>>) => {
  jest.requireMock('./lib/evaluate_rule').evaluateRule.mockImplementation(() => response);
};

describe('The metric threshold alert type', () => {
  describe('querying the entire infrastructure', () => {
    afterAll(() => clearInstances());
    const instanceID = '*';
    const execute = (comparator: Comparator, threshold: number[], sourceId: string = 'default') =>
      executor({
        ...mockOptions,
        services,
        params: {
          sourceId,
          criteria: [
            {
              ...baseNonCountCriterion,
              comparator,
              threshold,
            },
          ],
        },
      });
    const setResults = (
      comparator: Comparator,
      threshold: number[],
      shouldFire: boolean = false,
      shouldWarn: boolean = false,
      isNoData: boolean = false
    ) =>
      setEvaluationResults([
        {
          '*': {
            ...baseNonCountCriterion,
            comparator,
            threshold,
            metric: 'test.metric.1',
            currentValue: 1.0,
            timestamp: new Date().toISOString(),
            shouldFire,
            shouldWarn,
            isNoData,
          },
        },
      ]);
    test('alerts as expected with the > comparator', async () => {
      setResults(Comparator.GT, [0.75], true);
      await execute(Comparator.GT, [0.75]);
      expect(mostRecentAction(instanceID)).toBeAlertAction();
      setResults(Comparator.GT, [1.5], false);
      await execute(Comparator.GT, [1.5]);
      expect(mostRecentAction(instanceID)).toBe(undefined);
    });
    test('alerts as expected with the < comparator', async () => {
      setResults(Comparator.LT, [1.5], true);
      await execute(Comparator.LT, [1.5]);
      expect(mostRecentAction(instanceID)).toBeAlertAction();
      setResults(Comparator.LT, [0.75], false);
      await execute(Comparator.LT, [0.75]);
      expect(mostRecentAction(instanceID)).toBe(undefined);
    });
    test('alerts as expected with the >= comparator', async () => {
      setResults(Comparator.GT_OR_EQ, [0.75], true);
      await execute(Comparator.GT_OR_EQ, [0.75]);
      expect(mostRecentAction(instanceID)).toBeAlertAction();
      setResults(Comparator.GT_OR_EQ, [1.0], true);
      await execute(Comparator.GT_OR_EQ, [1.0]);
      expect(mostRecentAction(instanceID)).toBeAlertAction();
      setResults(Comparator.GT_OR_EQ, [1.5], false);
      await execute(Comparator.GT_OR_EQ, [1.5]);
      expect(mostRecentAction(instanceID)).toBe(undefined);
    });
    test('alerts as expected with the <= comparator', async () => {
      setResults(Comparator.LT_OR_EQ, [1.5], true);
      await execute(Comparator.LT_OR_EQ, [1.5]);
      expect(mostRecentAction(instanceID)).toBeAlertAction();
      setResults(Comparator.LT_OR_EQ, [1.0], true);
      await execute(Comparator.LT_OR_EQ, [1.0]);
      expect(mostRecentAction(instanceID)).toBeAlertAction();
      setResults(Comparator.LT_OR_EQ, [0.75], false);
      await execute(Comparator.LT_OR_EQ, [0.75]);
      expect(mostRecentAction(instanceID)).toBe(undefined);
    });
    test('alerts as expected with the between comparator', async () => {
      setResults(Comparator.BETWEEN, [0, 1.5], true);
      await execute(Comparator.BETWEEN, [0, 1.5]);
      expect(mostRecentAction(instanceID)).toBeAlertAction();
      setResults(Comparator.BETWEEN, [0, 0.75], false);
      await execute(Comparator.BETWEEN, [0, 0.75]);
      expect(mostRecentAction(instanceID)).toBe(undefined);
    });
    test('alerts as expected with the outside range comparator', async () => {
      setResults(Comparator.OUTSIDE_RANGE, [0, 0.75], true);
      await execute(Comparator.OUTSIDE_RANGE, [0, 0.75]);
      expect(mostRecentAction(instanceID)).toBeAlertAction();
      setResults(Comparator.OUTSIDE_RANGE, [0, 1.5], false);
      await execute(Comparator.OUTSIDE_RANGE, [0, 1.5]);
      expect(mostRecentAction(instanceID)).toBe(undefined);
    });
    test('reports expected values to the action context', async () => {
      setResults(Comparator.GT, [0.75], true);
      await execute(Comparator.GT, [0.75]);
      const { action } = mostRecentAction(instanceID);
      expect(action.group).toBe('*');
      expect(action.reason).toContain('is 1');
      expect(action.reason).toContain('Alert when > 0.75');
      expect(action.reason).toContain('test.metric.1');
      expect(action.reason).toContain('in the last 1 min');
    });
  });

  describe('querying with a groupBy parameter', () => {
    afterAll(() => clearInstances());
    const execute = (
      comparator: Comparator,
      threshold: number[],
      groupBy: string[] = ['something'],
      metric?: string,
      state?: any
    ) =>
      executor({
        ...mockOptions,
        services,
        params: {
          groupBy,
          criteria: [
            {
              ...baseNonCountCriterion,
              comparator,
              threshold,
              metric: metric ?? baseNonCountCriterion.metric,
            },
          ],
        },
        state: state ?? mockOptions.state.wrapped,
      });
    const instanceIdA = 'a';
    const instanceIdB = 'b';
    test('sends an alert when all groups pass the threshold', async () => {
      setEvaluationResults([
        {
          a: {
            ...baseNonCountCriterion,
            comparator: Comparator.GT,
            threshold: [0.75],
            metric: 'test.metric.1',
            currentValue: 1.0,
            timestamp: new Date().toISOString(),
            shouldFire: true,
            shouldWarn: false,
            isNoData: false,
          },
          b: {
            ...baseNonCountCriterion,
            comparator: Comparator.GT,
            threshold: [0.75],
            metric: 'test.metric.1',
            currentValue: 1.0,
            timestamp: new Date().toISOString(),
            shouldFire: true,
            shouldWarn: false,
            isNoData: false,
          },
        },
      ]);
      await execute(Comparator.GT, [0.75]);
      expect(mostRecentAction(instanceIdA)).toBeAlertAction();
      expect(mostRecentAction(instanceIdB)).toBeAlertAction();
    });
    test('sends an alert when only some groups pass the threshold', async () => {
      setEvaluationResults([
        {
          a: {
            ...baseNonCountCriterion,
            comparator: Comparator.LT,
            threshold: [1.5],
            metric: 'test.metric.1',
            currentValue: 1.0,
            timestamp: new Date().toISOString(),
            shouldFire: true,
            shouldWarn: false,
            isNoData: false,
          },
          b: {
            ...baseNonCountCriterion,
            comparator: Comparator.LT,
            threshold: [1.5],
            metric: 'test.metric.1',
            currentValue: 3,
            timestamp: new Date().toISOString(),
            shouldFire: false,
            shouldWarn: false,
            isNoData: false,
          },
        },
      ]);
      await execute(Comparator.LT, [1.5]);
      expect(mostRecentAction(instanceIdA)).toBeAlertAction();
      expect(mostRecentAction(instanceIdB)).toBe(undefined);
    });
    test('sends no alert when no groups pass the threshold', async () => {
      setEvaluationResults([
        {
          a: {
            ...baseNonCountCriterion,
            comparator: Comparator.GT,
            threshold: [5],
            metric: 'test.metric.1',
            currentValue: 1.0,
            timestamp: new Date().toISOString(),
            shouldFire: false,
            shouldWarn: false,
            isNoData: false,
          },
          b: {
            ...baseNonCountCriterion,
            comparator: Comparator.GT,
            threshold: [5],
            metric: 'test.metric.1',
            currentValue: 3,
            timestamp: new Date().toISOString(),
            shouldFire: false,
            shouldWarn: false,
            isNoData: false,
          },
        },
      ]);
      await execute(Comparator.GT, [5]);
      expect(mostRecentAction(instanceIdA)).toBe(undefined);
      expect(mostRecentAction(instanceIdB)).toBe(undefined);
    });
    test('reports group values to the action context', async () => {
      setEvaluationResults([
        {
          a: {
            ...baseNonCountCriterion,
            comparator: Comparator.GT,
            threshold: [0.75],
            metric: 'test.metric.1',
            currentValue: 1.0,
            timestamp: new Date().toISOString(),
            shouldFire: true,
            shouldWarn: false,
            isNoData: false,
          },
          b: {
            ...baseNonCountCriterion,
            comparator: Comparator.GT,
            threshold: [0.75],
            metric: 'test.metric.1',
            currentValue: 3,
            timestamp: new Date().toISOString(),
            shouldFire: true,
            shouldWarn: false,
            isNoData: false,
          },
        },
      ]);
      await execute(Comparator.GT, [0.75]);
      expect(mostRecentAction(instanceIdA).action.group).toBe('a');
      expect(mostRecentAction(instanceIdB).action.group).toBe('b');
    });
    test('persists previous groups that go missing, until the groupBy param changes', async () => {
      setEvaluationResults([
        {
          a: {
            ...baseNonCountCriterion,
            comparator: Comparator.GT,
            threshold: [0.75],
            metric: 'test.metric.2',
            currentValue: 1.0,
            timestamp: new Date().toISOString(),
            shouldFire: true,
            shouldWarn: false,
            isNoData: false,
          },
          b: {
            ...baseNonCountCriterion,
            comparator: Comparator.GT,
            threshold: [0.75],
            metric: 'test.metric.2',
            currentValue: 3,
            timestamp: new Date().toISOString(),
            shouldFire: true,
            shouldWarn: false,
            isNoData: false,
          },
          c: {
            ...baseNonCountCriterion,
            comparator: Comparator.GT,
            threshold: [0.75],
            metric: 'test.metric.2',
            currentValue: 3,
            timestamp: new Date().toISOString(),
            shouldFire: true,
            shouldWarn: false,
            isNoData: false,
          },
        },
      ]);
      const stateResult1 = await execute(Comparator.GT, [0.75], ['something'], 'test.metric.2');
      expect(stateResult1.missingGroups).toEqual(expect.arrayContaining([]));
      setEvaluationResults([
        {
          a: {
            ...baseNonCountCriterion,
            comparator: Comparator.GT,
            threshold: [0.75],
            metric: 'test.metric.1',
            currentValue: 1.0,
            timestamp: new Date().toISOString(),
            shouldFire: true,
            shouldWarn: false,
            isNoData: false,
          },
          b: {
            ...baseNonCountCriterion,
            comparator: Comparator.GT,
            threshold: [0.75],
            metric: 'test.metric.1',
            currentValue: 3,
            timestamp: new Date().toISOString(),
            shouldFire: true,
            shouldWarn: false,
            isNoData: false,
          },
          c: {
            ...baseNonCountCriterion,
            comparator: Comparator.GT,
            threshold: [0.75],
            metric: 'test.metric.1',
            currentValue: null,
            timestamp: new Date().toISOString(),
            shouldFire: false,
            shouldWarn: false,
            isNoData: true,
          },
        },
      ]);
      const stateResult2 = await execute(
        Comparator.GT,
        [0.75],
        ['something'],
        'test.metric.1',
        stateResult1
      );
      expect(stateResult2.missingGroups).toEqual(expect.arrayContaining(['c']));
      setEvaluationResults([
        {
          a: {
            ...baseNonCountCriterion,
            comparator: Comparator.GT,
            threshold: [0.75],
            metric: 'test.metric.1',
            currentValue: 1.0,
            timestamp: new Date().toISOString(),
            shouldFire: true,
            shouldWarn: false,
            isNoData: false,
          },
          b: {
            ...baseNonCountCriterion,
            comparator: Comparator.GT,
            threshold: [0.75],
            metric: 'test.metric.1',
            currentValue: 3,
            timestamp: new Date().toISOString(),
            shouldFire: true,
            shouldWarn: false,
            isNoData: false,
          },
        },
      ]);
      const stateResult3 = await execute(
        Comparator.GT,
        [0.75],
        ['something', 'something-else'],
        'test.metric.1',
        stateResult2
      );
      expect(stateResult3.missingGroups).toEqual(expect.arrayContaining([]));
    });

    const executeWithFilter = (
      comparator: Comparator,
      threshold: number[],
      filterQuery: string,
      metric?: string,
      state?: any
    ) =>
      executor({
        ...mockOptions,
        services,
        params: {
          groupBy: ['something'],
          criteria: [
            {
              ...baseNonCountCriterion,
              comparator,
              threshold,
              metric: metric ?? baseNonCountCriterion.metric,
            },
          ],
          filterQuery,
        },
        state: state ?? mockOptions.state.wrapped,
      });
    test('persists previous groups that go missing, until the filterQuery param changes', async () => {
      setEvaluationResults([
        {
          a: {
            ...baseNonCountCriterion,
            comparator: Comparator.GT,
            threshold: [0.75],
            metric: 'test.metric.2',
            currentValue: 1.0,
            timestamp: new Date().toISOString(),
            shouldFire: true,
            shouldWarn: false,
            isNoData: false,
          },
          b: {
            ...baseNonCountCriterion,
            comparator: Comparator.GT,
            threshold: [0.75],
            metric: 'test.metric.2',
            currentValue: 3,
            timestamp: new Date().toISOString(),
            shouldFire: true,
            shouldWarn: false,
            isNoData: false,
          },
          c: {
            ...baseNonCountCriterion,
            comparator: Comparator.GT,
            threshold: [0.75],
            metric: 'test.metric.2',
            currentValue: 3,
            timestamp: new Date().toISOString(),
            shouldFire: true,
            shouldWarn: false,
            isNoData: false,
          },
        },
      ]);
      const stateResult1 = await executeWithFilter(
        Comparator.GT,
        [0.75],
        JSON.stringify({ query: 'q' }),
        'test.metric.2'
      );
      expect(stateResult1.missingGroups).toEqual(expect.arrayContaining([]));
      setEvaluationResults([
        {
          a: {
            ...baseNonCountCriterion,
            comparator: Comparator.GT,
            threshold: [0.75],
            metric: 'test.metric.1',
            currentValue: 1.0,
            timestamp: new Date().toISOString(),
            shouldFire: true,
            shouldWarn: false,
            isNoData: false,
          },
          b: {
            ...baseNonCountCriterion,
            comparator: Comparator.GT,
            threshold: [0.75],
            metric: 'test.metric.1',
            currentValue: 3,
            timestamp: new Date().toISOString(),
            shouldFire: true,
            shouldWarn: false,
            isNoData: false,
          },
          c: {
            ...baseNonCountCriterion,
            comparator: Comparator.GT,
            threshold: [0.75],
            metric: 'test.metric.1',
            currentValue: null,
            timestamp: new Date().toISOString(),
            shouldFire: false,
            shouldWarn: false,
            isNoData: true,
          },
        },
      ]);
      const stateResult2 = await executeWithFilter(
        Comparator.GT,
        [0.75],
        JSON.stringify({ query: 'q' }),
        'test.metric.1',
        stateResult1
      );
      expect(stateResult2.missingGroups).toEqual(expect.arrayContaining(['c']));
      setEvaluationResults([
        {
          a: {
            ...baseNonCountCriterion,
            comparator: Comparator.GT,
            threshold: [0.75],
            metric: 'test.metric.1',
            currentValue: 1.0,
            timestamp: new Date().toISOString(),
            shouldFire: true,
            shouldWarn: false,
            isNoData: false,
          },
          b: {
            ...baseNonCountCriterion,
            comparator: Comparator.GT,
            threshold: [0.75],
            metric: 'test.metric.1',
            currentValue: 3,
            timestamp: new Date().toISOString(),
            shouldFire: true,
            shouldWarn: false,
            isNoData: false,
          },
        },
      ]);
      const stateResult3 = await executeWithFilter(
        Comparator.GT,
        [0.75],
        JSON.stringify({ query: 'different' }),
        'test.metric.1',
        stateResult2
      );
      expect(stateResult3.groups).toEqual(expect.arrayContaining([]));
    });
  });

  describe('querying with multiple criteria', () => {
    afterAll(() => clearInstances());
    const execute = (
      comparator: Comparator,
      thresholdA: number[],
      thresholdB: number[],
      groupBy: string = '',
      sourceId: string = 'default'
    ) =>
      executor({
        ...mockOptions,
        services,
        params: {
          sourceId,
          groupBy,
          criteria: [
            {
              ...baseNonCountCriterion,
              comparator,
              threshold: thresholdA,
            },
            {
              ...baseNonCountCriterion,
              comparator,
              threshold: thresholdB,
              metric: 'test.metric.2',
            },
          ],
        },
      });
    test('sends an alert when all criteria cross the threshold', async () => {
      setEvaluationResults([
        {
          '*': {
            ...baseNonCountCriterion,
            comparator: Comparator.GT_OR_EQ,
            threshold: [1.0],
            metric: 'test.metric.1',
            currentValue: 1.0,
            timestamp: new Date().toISOString(),
            shouldFire: true,
            shouldWarn: false,
            isNoData: false,
          },
        },
        {
          '*': {
            ...baseNonCountCriterion,
            comparator: Comparator.GT_OR_EQ,
            threshold: [3.0],
            metric: 'test.metric.2',
            currentValue: 3.0,
            timestamp: new Date().toISOString(),
            shouldFire: true,
            shouldWarn: false,
            isNoData: false,
          },
        },
      ]);
      const instanceID = '*';
      await execute(Comparator.GT_OR_EQ, [1.0], [3.0]);
      expect(mostRecentAction(instanceID)).toBeAlertAction();
    });
    test('sends no alert when some, but not all, criteria cross the threshold', async () => {
      setEvaluationResults([
        {
          '*': {
            ...baseNonCountCriterion,
            comparator: Comparator.LT_OR_EQ,
            threshold: [1.0],
            metric: 'test.metric.1',
            currentValue: 1.0,
            timestamp: new Date().toISOString(),
            shouldFire: true,
            shouldWarn: false,
            isNoData: false,
          },
        },
        {},
      ]);
      const instanceID = '*';
      await execute(Comparator.LT_OR_EQ, [1.0], [2.5]);
      expect(mostRecentAction(instanceID)).toBe(undefined);
    });
    test('alerts only on groups that meet all criteria when querying with a groupBy parameter', async () => {
      setEvaluationResults([
        {
          a: {
            ...baseNonCountCriterion,
            comparator: Comparator.GT_OR_EQ,
            threshold: [1.0],
            metric: 'test.metric.1',
            currentValue: 1.0,
            timestamp: new Date().toISOString(),
            shouldFire: true,
            shouldWarn: false,
            isNoData: false,
          },
          b: {
            ...baseNonCountCriterion,
            comparator: Comparator.GT_OR_EQ,
            threshold: [1.0],
            metric: 'test.metric.1',
            currentValue: 3.0,
            timestamp: new Date().toISOString(),
            shouldFire: true,
            shouldWarn: false,
            isNoData: false,
          },
        },
        {
          a: {
            ...baseNonCountCriterion,
            comparator: Comparator.GT_OR_EQ,
            threshold: [3.0],
            metric: 'test.metric.2',
            currentValue: 3.0,
            timestamp: new Date().toISOString(),
            shouldFire: true,
            shouldWarn: false,
            isNoData: false,
          },
          b: {
            ...baseNonCountCriterion,
            comparator: Comparator.GT_OR_EQ,
            threshold: [3.0],
            metric: 'test.metric.2',
            currentValue: 1.0,
            timestamp: new Date().toISOString(),
            shouldFire: false,
            shouldWarn: false,
            isNoData: false,
          },
        },
      ]);
      const instanceIdA = 'a';
      const instanceIdB = 'b';
      await execute(Comparator.GT_OR_EQ, [1.0], [3.0], 'something');
      expect(mostRecentAction(instanceIdA)).toBeAlertAction();
      expect(mostRecentAction(instanceIdB)).toBe(undefined);
    });
    test('sends all criteria to the action context', async () => {
      setEvaluationResults([
        {
          '*': {
            ...baseNonCountCriterion,
            comparator: Comparator.GT_OR_EQ,
            threshold: [1.0],
            metric: 'test.metric.1',
            currentValue: 1.0,
            timestamp: new Date().toISOString(),
            shouldFire: true,
            shouldWarn: false,
            isNoData: false,
          },
        },
        {
          '*': {
            ...baseNonCountCriterion,
            comparator: Comparator.GT_OR_EQ,
            threshold: [3.0],
            metric: 'test.metric.2',
            currentValue: 3.0,
            timestamp: new Date().toISOString(),
            shouldFire: true,
            shouldWarn: false,
            isNoData: false,
          },
        },
      ]);
      const instanceID = '*';
      await execute(Comparator.GT_OR_EQ, [1.0], [3.0]);
      const { action } = mostRecentAction(instanceID);
      const reasons = action.reason.split('\n');
      expect(reasons.length).toBe(2);
      expect(reasons[0]).toContain('test.metric.1');
      expect(reasons[1]).toContain('test.metric.2');
      expect(reasons[0]).toContain('is 1');
      expect(reasons[1]).toContain('is 3');
      expect(reasons[0]).toContain('Alert when >= 1');
      expect(reasons[1]).toContain('Alert when >= 3');
      expect(reasons[0]).toContain('in the last 1 min');
      expect(reasons[1]).toContain('in the last 1 min');
      expect(reasons[0]).toContain('for all hosts');
      expect(reasons[1]).toContain('for all hosts');
    });
  });
  describe('querying with the count aggregator', () => {
    afterAll(() => clearInstances());
    const instanceID = '*';
    const execute = (comparator: Comparator, threshold: number[], sourceId: string = 'default') =>
      executor({
        ...mockOptions,
        services,
        params: {
          sourceId,
          criteria: [
            {
              ...baseCountCriterion,
              comparator,
              threshold,
            } as CountMetricExpressionParams,
          ],
        },
      });
    test('alerts based on the doc_count value instead of the aggregatedValue', async () => {
      setEvaluationResults([
        {
          '*': {
            ...baseCountCriterion,
            comparator: Comparator.GT,
            threshold: [0.9],
            metric: 'count',
            currentValue: 1,
            timestamp: new Date().toISOString(),
            shouldFire: true,
            shouldWarn: false,
            isNoData: false,
          },
        },
      ]);
      await execute(Comparator.GT, [0.9]);
      expect(mostRecentAction(instanceID)).toBeAlertAction();
      setEvaluationResults([
        {
          '*': {
            ...baseCountCriterion,
            comparator: Comparator.LT,
            threshold: [0.5],
            metric: 'count',
            currentValue: 1,
            timestamp: new Date().toISOString(),
            shouldFire: false,
            shouldWarn: false,
            isNoData: false,
          },
        },
      ]);
      await execute(Comparator.LT, [0.5]);
      expect(mostRecentAction(instanceID)).toBe(undefined);
    });
    describe('with a groupBy parameter', () => {
      const executeGroupBy = (
        comparator: Comparator,
        threshold: number[],
        sourceId: string = 'default',
        state?: any
      ) =>
        executor({
          ...mockOptions,
          services,
          params: {
            sourceId,
            groupBy: 'something',
            criteria: [
              {
                ...baseCountCriterion,
                comparator,
                threshold,
              },
            ],
          },
          state: state ?? mockOptions.state.wrapped,
        });
      const instanceIdA = 'a';
      const instanceIdB = 'b';

      test('successfully detects and alerts on a document count of 0', async () => {
        setEvaluationResults([
          {
            a: {
              ...baseCountCriterion,
              comparator: Comparator.LT_OR_EQ,
              threshold: [0],
              metric: 'count',
              currentValue: 1,
              timestamp: new Date().toISOString(),
              shouldFire: false,
              shouldWarn: false,
              isNoData: false,
            },
            b: {
              ...baseCountCriterion,
              comparator: Comparator.LT_OR_EQ,
              threshold: [0],
              metric: 'count',
              currentValue: 1,
              timestamp: new Date().toISOString(),
              shouldFire: false,
              shouldWarn: false,
              isNoData: false,
            },
          },
        ]);
        const resultState = await executeGroupBy(Comparator.LT_OR_EQ, [0]);
        expect(mostRecentAction(instanceIdA)).toBe(undefined);
        expect(mostRecentAction(instanceIdB)).toBe(undefined);
        setEvaluationResults([
          {
            a: {
              ...baseCountCriterion,
              comparator: Comparator.LT_OR_EQ,
              threshold: [0],
              metric: 'count',
              currentValue: 0,
              timestamp: new Date().toISOString(),
              shouldFire: true,
              shouldWarn: false,
              isNoData: false,
            },
            b: {
              ...baseCountCriterion,
              comparator: Comparator.LT_OR_EQ,
              threshold: [0],
              metric: 'count',
              currentValue: 0,
              timestamp: new Date().toISOString(),
              shouldFire: true,
              shouldWarn: false,
              isNoData: false,
            },
          },
        ]);
        await executeGroupBy(Comparator.LT_OR_EQ, [0], 'empty-response', resultState);
        expect(mostRecentAction(instanceIdA)).toBeAlertAction();
        expect(mostRecentAction(instanceIdB)).toBeAlertAction();
      });
    });
  });
  describe('querying with the p99 aggregator', () => {
    afterAll(() => clearInstances());
    const instanceID = '*';
    const execute = (comparator: Comparator, threshold: number[], sourceId: string = 'default') =>
      executor({
        ...mockOptions,
        services,
        params: {
          criteria: [
            {
              ...baseNonCountCriterion,
              comparator,
              threshold,
              aggType: Aggregators.P99,
              metric: 'test.metric.2',
            },
          ],
        },
      });
    test('alerts based on the p99 values', async () => {
      setEvaluationResults([
        {
          '*': {
            ...baseNonCountCriterion,
            comparator: Comparator.GT,
            threshold: [1],
            metric: 'test.metric.2',
            currentValue: 3,
            timestamp: new Date().toISOString(),
            shouldFire: true,
            shouldWarn: false,
            isNoData: false,
          },
        },
      ]);
      await execute(Comparator.GT, [1]);
      expect(mostRecentAction(instanceID)).toBeAlertAction();
      setEvaluationResults([
        {
          '*': {
            ...baseNonCountCriterion,
            comparator: Comparator.LT,
            threshold: [1],
            metric: 'test.metric.2',
            currentValue: 3,
            timestamp: new Date().toISOString(),
            shouldFire: false,
            shouldWarn: false,
            isNoData: false,
          },
        },
      ]);
      await execute(Comparator.LT, [1]);
      expect(mostRecentAction(instanceID)).toBe(undefined);
    });
  });
  describe('querying with the p95 aggregator', () => {
    afterAll(() => clearInstances());
    const instanceID = '*';
    const execute = (comparator: Comparator, threshold: number[], sourceId: string = 'default') =>
      executor({
        ...mockOptions,
        services,
        params: {
          sourceId,
          criteria: [
            {
              ...baseNonCountCriterion,
              comparator,
              threshold,
              aggType: Aggregators.P95,
              metric: 'test.metric.1',
            },
          ],
        },
      });
    test('alerts based on the p95 values', async () => {
      setEvaluationResults([
        {
          '*': {
            ...baseNonCountCriterion,
            comparator: Comparator.GT,
            threshold: [0.25],
            metric: 'test.metric.1',
            currentValue: 1.0,
            timestamp: new Date().toISOString(),
            shouldFire: true,
            shouldWarn: false,
            isNoData: false,
          },
        },
      ]);
      await execute(Comparator.GT, [0.25]);
      expect(mostRecentAction(instanceID)).toBeAlertAction();
      setEvaluationResults([
        {
          '*': {
            ...baseNonCountCriterion,
            comparator: Comparator.LT,
            threshold: [0.95],
            metric: 'test.metric.1',
            currentValue: 1.0,
            timestamp: new Date().toISOString(),
            shouldFire: false,
            shouldWarn: false,
            isNoData: false,
          },
        },
      ]);
      await execute(Comparator.LT, [0.95]);
      expect(mostRecentAction(instanceID)).toBe(undefined);
    });
  });
  describe("querying a metric that hasn't reported data", () => {
    afterAll(() => clearInstances());
    const instanceID = '*';
    const execute = (alertOnNoData: boolean, sourceId: string = 'default') =>
      executor({
        ...mockOptions,
        services,
        params: {
          sourceId,
          criteria: [
            {
              ...baseNonCountCriterion,
              comparator: Comparator.GT,
              threshold: [1],
              metric: 'test.metric.3',
            },
          ],
          alertOnNoData,
        },
      });
    test('sends a No Data alert when configured to do so', async () => {
      setEvaluationResults([
        {
          '*': {
            ...baseNonCountCriterion,
            comparator: Comparator.LT,
            threshold: [1],
            metric: 'test.metric.3',
            currentValue: null,
            timestamp: new Date().toISOString(),
            shouldFire: false,
            shouldWarn: false,
            isNoData: true,
          },
        },
      ]);
      await execute(true);
      expect(mostRecentAction(instanceID)).toBeNoDataAction();
    });
    test('does not send a No Data alert when not configured to do so', async () => {
      setEvaluationResults([
        {
          '*': {
            ...baseNonCountCriterion,
            comparator: Comparator.LT,
            threshold: [1],
            metric: 'test.metric.3',
            currentValue: null,
            timestamp: new Date().toISOString(),
            shouldFire: false,
            shouldWarn: false,
            isNoData: true,
          },
        },
      ]);
      await execute(false);
      expect(mostRecentAction(instanceID)).toBe(undefined);
    });
  });

  describe('querying a groupBy alert that starts reporting no data, and then later reports data', () => {
    afterAll(() => clearInstances());
    const instanceID = '*';
    const instanceIdA = 'a';
    const instanceIdB = 'b';
    const instanceIdC = 'c';
    const execute = (metric: string, alertOnGroupDisappear: boolean = true, state?: any) =>
      executor({
        ...mockOptions,
        services,
        params: {
          groupBy: 'something',
          sourceId: 'default',
          criteria: [
            {
              ...baseNonCountCriterion,
              comparator: Comparator.GT,
              threshold: [0],
              metric,
            },
          ],
          alertOnNoData: true,
          alertOnGroupDisappear,
        },
        state: state ?? mockOptions.state.wrapped,
      });

    const executeEmptyResponse = (...args: [boolean?, any?]) => execute('test.metric.3', ...args);
    const execute3GroupsABCResponse = (...args: [boolean?, any?]) =>
      execute('test.metric.2', ...args);
    const execute2GroupsABResponse = (...args: [boolean?, any?]) =>
      execute('test.metric.1', ...args);

    // Store state between tests. Jest won't preserve reassigning a let so use an array instead.
    const interTestStateStorage: any[] = [];

    test('first sends a No Data alert with the * group, but then reports groups when data is available', async () => {
      setEvaluationResults([
        {
          '*': {
            ...baseNonCountCriterion,
            comparator: Comparator.GT,
            threshold: [0],
            metric: 'test.metric.3',
            currentValue: null,
            timestamp: new Date().toISOString(),
            shouldFire: false,
            shouldWarn: false,
            isNoData: true,
          },
        },
      ]);
      let resultState = await executeEmptyResponse();
      expect(mostRecentAction(instanceID)).toBeNoDataAction();
      setEvaluationResults([
        {
          '*': {
            ...baseNonCountCriterion,
            comparator: Comparator.GT,
            threshold: [0],
            metric: 'test.metric.3',
            currentValue: null,
            timestamp: new Date().toISOString(),
            shouldFire: false,
            shouldWarn: false,
            isNoData: true,
          },
        },
      ]);
      resultState = await executeEmptyResponse(true, resultState);
      expect(mostRecentAction(instanceID)).toBeNoDataAction();
      setEvaluationResults([
        {
          a: {
            ...baseNonCountCriterion,
            comparator: Comparator.GT,
            threshold: [0],
            metric: 'test.metric.1',
            currentValue: 1.0,
            timestamp: new Date().toISOString(),
            shouldFire: true,
            shouldWarn: false,
            isNoData: false,
          },
          b: {
            ...baseNonCountCriterion,
            comparator: Comparator.GT,
            threshold: [0],
            metric: 'test.metric.1',
            currentValue: 3,
            timestamp: new Date().toISOString(),
            shouldFire: true,
            shouldWarn: false,
            isNoData: false,
          },
        },
      ]);
      resultState = await execute2GroupsABResponse(true, resultState);
      expect(mostRecentAction(instanceID)).toBe(undefined);
      expect(mostRecentAction(instanceIdA)).toBeAlertAction();
      expect(mostRecentAction(instanceIdB)).toBeAlertAction();
      interTestStateStorage.push(resultState); // Hand off resultState to the next test
    });
    test('sends No Data alerts for the previously detected groups when they stop reporting data, but not the * group', async () => {
      // Pop a previous execution result instead of defining it manually
      // The type signature of alert executor states are complex
      const resultState = interTestStateStorage.pop();
      setEvaluationResults([
        {
          a: {
            ...baseNonCountCriterion,
            comparator: Comparator.GT,
            threshold: [0],
            metric: 'test.metric.3',
            currentValue: null,
            timestamp: new Date().toISOString(),
            shouldFire: false,
            shouldWarn: false,
            isNoData: true,
          },
          b: {
            ...baseNonCountCriterion,
            comparator: Comparator.GT,
            threshold: [0],
            metric: 'test.metric.3',
            currentValue: null,
            timestamp: new Date().toISOString(),
            shouldFire: false,
            shouldWarn: false,
            isNoData: true,
          },
        },
      ]);
      await executeEmptyResponse(true, resultState);
      expect(mostRecentAction(instanceID)).toBe(undefined);
      expect(mostRecentAction(instanceIdA)).toBeNoDataAction();
      expect(mostRecentAction(instanceIdB)).toBeNoDataAction();
    });
    test('does not send individual No Data alerts when groups disappear if alertOnGroupDisappear is disabled', async () => {
      setEvaluationResults([
        {
          a: {
            ...baseNonCountCriterion,
            comparator: Comparator.GT,
            threshold: [0],
            metric: 'test.metric.2',
            currentValue: 3,
            timestamp: new Date().toISOString(),
            shouldFire: true,
            shouldWarn: false,
            isNoData: false,
          },
          b: {
            ...baseNonCountCriterion,
            comparator: Comparator.GT,
            threshold: [0],
            metric: 'test.metric.2',
            currentValue: 1,
            timestamp: new Date().toISOString(),
            shouldFire: true,
            shouldWarn: false,
            isNoData: false,
          },
          c: {
            ...baseNonCountCriterion,
            comparator: Comparator.GT,
            threshold: [0],
            metric: 'test.metric.2',
            currentValue: 3,
            timestamp: new Date().toISOString(),
            shouldFire: true,
            shouldWarn: false,
            isNoData: false,
          },
        },
      ]);
      const resultState = await execute3GroupsABCResponse(false);
      expect(mostRecentAction(instanceID)).toBe(undefined);
      expect(mostRecentAction(instanceIdA)).toBeAlertAction();
      expect(mostRecentAction(instanceIdB)).toBeAlertAction();
      expect(mostRecentAction(instanceIdC)).toBeAlertAction();
      setEvaluationResults([
        {
          a: {
            ...baseNonCountCriterion,
            comparator: Comparator.GT,
            threshold: [0],
            metric: 'test.metric.1',
            currentValue: 1,
            timestamp: new Date().toISOString(),
            shouldFire: true,
            shouldWarn: false,
            isNoData: false,
          },
          b: {
            ...baseNonCountCriterion,
            comparator: Comparator.GT,
            threshold: [0],
            metric: 'test.metric.1',
            currentValue: 3,
            timestamp: new Date().toISOString(),
            shouldFire: true,
            shouldWarn: false,
            isNoData: false,
          },
        },
      ]);
      await execute2GroupsABResponse(false, resultState);
      expect(mostRecentAction(instanceID)).toBe(undefined);
      expect(mostRecentAction(instanceIdA)).toBeAlertAction();
      expect(mostRecentAction(instanceIdB)).toBeAlertAction();
      expect(mostRecentAction(instanceIdC)).toBe(undefined);
    });

    describe('if alertOnNoData is disabled but alertOnGroupDisappear is enabled', () => {
      const executeWeirdNoDataConfig = (metric: string, state?: any) =>
        executor({
          ...mockOptions,
          services,
          params: {
            groupBy: 'something',
            sourceId: 'default',
            criteria: [
              {
                ...baseNonCountCriterion,
                comparator: Comparator.GT,
                threshold: [0],
                metric,
              },
            ],
            alertOnNoData: false,
            alertOnGroupDisappear: true,
          },
          state: state ?? mockOptions.state.wrapped,
        });

      const executeWeirdEmptyResponse = (...args: [any?]) =>
        executeWeirdNoDataConfig('test.metric.3', ...args);
      const executeWeird2GroupsABResponse = (...args: [any?]) =>
        executeWeirdNoDataConfig('test.metric.1', ...args);

      test('does not send a No Data alert with the * group, but then reports groups when data is available', async () => {
        setEvaluationResults([
          {
            '*': {
              ...baseNonCountCriterion,
              comparator: Comparator.GT,
              threshold: [0],
              metric: 'test.metric.3',
              currentValue: null,
              timestamp: new Date().toISOString(),
              shouldFire: false,
              shouldWarn: false,
              isNoData: true,
            },
          },
        ]);
        let resultState = await executeWeirdEmptyResponse();
        expect(mostRecentAction(instanceID)).toBe(undefined);
        setEvaluationResults([
          {
            '*': {
              ...baseNonCountCriterion,
              comparator: Comparator.GT,
              threshold: [0],
              metric: 'test.metric.3',
              currentValue: null,
              timestamp: new Date().toISOString(),
              shouldFire: false,
              shouldWarn: false,
              isNoData: true,
            },
          },
        ]);
        resultState = await executeWeirdEmptyResponse(resultState);
        expect(mostRecentAction(instanceID)).toBe(undefined);
        setEvaluationResults([
          {
            a: {
              ...baseNonCountCriterion,
              comparator: Comparator.GT,
              threshold: [0],
              metric: 'test.metric.1',
              currentValue: 1,
              timestamp: new Date().toISOString(),
              shouldFire: true,
              shouldWarn: false,
              isNoData: false,
            },
            b: {
              ...baseNonCountCriterion,
              comparator: Comparator.GT,
              threshold: [0],
              metric: 'test.metric.1',
              currentValue: 3,
              timestamp: new Date().toISOString(),
              shouldFire: true,
              shouldWarn: false,
              isNoData: false,
            },
          },
        ]);
        resultState = await executeWeird2GroupsABResponse(resultState);
        expect(mostRecentAction(instanceID)).toBe(undefined);
        expect(mostRecentAction(instanceIdA)).toBeAlertAction();
        expect(mostRecentAction(instanceIdB)).toBeAlertAction();
        interTestStateStorage.push(resultState); // Hand off resultState to the next test
      });
      test('sends No Data alerts for the previously detected groups when they stop reporting data, but not the * group', async () => {
        const resultState = interTestStateStorage.pop(); // Import the resultState from the previous test
        setEvaluationResults([
          {
            a: {
              ...baseNonCountCriterion,
              comparator: Comparator.GT,
              threshold: [0],
              metric: 'test.metric.3',
              currentValue: null,
              timestamp: new Date().toISOString(),
              shouldFire: false,
              shouldWarn: false,
              isNoData: true,
            },
            b: {
              ...baseNonCountCriterion,
              comparator: Comparator.GT,
              threshold: [0],
              metric: 'test.metric.3',
              currentValue: null,
              timestamp: new Date().toISOString(),
              shouldFire: false,
              shouldWarn: false,
              isNoData: true,
            },
          },
        ]);
        await executeWeirdEmptyResponse(resultState);
        expect(mostRecentAction(instanceID)).toBe(undefined);
        expect(mostRecentAction(instanceIdA)).toBeNoDataAction();
        expect(mostRecentAction(instanceIdB)).toBeNoDataAction();
      });
    });
  });

  describe('attempting to use a malformed filterQuery', () => {
    afterAll(() => clearInstances());
    const instanceID = '*';
    const execute = () =>
      executor({
        ...mockOptions,
        services,
        params: {
          criteria: [
            {
              ...baseNonCountCriterion,
            },
          ],
          sourceId: 'default',
          filterQuery: '',
          filterQueryText:
            'host.name:(look.there.is.no.space.after.these.parentheses)and uh.oh: "wow that is bad"',
        },
      });
    test('reports an error', async () => {
      await execute();
      expect(mostRecentAction(instanceID)).toBeErrorAction();
    });
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
};

const executor = createMetricThresholdExecutor(mockLibs);

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
  toBeNoDataAction(action?: Action) {
    const pass = action?.id === NO_DATA_ACTIONS.id && action?.action.alertState === 'NO DATA';
    const message = () => `expected ${action} to be a NO DATA action`;
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

const baseNonCountCriterion: Pick<
  NonCountMetricExpressionParams,
  'aggType' | 'metric' | 'timeSize' | 'timeUnit'
> = {
  aggType: Aggregators.AVERAGE,
  metric: 'test.metric.1',
  timeSize: 1,
  timeUnit: 'm',
};

const baseCountCriterion: Pick<CountMetricExpressionParams, 'aggType' | 'timeSize' | 'timeUnit'> = {
  aggType: Aggregators.COUNT,
  timeSize: 1,
  timeUnit: 'm',
};
