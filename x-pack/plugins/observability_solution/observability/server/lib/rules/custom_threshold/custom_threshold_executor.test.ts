/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AlertInstanceState as AlertState } from '@kbn/alerting-plugin/server';
import {
  AlertInstanceMock,
  RuleExecutorServicesMock,
  alertsMock,
} from '@kbn/alerting-plugin/server/mocks';
import { searchSourceCommonMock } from '@kbn/data-plugin/common/search/search_source/mocks';
import type { ISearchSource } from '@kbn/data-plugin/common';
import { LifecycleAlertServices } from '@kbn/rule-registry-plugin/server';
import { ruleRegistryMocks } from '@kbn/rule-registry-plugin/server/mocks';
import { createCustomThresholdExecutor } from './custom_threshold_executor';
import { FIRED_ACTION, NO_DATA_ACTION } from './constants';
import { CustomThresholdAlertContext } from './types';
import { Evaluation } from './lib/evaluate_rule';
import type { LogMeta, Logger } from '@kbn/logging';
import { DEFAULT_FLAPPING_SETTINGS } from '@kbn/alerting-plugin/common';
import {
  Aggregators,
  Comparator,
  CustomMetricExpressionParams,
  CustomThresholdExpressionMetric,
} from '../../../../common/custom_threshold_rule/types';
import { getViewInAppUrl } from '../../../../common/custom_threshold_rule/get_view_in_app_url';

jest.mock('./lib/evaluate_rule', () => ({ evaluateRule: jest.fn() }));
jest.mock('../../../../common/custom_threshold_rule/get_view_in_app_url', () => ({
  getViewInAppUrl: jest.fn().mockReturnValue('mockedViewInApp'),
}));

interface AlertTestInstance {
  instance: AlertInstanceMock;
  actionQueue: any[];
  state: any;
}

const persistAlertInstances = false;

type TestRuleState = Record<string, unknown> & {
  aRuleStateKey: string;
  groups: string[];
  groupBy?: string | string[];
};

const initialRuleState: TestRuleState = {
  aRuleStateKey: 'INITIAL_RULE_STATE_VALUE',
  groups: [],
};

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

const STARTED_AT_MOCK_DATE = new Date();

const mockQuery = 'mockQuery';
const mockOptions = {
  executionId: '',
  startedAt: STARTED_AT_MOCK_DATE,
  previousStartedAt: null,
  params: {
    searchConfiguration: {
      index: {},
      query: {
        query: mockQuery,
        language: 'kuery',
      },
    },
    alertOnNoData: true,
  },
  state: {
    wrapped: initialRuleState,
    trackedAlerts: {
      TEST_ALERT_0: {
        alertId: 'TEST_ALERT_0',
        alertUuid: 'TEST_ALERT_0_UUID',
        started: '2020-01-01T12:00:00.000Z',
        flappingHistory: [],
        flapping: false,
        pendingRecoveredCount: 0,
      },
      TEST_ALERT_1: {
        alertId: 'TEST_ALERT_1',
        alertUuid: 'TEST_ALERT_1_UUID',
        started: '2020-01-02T12:00:00.000Z',
        flappingHistory: [],
        flapping: false,
        pendingRecoveredCount: 0,
      },
    },
    trackedAlertsRecovered: {},
  },
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
    snoozeSchedule: [],
  },
  logger,
  flappingSettings: DEFAULT_FLAPPING_SETTINGS,
  getTimeRange: () => {
    const date = STARTED_AT_MOCK_DATE.toISOString();
    return { dateStart: date, dateEnd: date };
  },
};

const setEvaluationResults = (response: Array<Record<string, Evaluation>>) => {
  jest.requireMock('./lib/evaluate_rule').evaluateRule.mockImplementation(() => response);
};

describe('The custom threshold alert type', () => {
  describe('querying the entire infrastructure', () => {
    afterAll(() => clearInstances());
    const instanceID = '*';
    const execute = (comparator: Comparator, threshold: number[], sourceId: string = 'default') =>
      executor({
        ...mockOptions,
        services,
        params: {
          ...mockOptions.params,
          sourceId,
          criteria: [
            {
              ...customThresholdNonCountCriterion,
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
      isNoData: boolean = false
    ) =>
      setEvaluationResults([
        {
          '*': {
            ...customThresholdNonCountCriterion,
            comparator,
            threshold,
            currentValue: 1.0,
            timestamp: new Date().toISOString(),
            shouldFire,
            isNoData,
            bucketKey: { groupBy0: '*' },
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
      expect(action.group).toBeUndefined();
      expect(action.reason).toBe(
        'Average test.metric.1 is 1, above the threshold of 0.75. (duration: 1 min, data view: mockedDataViewName)'
      );
    });
  });

  describe('querying with a groupBy parameter', () => {
    afterAll(() => clearInstances());
    const execute = (
      comparator: Comparator,
      threshold: number[],
      groupBy: string[] = ['groupByField'],
      metrics?: CustomThresholdExpressionMetric[],
      state?: any
    ) =>
      executor({
        ...mockOptions,
        services,
        params: {
          ...mockOptions.params,
          groupBy,
          criteria: [
            {
              ...customThresholdNonCountCriterion,
              comparator,
              threshold,
              metrics: metrics ?? customThresholdNonCountCriterion.metrics,
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
            ...customThresholdNonCountCriterion,
            comparator: Comparator.GT,
            threshold: [0.75],
            currentValue: 1.0,
            timestamp: new Date().toISOString(),
            shouldFire: true,
            isNoData: false,
            bucketKey: { groupBy0: 'a' },
          },
          b: {
            ...customThresholdNonCountCriterion,
            comparator: Comparator.GT,
            threshold: [0.75],
            currentValue: 1.0,
            timestamp: new Date().toISOString(),
            shouldFire: true,
            isNoData: false,
            bucketKey: { groupBy0: 'b' },
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
            ...customThresholdNonCountCriterion,
            comparator: Comparator.LT,
            threshold: [1.5],
            currentValue: 1.0,
            timestamp: new Date().toISOString(),
            shouldFire: true,
            isNoData: false,
            bucketKey: { groupBy0: 'a' },
          },
          b: {
            ...customThresholdNonCountCriterion,
            comparator: Comparator.LT,
            threshold: [1.5],
            currentValue: 3,
            timestamp: new Date().toISOString(),
            shouldFire: false,
            isNoData: false,
            bucketKey: { groupBy0: 'b' },
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
            ...customThresholdNonCountCriterion,
            comparator: Comparator.GT,
            threshold: [5],
            currentValue: 1.0,
            timestamp: new Date().toISOString(),
            shouldFire: false,
            isNoData: false,
            bucketKey: { groupBy0: 'a' },
          },
          b: {
            ...customThresholdNonCountCriterion,
            comparator: Comparator.GT,
            threshold: [5],
            currentValue: 3,
            timestamp: new Date().toISOString(),
            shouldFire: false,
            isNoData: false,
            bucketKey: { groupBy0: 'b' },
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
            ...customThresholdNonCountCriterion,
            comparator: Comparator.GT,
            threshold: [0.75],
            currentValue: 1.0,
            timestamp: new Date().toISOString(),
            shouldFire: true,
            isNoData: false,
            bucketKey: { groupBy0: 'a' },
          },
          b: {
            ...customThresholdNonCountCriterion,
            comparator: Comparator.GT,
            threshold: [0.75],
            currentValue: 3,
            timestamp: new Date().toISOString(),
            shouldFire: true,
            isNoData: false,
            bucketKey: { groupBy0: 'b' },
          },
        },
      ]);
      await execute(Comparator.GT, [0.75]);
      expect(mostRecentAction(instanceIdA).action.group).toEqual([
        { field: 'groupByField', value: 'a' },
      ]);
      expect(mostRecentAction(instanceIdB).action.group).toEqual([
        { field: 'groupByField', value: 'b' },
      ]);
    });
    test('persists previous groups that go missing, until the groupBy param changes', async () => {
      setEvaluationResults([
        {
          a: {
            ...customThresholdNonCountCriterion,
            comparator: Comparator.GT,
            threshold: [0.75],
            metrics: [
              {
                aggType: Aggregators.AVERAGE,
                name: 'A',
                field: 'test.metric.2',
              },
            ],
            currentValue: 1.0,
            timestamp: new Date().toISOString(),
            shouldFire: true,
            isNoData: false,
            bucketKey: { groupBy0: 'a' },
          },
          b: {
            ...customThresholdNonCountCriterion,
            comparator: Comparator.GT,
            threshold: [0.75],
            metrics: [
              {
                aggType: Aggregators.AVERAGE,
                name: 'A',
                field: 'test.metric.2',
              },
            ],
            currentValue: 3,
            timestamp: new Date().toISOString(),
            shouldFire: true,
            isNoData: false,
            bucketKey: { groupBy0: 'b' },
          },
          c: {
            ...customThresholdNonCountCriterion,
            comparator: Comparator.GT,
            threshold: [0.75],
            metrics: [
              {
                aggType: Aggregators.AVERAGE,
                name: 'A',
                field: 'test.metric.2',
              },
            ],
            currentValue: 3,
            timestamp: new Date().toISOString(),
            shouldFire: true,
            isNoData: false,
            bucketKey: { groupBy0: 'c' },
          },
        },
      ]);
      const { state: stateResult1 } = await execute(
        Comparator.GT,
        [0.75],
        ['groupByField'],
        [
          {
            aggType: Aggregators.AVERAGE,
            name: 'A',
            field: 'test.metric.2',
          },
        ]
      );
      expect(stateResult1.missingGroups).toEqual(expect.arrayContaining([]));
      setEvaluationResults([
        {
          a: {
            ...customThresholdNonCountCriterion,
            comparator: Comparator.GT,
            threshold: [0.75],
            currentValue: 1.0,
            timestamp: new Date().toISOString(),
            shouldFire: true,
            isNoData: false,
            bucketKey: { groupBy0: 'a' },
          },
          b: {
            ...customThresholdNonCountCriterion,
            comparator: Comparator.GT,
            threshold: [0.75],
            currentValue: 3,
            timestamp: new Date().toISOString(),
            shouldFire: true,
            isNoData: false,
            bucketKey: { groupBy0: 'b' },
          },
          c: {
            ...customThresholdNonCountCriterion,
            comparator: Comparator.GT,
            threshold: [0.75],
            currentValue: null,
            timestamp: new Date().toISOString(),
            shouldFire: false,
            isNoData: true,
            bucketKey: { groupBy0: 'c' },
          },
        },
      ]);
      const { state: stateResult2 } = await execute(
        Comparator.GT,
        [0.75],
        ['groupByField'],
        [
          {
            aggType: Aggregators.AVERAGE,
            name: 'A',
            field: 'test.metric.1',
          },
        ],
        stateResult1
      );
      expect(stateResult2.missingGroups).toEqual(
        expect.arrayContaining([{ key: 'c', bucketKey: { groupBy0: 'c' } }])
      );
      setEvaluationResults([
        {
          a: {
            ...customThresholdNonCountCriterion,
            comparator: Comparator.GT,
            threshold: [0.75],
            currentValue: 1.0,
            timestamp: new Date().toISOString(),
            shouldFire: true,
            isNoData: false,
            bucketKey: { groupBy0: 'a' },
          },
          b: {
            ...customThresholdNonCountCriterion,
            comparator: Comparator.GT,
            threshold: [0.75],
            currentValue: 3,
            timestamp: new Date().toISOString(),
            shouldFire: true,
            isNoData: false,
            bucketKey: { groupBy0: 'b' },
          },
        },
      ]);
      const { state: stateResult3 } = await execute(
        Comparator.GT,
        [0.75],
        ['groupByField', 'groupByField-else'],
        [
          {
            aggType: Aggregators.AVERAGE,
            name: 'A',
            field: 'test.metric.2',
          },
        ],
        stateResult2
      );
      expect(stateResult3.missingGroups).toEqual(expect.arrayContaining([]));
    });

    const executeWithFilter = (
      comparator: Comparator,
      threshold: number[],
      filterQuery: string,
      metrics?: any,
      state?: any
    ) =>
      executor({
        ...mockOptions,
        services,
        params: {
          ...mockOptions.params,
          groupBy: ['groupByField'],
          criteria: [
            {
              ...customThresholdNonCountCriterion,
              comparator,
              threshold,
              metrics: metrics ?? customThresholdNonCountCriterion.metrics,
            },
          ],
          searchConfiguration: {
            index: {},
            query: {
              query: filterQuery,
              language: 'kuery',
            },
          },
        },
        state: state ?? mockOptions.state.wrapped,
      });
    test('persists previous groups that go missing, until the filterQuery param changes', async () => {
      setEvaluationResults([
        {
          a: {
            ...customThresholdNonCountCriterion,
            comparator: Comparator.GT,
            threshold: [0.75],
            metrics: [
              {
                aggType: Aggregators.AVERAGE,
                name: 'A',
                field: 'test.metric.2',
              },
            ],
            currentValue: 1.0,
            timestamp: new Date().toISOString(),
            shouldFire: true,
            isNoData: false,
            bucketKey: { groupBy0: 'a' },
          },
          b: {
            ...customThresholdNonCountCriterion,
            comparator: Comparator.GT,
            threshold: [0.75],
            metrics: [
              {
                aggType: Aggregators.AVERAGE,
                name: 'A',
                field: 'test.metric.2',
              },
            ],
            currentValue: 3,
            timestamp: new Date().toISOString(),
            shouldFire: true,
            isNoData: false,
            bucketKey: { groupBy0: 'b' },
          },
          c: {
            ...customThresholdNonCountCriterion,
            comparator: Comparator.GT,
            threshold: [0.75],
            metrics: [
              {
                aggType: Aggregators.AVERAGE,
                name: 'A',
                field: 'test.metric.2',
              },
            ],
            currentValue: 3,
            timestamp: new Date().toISOString(),
            shouldFire: true,
            isNoData: false,
            bucketKey: { groupBy0: 'c' },
          },
        },
      ]);
      const { state: stateResult1 } = await executeWithFilter(
        Comparator.GT,
        [0.75],
        JSON.stringify({ query: 'q' }),
        'test.metric.2'
      );
      expect(stateResult1.missingGroups).toEqual(expect.arrayContaining([]));
      setEvaluationResults([
        {
          a: {
            ...customThresholdNonCountCriterion,
            comparator: Comparator.GT,
            threshold: [0.75],
            currentValue: 1.0,
            timestamp: new Date().toISOString(),
            shouldFire: true,
            isNoData: false,
            bucketKey: { groupBy0: 'a' },
          },
          b: {
            ...customThresholdNonCountCriterion,
            comparator: Comparator.GT,
            threshold: [0.75],
            currentValue: 3,
            timestamp: new Date().toISOString(),
            shouldFire: true,
            isNoData: false,
            bucketKey: { groupBy0: 'b' },
          },
          c: {
            ...customThresholdNonCountCriterion,
            comparator: Comparator.GT,
            threshold: [0.75],
            currentValue: null,
            timestamp: new Date().toISOString(),
            shouldFire: false,
            isNoData: true,
            bucketKey: { groupBy0: 'c' },
          },
        },
      ]);
      const { state: stateResult2 } = await executeWithFilter(
        Comparator.GT,
        [0.75],
        JSON.stringify({ query: 'q' }),
        'test.metric.1',
        stateResult1
      );
      expect(stateResult2.missingGroups).toEqual(
        expect.arrayContaining([{ key: 'c', bucketKey: { groupBy0: 'c' } }])
      );
      setEvaluationResults([
        {
          a: {
            ...customThresholdNonCountCriterion,
            comparator: Comparator.GT,
            threshold: [0.75],
            currentValue: 1.0,
            timestamp: new Date().toISOString(),
            shouldFire: true,
            isNoData: false,
            bucketKey: { groupBy0: 'a' },
          },
          b: {
            ...customThresholdNonCountCriterion,
            comparator: Comparator.GT,
            threshold: [0.75],
            currentValue: 3,
            timestamp: new Date().toISOString(),
            shouldFire: true,
            isNoData: false,
            bucketKey: { groupBy0: 'b' },
          },
        },
      ]);
      const { state: stateResult3 } = await executeWithFilter(
        Comparator.GT,
        [0.75],
        JSON.stringify({ query: 'different' }),
        [
          {
            aggType: Aggregators.AVERAGE,
            name: 'A',
            field: 'test.metric.1',
          },
        ],
        stateResult2
      );
      expect(stateResult3.groups).toEqual(expect.arrayContaining([]));
    });
  });

  describe('querying with a groupBy parameter host.name and rule tags', () => {
    afterAll(() => clearInstances());
    const execute = (
      comparator: Comparator,
      threshold: number[],
      groupBy: string[] = ['host.name'],
      metrics?: any,
      state?: any
    ) =>
      executor({
        ...mockOptions,
        services,
        params: {
          ...mockOptions.params,
          groupBy,
          criteria: [
            {
              ...customThresholdNonCountCriterion,
              comparator,
              threshold,
              metrics: metrics ?? customThresholdNonCountCriterion.metrics,
            },
          ],
        },
        state: state ?? mockOptions.state.wrapped,
        rule: {
          ...mockOptions.rule,
          tags: ['ruleTag1', 'ruleTag2'],
        },
      });
    const instanceIdA = 'host-01';
    const instanceIdB = 'host-02';

    test('rule tags and source tags are combined in alert context', async () => {
      setEvaluationResults([
        {
          'host-01': {
            ...customThresholdNonCountCriterion,
            comparator: Comparator.GT,
            threshold: [0.75],
            currentValue: 1.0,
            timestamp: new Date().toISOString(),
            shouldFire: true,
            isNoData: false,
            bucketKey: { groupBy0: 'host-01' },
            context: {
              tags: ['host-01_tag1', 'host-01_tag2'],
            },
          },
          'host-02': {
            ...customThresholdNonCountCriterion,
            comparator: Comparator.GT,
            threshold: [0.75],
            currentValue: 3,
            timestamp: new Date().toISOString(),
            shouldFire: true,
            isNoData: false,
            bucketKey: { groupBy0: 'host-02' },
            context: {
              tags: ['host-02_tag1', 'host-02_tag2'],
            },
          },
        },
      ]);
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
  });

  describe('querying without a groupBy parameter and rule tags', () => {
    afterAll(() => clearInstances());
    const execute = (
      comparator: Comparator,
      threshold: number[],
      groupBy: string = '',
      metrics?: any,
      state?: any
    ) =>
      executor({
        ...mockOptions,
        services,
        params: {
          ...mockOptions.params,
          groupBy,
          criteria: [
            {
              ...customThresholdNonCountCriterion,
              comparator,
              threshold,
              metrics: metrics ?? customThresholdNonCountCriterion.metrics,
            },
          ],
        },
        state: state ?? mockOptions.state.wrapped,
        rule: {
          ...mockOptions.rule,
          tags: ['ruleTag1', 'ruleTag2'],
        },
      });

    test('rule tags are added in alert context', async () => {
      setEvaluationResults([
        {
          '*': {
            ...customThresholdNonCountCriterion,
            comparator: Comparator.GT,
            threshold: [0.75],
            currentValue: 1.0,
            timestamp: new Date().toISOString(),
            shouldFire: true,
            isNoData: false,
            bucketKey: { groupBy0: '*' },
          },
        },
      ]);

      const instanceID = '*';
      await execute(Comparator.GT, [0.75]);
      expect(mostRecentAction(instanceID).action.tags).toStrictEqual(['ruleTag1', 'ruleTag2']);
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
          ...mockOptions.params,
          sourceId,
          groupBy,
          criteria: [
            {
              ...customThresholdNonCountCriterion,
              comparator,
              threshold: thresholdA,
            },
            {
              ...customThresholdNonCountCriterion,
              comparator,
              threshold: thresholdB,
              metrics: [
                {
                  aggType: Aggregators.AVERAGE,
                  name: 'A',
                  field: 'test.metric.2',
                },
              ],
            },
          ],
        },
      });
    test('sends an alert when all criteria cross the threshold', async () => {
      setEvaluationResults([
        {
          '*': {
            ...customThresholdNonCountCriterion,
            comparator: Comparator.GT_OR_EQ,
            threshold: [1.0],
            currentValue: 1.0,
            timestamp: new Date().toISOString(),
            shouldFire: true,
            isNoData: false,
            bucketKey: { groupBy0: '*' },
          },
        },
        {
          '*': {
            ...customThresholdNonCountCriterion,
            comparator: Comparator.GT_OR_EQ,
            threshold: [3.0],
            currentValue: 3.0,
            timestamp: new Date().toISOString(),
            shouldFire: true,
            isNoData: false,
            bucketKey: { groupBy0: '*' },
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
            ...customThresholdNonCountCriterion,
            comparator: Comparator.LT_OR_EQ,
            threshold: [1.0],
            currentValue: 1.0,
            timestamp: new Date().toISOString(),
            shouldFire: true,
            isNoData: false,
            bucketKey: { groupBy0: '*' },
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
            ...customThresholdNonCountCriterion,
            comparator: Comparator.GT_OR_EQ,
            threshold: [1.0],
            currentValue: 1.0,
            timestamp: new Date().toISOString(),
            shouldFire: true,
            isNoData: false,
            bucketKey: { groupBy0: 'a' },
          },
          b: {
            ...customThresholdNonCountCriterion,
            comparator: Comparator.GT_OR_EQ,
            threshold: [1.0],
            currentValue: 3.0,
            timestamp: new Date().toISOString(),
            shouldFire: true,
            isNoData: false,
            bucketKey: { groupBy0: 'b' },
          },
        },
        {
          a: {
            ...customThresholdNonCountCriterion,
            comparator: Comparator.GT_OR_EQ,
            threshold: [3.0],
            metrics: [
              {
                aggType: Aggregators.AVERAGE,
                name: 'A',
                field: 'test.metric.2',
              },
            ],
            currentValue: 3.0,
            timestamp: new Date().toISOString(),
            shouldFire: true,
            isNoData: false,
            bucketKey: { groupBy0: 'a' },
          },
          b: {
            ...customThresholdNonCountCriterion,
            comparator: Comparator.GT_OR_EQ,
            threshold: [3.0],
            metrics: [
              {
                aggType: Aggregators.AVERAGE,
                name: 'A',
                field: 'test.metric.2',
              },
            ],
            currentValue: 1.0,
            timestamp: new Date().toISOString(),
            shouldFire: false,
            isNoData: false,
            bucketKey: { groupBy0: 'b' },
          },
        },
      ]);
      const instanceIdA = 'a';
      const instanceIdB = 'b';
      await execute(Comparator.GT_OR_EQ, [1.0], [3.0], 'groupByField');
      expect(mostRecentAction(instanceIdA)).toBeAlertAction();
      expect(mostRecentAction(instanceIdB)).toBe(undefined);
    });
    test('sends all criteria to the action context', async () => {
      setEvaluationResults([
        {
          '*': {
            ...customThresholdNonCountCriterion,
            comparator: Comparator.GT_OR_EQ,
            threshold: [1.0],
            currentValue: 1.0,
            timestamp: new Date().toISOString(),
            shouldFire: true,
            isNoData: false,
            bucketKey: { groupBy0: '*' },
          },
        },
        {
          '*': {
            ...customThresholdNonCountCriterion,
            comparator: Comparator.GT_OR_EQ,
            threshold: [3.0],
            metrics: [
              {
                aggType: Aggregators.AVERAGE,
                name: 'A',
                field: 'test.metric.2',
              },
            ],
            currentValue: 3.0,
            timestamp: new Date().toISOString(),
            shouldFire: true,
            isNoData: false,
            bucketKey: { groupBy0: '*' },
          },
        },
      ]);
      const instanceID = '*';
      await execute(Comparator.GT_OR_EQ, [1.0], [3.0]);
      const { action } = mostRecentAction(instanceID);
      const reasons = action.reason;
      expect(reasons).toBe(
        'Average test.metric.1 is 1, above or equal the threshold of 1; Average test.metric.2 is 3, above or equal the threshold of 3. (duration: 1 min, data view: mockedDataViewName)'
      );
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
          ...mockOptions.params,
          sourceId,
          criteria: [
            {
              ...customThresholdCountCriterion,
              comparator,
              threshold,
            },
          ],
        },
      });
    test('alerts based on the doc_count value instead of the aggregatedValue', async () => {
      setEvaluationResults([
        {
          '*': {
            ...customThresholdCountCriterion,
            comparator: Comparator.GT,
            threshold: [0.9],
            currentValue: 1,
            timestamp: new Date().toISOString(),
            shouldFire: true,
            isNoData: false,
            bucketKey: { groupBy0: 'a' },
          },
        },
      ]);
      await execute(Comparator.GT, [0.9]);
      expect(mostRecentAction(instanceID)).toBeAlertAction();
      setEvaluationResults([
        {
          '*': {
            ...customThresholdCountCriterion,
            comparator: Comparator.LT,
            threshold: [0.5],
            currentValue: 1,
            timestamp: new Date().toISOString(),
            shouldFire: false,
            isNoData: false,
            bucketKey: { groupBy0: 'a' },
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
            ...mockOptions.params,
            sourceId,
            groupBy: 'groupByField',
            criteria: [
              {
                ...customThresholdCountCriterion,
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
              ...customThresholdCountCriterion,
              comparator: Comparator.LT_OR_EQ,
              threshold: [0],
              currentValue: 1,
              timestamp: new Date().toISOString(),
              shouldFire: false,
              isNoData: false,
              bucketKey: { groupBy0: 'a' },
            },
            b: {
              ...customThresholdCountCriterion,
              comparator: Comparator.LT_OR_EQ,
              threshold: [0],
              currentValue: 1,
              timestamp: new Date().toISOString(),
              shouldFire: false,
              isNoData: false,
              bucketKey: { groupBy0: 'b' },
            },
          },
        ]);
        const resultState = await executeGroupBy(Comparator.LT_OR_EQ, [0]);
        expect(mostRecentAction(instanceIdA)).toBe(undefined);
        expect(mostRecentAction(instanceIdB)).toBe(undefined);
        setEvaluationResults([
          {
            a: {
              ...customThresholdCountCriterion,
              comparator: Comparator.LT_OR_EQ,
              threshold: [0],
              currentValue: 0,
              timestamp: new Date().toISOString(),
              shouldFire: true,
              isNoData: false,
              bucketKey: { groupBy0: 'a' },
            },
            b: {
              ...customThresholdCountCriterion,
              comparator: Comparator.LT_OR_EQ,
              threshold: [0],
              currentValue: 0,
              timestamp: new Date().toISOString(),
              shouldFire: true,
              isNoData: false,
              bucketKey: { groupBy0: 'b' },
            },
          },
        ]);
        await executeGroupBy(Comparator.LT_OR_EQ, [0], 'empty-response', resultState);
        expect(mostRecentAction(instanceIdA)).toBeAlertAction();
        expect(mostRecentAction(instanceIdB)).toBeAlertAction();
      });
    });
  });

  describe('querying recovered alert with a count aggregator', () => {
    afterAll(() => clearInstances());
    const execute = (comparator: Comparator, threshold: number[], sourceId: string = 'default') =>
      executor({
        ...mockOptions,
        services,
        params: {
          ...mockOptions.params,
          sourceId,
          criteria: [
            {
              ...customThresholdCountCriterion,
              comparator,
              threshold,
            },
          ],
        },
      });
    test('alerts based on the doc_count value instead of the aggregatedValue', async () => {
      setEvaluationResults([
        {
          '*': {
            ...customThresholdCountCriterion,
            comparator: Comparator.GT,
            threshold: [0.9],
            currentValue: 1,
            timestamp: new Date().toISOString(),
            shouldFire: true,
            isNoData: false,
            bucketKey: { groupBy0: 'a' },
          },
        },
      ]);
      const mockedSetContext = jest.fn();
      services.alertFactory.done.mockImplementation(() => {
        return {
          getRecoveredAlerts: jest.fn().mockReturnValue([
            {
              setContext: mockedSetContext,
              getId: jest.fn().mockReturnValue('mockedId'),
            },
          ]),
        };
      });
      await execute(Comparator.GT, [0.9]);
      const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
      expect(getViewInAppUrl).toBeCalledWith({
        dataViewId: 'c34a7c79-a88b-4b4a-ad19-72f6d24104e4',
        filter: mockQuery,
        logsExplorerLocator: undefined,
        metrics: customThresholdCountCriterion.metrics,
        startedAt: expect.stringMatching(ISO_DATE_REGEX),
      });
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
          ...mockOptions.params,
          sourceId,
          criteria: [
            {
              ...customThresholdNonCountCriterion,
              comparator: Comparator.GT,
              threshold: [1],
              metrics: [
                {
                  aggType: Aggregators.AVERAGE,
                  name: 'A',
                  field: 'test.metric.3',
                },
              ],
            },
          ],
          alertOnNoData,
        },
      });
    test('sends a No Data alert when configured to do so', async () => {
      setEvaluationResults([
        {
          '*': {
            ...customThresholdNonCountCriterion,
            comparator: Comparator.LT,
            threshold: [1],
            metrics: [
              {
                aggType: Aggregators.AVERAGE,
                name: 'A',
                field: 'test.metric.3',
              },
            ],
            currentValue: null,
            timestamp: new Date().toISOString(),
            shouldFire: false,
            isNoData: true,
            bucketKey: { groupBy0: '*' },
          },
        },
      ]);
      await execute(true);
      const recentAction = mostRecentAction(instanceID);
      expect(recentAction.action.reason).toEqual(
        'Average test.metric.3 reported no data in the last 1m'
      );
      expect(recentAction).toBeNoDataAction();
    });
    test('does not send a No Data alert when not configured to do so', async () => {
      setEvaluationResults([
        {
          '*': {
            ...customThresholdNonCountCriterion,
            comparator: Comparator.LT,
            threshold: [1],
            metrics: [
              {
                aggType: Aggregators.AVERAGE,
                name: 'A',
                field: 'test.metric.3',
              },
            ],
            currentValue: null,
            timestamp: new Date().toISOString(),
            shouldFire: false,
            isNoData: true,
            bucketKey: { groupBy0: '*' },
          },
        },
      ]);
      await execute(false);
      expect(mostRecentAction(instanceID)).toBe(undefined);
    });
  });

  describe('alerts with NO_DATA where one condtion is an aggregation and the other is a document count', () => {
    afterAll(() => clearInstances());
    const instanceID = '*';
    const execute = (alertOnNoData: boolean, sourceId: string = 'default') =>
      executor({
        ...mockOptions,
        services,
        params: {
          ...mockOptions.params,
          sourceId,
          criteria: [
            {
              ...customThresholdNonCountCriterion,
              comparator: Comparator.GT,
              threshold: [1],
              metrics: [
                {
                  aggType: Aggregators.AVERAGE,
                  name: 'A',
                  field: 'test.metric.3',
                },
              ],
            },
            {
              ...customThresholdCountCriterion,
              comparator: Comparator.GT,
              threshold: [30],
            },
          ],
          alertOnNoData,
        },
      });
    test('sends a No Data alert when configured to do so', async () => {
      setEvaluationResults([
        {
          '*': {
            ...customThresholdNonCountCriterion,
            comparator: Comparator.LT,
            threshold: [1],
            metrics: [
              {
                aggType: Aggregators.AVERAGE,
                name: 'A',
                field: 'test.metric.3',
              },
            ],
            currentValue: null,
            timestamp: STARTED_AT_MOCK_DATE.toISOString(),
            shouldFire: false,
            isNoData: true,
            bucketKey: { groupBy0: '*' },
          },
        },
        {},
      ]);
      await execute(true);
      const recentAction = mostRecentAction(instanceID);
      expect(recentAction.action).toEqual({
        alertDetailsUrl: 'http://localhost:5601/app/observability/alerts/mock-alert-uuid',
        reason: 'Average test.metric.3 reported no data in the last 1m',
        timestamp: STARTED_AT_MOCK_DATE.toISOString(),
        value: ['[NO DATA]', null],
        tags: [],
        viewInAppUrl: 'mockedViewInApp',
      });
      expect(recentAction).toBeNoDataAction();
    });
  });

  describe('querying a groupBy alert that starts reporting no data, and then later reports data', () => {
    afterAll(() => clearInstances());
    const instanceID = '*';
    const instanceIdA = 'a';
    const instanceIdB = 'b';
    const instanceIdC = 'c';
    const execute = (metrics: any, alertOnGroupDisappear: boolean = true, state?: any) =>
      executor({
        ...mockOptions,
        services,
        params: {
          ...mockOptions.params,
          groupBy: 'groupByField',
          sourceId: 'default',
          criteria: [
            {
              ...customThresholdNonCountCriterion,
              comparator: Comparator.GT,
              threshold: [0],
              metrics,
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
            ...customThresholdNonCountCriterion,
            comparator: Comparator.GT,
            threshold: [0],
            metrics: [
              {
                aggType: Aggregators.AVERAGE,
                name: 'A',
                field: 'test.metric.3',
              },
            ],
            currentValue: null,
            timestamp: new Date().toISOString(),
            shouldFire: false,
            isNoData: true,
            bucketKey: { groupBy0: '*' },
          },
        },
      ]);
      let resultState = await executeEmptyResponse();
      expect(mostRecentAction(instanceID)).toBeNoDataAction();
      setEvaluationResults([
        {
          '*': {
            ...customThresholdNonCountCriterion,
            comparator: Comparator.GT,
            threshold: [0],
            metrics: [
              {
                aggType: Aggregators.AVERAGE,
                name: 'A',
                field: 'test.metric.3',
              },
            ],
            currentValue: null,
            timestamp: new Date().toISOString(),
            shouldFire: false,
            isNoData: true,
            bucketKey: { groupBy0: '*' },
          },
        },
      ]);
      resultState = await executeEmptyResponse(true, resultState);
      expect(mostRecentAction(instanceID)).toBeNoDataAction();
      setEvaluationResults([
        {
          a: {
            ...customThresholdNonCountCriterion,
            comparator: Comparator.GT,
            threshold: [0],
            currentValue: 1.0,
            timestamp: new Date().toISOString(),
            shouldFire: true,
            isNoData: false,
            bucketKey: { groupBy0: 'a' },
          },
          b: {
            ...customThresholdNonCountCriterion,
            comparator: Comparator.GT,
            threshold: [0],
            currentValue: 3,
            timestamp: new Date().toISOString(),
            shouldFire: true,
            isNoData: false,
            bucketKey: { groupBy0: 'b' },
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
            ...customThresholdNonCountCriterion,
            comparator: Comparator.GT,
            threshold: [0],
            metrics: [
              {
                aggType: Aggregators.AVERAGE,
                name: 'A',
                field: 'test.metric.3',
              },
            ],
            currentValue: null,
            timestamp: new Date().toISOString(),
            shouldFire: false,
            isNoData: true,
            bucketKey: { groupBy0: 'a' },
          },
          b: {
            ...customThresholdNonCountCriterion,
            comparator: Comparator.GT,
            threshold: [0],
            metrics: [
              {
                aggType: Aggregators.AVERAGE,
                name: 'A',
                field: 'test.metric.3',
              },
            ],
            currentValue: null,
            timestamp: new Date().toISOString(),
            shouldFire: false,
            isNoData: true,
            bucketKey: { groupBy0: 'b' },
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
            ...customThresholdNonCountCriterion,
            comparator: Comparator.GT,
            threshold: [0],
            metrics: [
              {
                aggType: Aggregators.AVERAGE,
                name: 'A',
                field: 'test.metric.2',
              },
            ],
            currentValue: 3,
            timestamp: new Date().toISOString(),
            shouldFire: true,
            isNoData: false,
            bucketKey: { groupBy0: 'a' },
          },
          b: {
            ...customThresholdNonCountCriterion,
            comparator: Comparator.GT,
            threshold: [0],
            metrics: [
              {
                aggType: Aggregators.AVERAGE,
                name: 'A',
                field: 'test.metric.2',
              },
            ],
            currentValue: 1,
            timestamp: new Date().toISOString(),
            shouldFire: true,
            isNoData: false,
            bucketKey: { groupBy0: 'b' },
          },
          c: {
            ...customThresholdNonCountCriterion,
            comparator: Comparator.GT,
            threshold: [0],
            metrics: [
              {
                aggType: Aggregators.AVERAGE,
                name: 'A',
                field: 'test.metric.2',
              },
            ],
            currentValue: 3,
            timestamp: new Date().toISOString(),
            shouldFire: true,
            isNoData: false,
            bucketKey: { groupBy0: 'c' },
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
            ...customThresholdNonCountCriterion,
            comparator: Comparator.GT,
            threshold: [0],
            currentValue: 1,
            timestamp: new Date().toISOString(),
            shouldFire: true,
            isNoData: false,
            bucketKey: { groupBy0: 'a' },
          },
          b: {
            ...customThresholdNonCountCriterion,
            comparator: Comparator.GT,
            threshold: [0],
            currentValue: 3,
            timestamp: new Date().toISOString(),
            shouldFire: true,
            isNoData: false,
            bucketKey: { groupBy0: 'b' },
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
      const executeWeirdNoDataConfig = (metrics: any, state?: any) =>
        executor({
          ...mockOptions,
          services,
          params: {
            ...mockOptions.params,
            groupBy: 'groupByField',
            sourceId: 'default',
            criteria: [
              {
                ...customThresholdNonCountCriterion,
                comparator: Comparator.GT,
                threshold: [0],
                metrics,
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
              ...customThresholdNonCountCriterion,
              comparator: Comparator.GT,
              threshold: [0],
              metrics: [
                {
                  aggType: Aggregators.AVERAGE,
                  name: 'A',
                  field: 'test.metric.3',
                },
              ],
              currentValue: null,
              timestamp: new Date().toISOString(),
              shouldFire: false,
              isNoData: true,
              bucketKey: { groupBy0: '*' },
            },
          },
        ]);
        let resultState = await executeWeirdEmptyResponse();
        expect(mostRecentAction(instanceID)).toBe(undefined);
        setEvaluationResults([
          {
            '*': {
              ...customThresholdNonCountCriterion,
              comparator: Comparator.GT,
              threshold: [0],
              metrics: [
                {
                  aggType: Aggregators.AVERAGE,
                  name: 'A',
                  field: 'test.metric.3',
                },
              ],
              currentValue: null,
              timestamp: new Date().toISOString(),
              shouldFire: false,
              isNoData: true,
              bucketKey: { groupBy0: '*' },
            },
          },
        ]);
        resultState = await executeWeirdEmptyResponse(resultState);
        expect(mostRecentAction(instanceID)).toBe(undefined);
        setEvaluationResults([
          {
            a: {
              ...customThresholdNonCountCriterion,
              comparator: Comparator.GT,
              threshold: [0],
              currentValue: 1,
              timestamp: new Date().toISOString(),
              shouldFire: true,
              isNoData: false,
              bucketKey: { groupBy0: 'a' },
            },
            b: {
              ...customThresholdNonCountCriterion,
              comparator: Comparator.GT,
              threshold: [0],
              currentValue: 3,
              timestamp: new Date().toISOString(),
              shouldFire: true,
              isNoData: false,
              bucketKey: { groupBy0: 'b' },
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
              ...customThresholdNonCountCriterion,
              comparator: Comparator.GT,
              threshold: [0],
              metrics: [
                {
                  aggType: Aggregators.AVERAGE,
                  name: 'A',
                  field: 'test.metric.3',
                },
              ],
              currentValue: null,
              timestamp: new Date().toISOString(),
              shouldFire: false,
              isNoData: true,
              bucketKey: { groupBy0: 'a' },
            },
            b: {
              ...customThresholdNonCountCriterion,
              comparator: Comparator.GT,
              threshold: [0],
              metrics: [
                {
                  aggType: Aggregators.AVERAGE,
                  name: 'A',
                  field: 'test.metric.3',
                },
              ],
              currentValue: null,
              timestamp: new Date().toISOString(),
              shouldFire: false,
              isNoData: true,
              bucketKey: { groupBy0: 'b' },
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
});

const mockLibs: any = {
  threshold_rule: {
    group_by_page_size: 10000,
  },
  basePath: {
    publicBaseUrl: 'http://localhost:5601',
    prepend: (path: string) => path,
  },
  logger,
  config: {
    customThresholdRule: {
      groupByPageSize: 10_000,
    },
  },
  locators: {},
};

const executor = createCustomThresholdExecutor(mockLibs);

const alertsServices = alertsMock.createRuleExecutorServices();
const mockedIndex = {
  id: 'c34a7c79-a88b-4b4a-ad19-72f6d24104e4',
  title: 'metrics-fake_hosts',
  name: 'mockedDataViewName',
  fieldFormatMap: {},
  typeMeta: {},
  timeFieldName: '@timestamp',
};
const mockedDataView = {
  getIndexPattern: () => 'mockedIndexPattern',
  getName: () => 'mockedDataViewName',
  ...mockedIndex,
};
const mockedSearchSource = {
  getField: jest.fn(() => mockedDataView),
} as any as ISearchSource;
const services: RuleExecutorServicesMock &
  LifecycleAlertServices<AlertState, CustomThresholdAlertContext, string> = {
  ...alertsServices,
  ...ruleRegistryMocks.createLifecycleAlertServices(alertsServices),
  searchSourceClient: {
    ...searchSourceCommonMock,
    create: jest.fn(() => Promise.resolve(mockedSearchSource)),
  },
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

interface Action {
  id: string;
  action: { reason: string };
}

expect.extend({
  toBeAlertAction(action?: Action) {
    const pass = action?.id === FIRED_ACTION.id && !action?.action.reason.includes('no data');
    const message = () => `expected ${action} to be an ALERT action`;
    return {
      message,
      pass,
    };
  },
  toBeNoDataAction(action?: Action) {
    const pass = action?.id === NO_DATA_ACTION.id && action?.action.reason.includes('no data');
    const message = () => `expected ${action} to be a NO DATA action`;
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
    }
  }
}

const customThresholdNonCountCriterion: CustomMetricExpressionParams = {
  comparator: Comparator.GT,
  metrics: [
    {
      aggType: Aggregators.AVERAGE,
      name: 'A',
      field: 'test.metric.1',
    },
  ],
  timeSize: 1,
  timeUnit: 'm',
  threshold: [0],
};

const mockedCountFilter = 'mockedCountFilter';
const customThresholdCountCriterion: CustomMetricExpressionParams = {
  comparator: Comparator.GT,
  metrics: [
    {
      aggType: Aggregators.COUNT,
      name: 'A',
      filter: mockedCountFilter,
    },
  ],
  timeSize: 1,
  timeUnit: 'm',
  threshold: [0],
};
