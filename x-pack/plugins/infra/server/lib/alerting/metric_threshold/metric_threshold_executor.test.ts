/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { alertsMock } from '@kbn/alerting-plugin/server/mocks';
import { set } from '@kbn/safer-lodash-set';
import {
  Aggregators,
  Comparator,
  CountMetricExpressionParams,
  NonCountMetricExpressionParams,
} from '../../../../common/alerting/metrics';
import {
  createMetricThresholdExecutor,
  FIRED_ACTIONS,
  NO_DATA_ACTIONS,
  WARNING_ACTIONS,
} from './metric_threshold_executor';
import { Evaluation } from './lib/evaluate_rule';
import type { LogMeta, Logger } from '@kbn/logging';
import { DEFAULT_FLAPPING_SETTINGS } from '@kbn/alerting-plugin/common';
import { InfraConfig } from '../../../../common/plugin_config_types';
import { ALERT_EVALUATION_VALUES, ALERT_REASON } from '@kbn/rule-data-utils';

jest.mock('./lib/evaluate_rule', () => ({ evaluateRule: jest.fn() }));

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

const mockNow = new Date('2023-09-20T15:11:04.105Z');

const STARTED_AT_MOCK_DATE = new Date();

const mockOptions = {
  executionId: '',
  startedAt: mockNow,
  previousStartedAt: null,
  state: {},
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

describe('The metric threshold rule type', () => {
  beforeAll(() => {
    jest.useFakeTimers();
    jest.setSystemTime();
  });
  beforeEach(() => {
    jest.resetAllMocks();

    services.alertsClient.report.mockImplementation(({ id }: { id: string }) => ({
      uuid: `uuid-${id}`,
      start: new Date().toISOString(),
    }));
  });
  afterAll(() => jest.useRealTimers());

  describe('querying the entire infrastructure', () => {
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
            bucketKey: { groupBy0: '*' },
          },
        },
      ]);

    test('should report alert with the > comparator when condition is met', async () => {
      setResults(Comparator.GT, [0.75], true);
      await execute(Comparator.GT, [0.75]);
      testNAlertsReported(1);
      testAlertReported(1, {
        id: '*',
        conditions: [
          { metric: 'test.metric.1', threshold: ['0.75'], value: '1', evaluation_value: 1 },
        ],
        actionGroup: FIRED_ACTIONS.id,
        alertState: 'ALERT',
        reason: 'test.metric.1 is 1 in the last 1 min. Alert when > 0.75.',
        tags: [],
      });
    });

    test('should not report any alerts with the > comparator when condition is not met', async () => {
      setResults(Comparator.GT, [1.5], false);
      await execute(Comparator.GT, [1.5]);
      testNAlertsReported(0);
    });

    test('should report alert with the < comparator when condition is met', async () => {
      setResults(Comparator.LT, [1.5], true);
      await execute(Comparator.LT, [1.5]);
      testNAlertsReported(1);
      testAlertReported(1, {
        id: '*',
        conditions: [
          { metric: 'test.metric.1', threshold: ['1.5'], value: '1', evaluation_value: 1 },
        ],
        actionGroup: FIRED_ACTIONS.id,
        alertState: 'ALERT',
        reason: 'test.metric.1 is 1 in the last 1 min. Alert when < 1.5.',
        tags: [],
      });
    });

    test('should not report any alerts with the < comparator when condition is not met', async () => {
      setResults(Comparator.LT, [0.75], false);
      await execute(Comparator.LT, [0.75]);
      testNAlertsReported(0);
    });

    test('should report alert with the >= comparator when condition is met', async () => {
      setResults(Comparator.GT_OR_EQ, [0.75], true);
      await execute(Comparator.GT_OR_EQ, [0.75]);
      testNAlertsReported(1);
      testAlertReported(1, {
        id: '*',
        conditions: [
          { metric: 'test.metric.1', threshold: ['0.75'], value: '1', evaluation_value: 1 },
        ],
        actionGroup: FIRED_ACTIONS.id,
        alertState: 'ALERT',
        reason: 'test.metric.1 is 1 in the last 1 min. Alert when >= 0.75.',
        tags: [],
      });
    });

    test('should not report any alerts with the >= comparator when condition is not met', async () => {
      setResults(Comparator.GT_OR_EQ, [1.5], false);
      await execute(Comparator.GT_OR_EQ, [1.5]);
      testNAlertsReported(0);
    });

    test('should report alert with the <= comparator when condition is met', async () => {
      setResults(Comparator.LT_OR_EQ, [1.5], true);
      await execute(Comparator.LT_OR_EQ, [1.5]);
      testNAlertsReported(1);
      testAlertReported(1, {
        id: '*',
        conditions: [
          { metric: 'test.metric.1', threshold: ['1.5'], value: '1', evaluation_value: 1 },
        ],
        actionGroup: FIRED_ACTIONS.id,
        alertState: 'ALERT',
        reason: 'test.metric.1 is 1 in the last 1 min. Alert when <= 1.5.',
        tags: [],
      });
    });

    test('should not report any alerts with the <= comparator when condition is not met', async () => {
      setResults(Comparator.LT_OR_EQ, [0.75], false);
      await execute(Comparator.LT_OR_EQ, [0.75]);
      testNAlertsReported(0);
    });

    test('should report alert with the between comparator when condition is met', async () => {
      setResults(Comparator.BETWEEN, [0, 1.5], true);
      await execute(Comparator.BETWEEN, [0, 1.5]);
      testNAlertsReported(1);
      testAlertReported(1, {
        id: '*',
        conditions: [
          { metric: 'test.metric.1', threshold: ['0', '1.5'], value: '1', evaluation_value: 1 },
        ],
        actionGroup: FIRED_ACTIONS.id,
        alertState: 'ALERT',
        reason: 'test.metric.1 is 1 in the last 1 min. Alert when between 0 and 1.5.',
        tags: [],
      });
    });

    test('should not report any alerts with the between comparator when condition is not met', async () => {
      setResults(Comparator.BETWEEN, [0, 0.75], false);
      await execute(Comparator.BETWEEN, [0, 0.75]);
      testNAlertsReported(0);
    });

    test('should report alert with the outside range comparator when condition is met', async () => {
      setResults(Comparator.OUTSIDE_RANGE, [0, 0.75], true);
      await execute(Comparator.OUTSIDE_RANGE, [0, 0.75]);
      testNAlertsReported(1);
      testAlertReported(1, {
        id: '*',
        conditions: [
          { metric: 'test.metric.1', threshold: ['0', '0.75'], value: '1', evaluation_value: 1 },
        ],
        actionGroup: FIRED_ACTIONS.id,
        alertState: 'ALERT',
        reason: 'test.metric.1 is 1 in the last 1 min. Alert when outside 0 and 0.75.',
        tags: [],
      });
    });

    test('should not report any alerts with the outside range comparator when condition is not met', async () => {
      setResults(Comparator.OUTSIDE_RANGE, [0, 1.5], false);
      await execute(Comparator.OUTSIDE_RANGE, [0, 1.5]);
      testNAlertsReported(0);
    });
  });

  describe('querying with a groupBy parameter', () => {
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
        state: state ?? mockOptions.state,
      });
    const alertIdA = 'a';
    const alertIdB = 'b';

    test('should report alert when all groups pass the threshold', async () => {
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
            bucketKey: { groupBy0: 'a' },
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
            bucketKey: { groupBy0: 'b' },
          },
        },
      ]);
      await execute(Comparator.GT, [0.75]);
      testNAlertsReported(2);
      testAlertReported(1, {
        id: alertIdA,
        conditions: [
          { metric: 'test.metric.1', threshold: ['0.75'], value: '1', evaluation_value: 1 },
        ],
        actionGroup: FIRED_ACTIONS.id,
        alertState: 'ALERT',
        reason: 'test.metric.1 is 1 in the last 1 min for a. Alert when > 0.75.',
        tags: [],
        groupByKeys: { something: alertIdA },
      });
      testAlertReported(2, {
        id: alertIdB,
        conditions: [
          { metric: 'test.metric.1', threshold: ['0.75'], value: '1', evaluation_value: 1 },
        ],
        actionGroup: FIRED_ACTIONS.id,
        alertState: 'ALERT',
        reason: 'test.metric.1 is 1 in the last 1 min for b. Alert when > 0.75.',
        tags: [],
        groupByKeys: { something: alertIdB },
      });
    });

    test('should report alert when only some groups pass the threshold', async () => {
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
            bucketKey: { groupBy0: 'a' },
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
            bucketKey: { groupBy0: 'b' },
          },
        },
      ]);
      await execute(Comparator.LT, [1.5]);
      testNAlertsReported(1);
      testAlertReported(1, {
        id: alertIdA,
        conditions: [
          { metric: 'test.metric.1', threshold: ['1.5'], value: '1', evaluation_value: 1 },
        ],
        actionGroup: FIRED_ACTIONS.id,
        alertState: 'ALERT',
        reason: 'test.metric.1 is 1 in the last 1 min for a. Alert when < 1.5.',
        tags: [],
        groupByKeys: { something: alertIdA },
      });
    });

    test('should not report any alerts when no groups pass the threshold', async () => {
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
            bucketKey: { groupBy0: 'a' },
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
            bucketKey: { groupBy0: 'b' },
          },
        },
      ]);
      await execute(Comparator.GT, [5]);
      testNAlertsReported(0);
    });

    test('should persist previous groups that go missing, until the groupBy param changes', async () => {
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
            bucketKey: { groupBy0: 'a' },
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
            bucketKey: { groupBy0: 'b' },
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
            bucketKey: { groupBy0: 'c' },
          },
        },
      ]);
      const { state: stateResult1 } = await execute(
        Comparator.GT,
        [0.75],
        ['something'],
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
            bucketKey: { groupBy0: 'a' },
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
            bucketKey: { groupBy0: 'b' },
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
            bucketKey: { groupBy0: 'c' },
          },
        },
      ]);
      const { state: stateResult2 } = await execute(
        Comparator.GT,
        [0.75],
        ['something'],
        'test.metric.1',
        stateResult1
      );
      expect(stateResult2.missingGroups).toEqual(
        expect.arrayContaining([{ key: 'c', bucketKey: { groupBy0: 'c' } }])
      );
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
            bucketKey: { groupBy0: 'a' },
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
            bucketKey: { groupBy0: 'b' },
          },
        },
      ]);
      const { state: stateResult3 } = await execute(
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
        state: state ?? mockOptions.state,
      });

    test('should persist previous groups that go missing, until the filterQuery param changes', async () => {
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
            bucketKey: { groupBy0: 'a' },
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
            bucketKey: { groupBy0: 'b' },
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
            ...baseNonCountCriterion,
            comparator: Comparator.GT,
            threshold: [0.75],
            metric: 'test.metric.1',
            currentValue: 1.0,
            timestamp: new Date().toISOString(),
            shouldFire: true,
            shouldWarn: false,
            isNoData: false,
            bucketKey: { groupBy0: 'a' },
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
            bucketKey: { groupBy0: 'b' },
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
            ...baseNonCountCriterion,
            comparator: Comparator.GT,
            threshold: [0.75],
            metric: 'test.metric.1',
            currentValue: 1.0,
            timestamp: new Date().toISOString(),
            shouldFire: true,
            shouldWarn: false,
            isNoData: false,
            bucketKey: { groupBy0: 'a' },
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
            bucketKey: { groupBy0: 'b' },
          },
        },
      ]);
      const { state: stateResult3 } = await executeWithFilter(
        Comparator.GT,
        [0.75],
        JSON.stringify({ query: 'different' }),
        'test.metric.1',
        stateResult2
      );
      expect(stateResult3.missingGroups).toEqual(expect.arrayContaining([]));
    });
  });

  describe('querying with a groupBy parameter host.name and rule tags', () => {
    const execute = (
      comparator: Comparator,
      threshold: number[],
      groupBy: string[] = ['host.name'],
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
        state: state ?? mockOptions.state,
        rule: {
          ...mockOptions.rule,
          tags: ['ruleTag1', 'ruleTag2'],
        },
      });
    const alertIdA = 'host-01';
    const alertIdB = 'host-02';

    test('rule tags and source tags are combined in alert context', async () => {
      setEvaluationResults([
        {
          'host-01': {
            ...baseNonCountCriterion,
            comparator: Comparator.GT,
            threshold: [0.75],
            metric: 'test.metric.1',
            currentValue: 1.0,
            timestamp: new Date().toISOString(),
            shouldFire: true,
            shouldWarn: false,
            isNoData: false,
            bucketKey: { groupBy0: 'host-01' },
            context: {
              tags: ['host-01_tag1', 'host-01_tag2'],
            },
          },
          'host-02': {
            ...baseNonCountCriterion,
            comparator: Comparator.GT,
            threshold: [0.75],
            metric: 'test.metric.1',
            currentValue: 3,
            timestamp: new Date().toISOString(),
            shouldFire: true,
            shouldWarn: false,
            isNoData: false,
            bucketKey: { groupBy0: 'host-02' },
            context: {
              tags: ['host-02_tag1', 'host-02_tag2'],
            },
          },
        },
      ]);
      await execute(Comparator.GT, [0.75]);
      testNAlertsReported(2);
      testAlertReported(1, {
        id: alertIdA,
        conditions: [
          { metric: 'test.metric.1', threshold: ['0.75'], value: '1', evaluation_value: 1 },
        ],
        actionGroup: FIRED_ACTIONS.id,
        alertState: 'ALERT',
        reason: 'test.metric.1 is 1 in the last 1 min for host-01. Alert when > 0.75.',
        tags: ['host-01_tag1', 'host-01_tag2', 'ruleTag1', 'ruleTag2'],
        groupByKeys: { host: { name: alertIdA } },
      });
      testAlertReported(2, {
        id: alertIdB,
        conditions: [
          { metric: 'test.metric.1', threshold: ['0.75'], value: '3', evaluation_value: 3 },
        ],
        actionGroup: FIRED_ACTIONS.id,
        alertState: 'ALERT',
        reason: 'test.metric.1 is 3 in the last 1 min for host-02. Alert when > 0.75.',
        tags: ['host-02_tag1', 'host-02_tag2', 'ruleTag1', 'ruleTag2'],
        groupByKeys: { host: { name: alertIdB } },
      });
    });
  });

  describe('querying without a groupBy parameter and rule tags', () => {
    const execute = (
      comparator: Comparator,
      threshold: number[],
      groupBy: string = '',
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
        state: state ?? mockOptions.state,
        rule: {
          ...mockOptions.rule,
          tags: ['ruleTag1', 'ruleTag2'],
        },
      });

    test('rule tags are added in alert context', async () => {
      setEvaluationResults([
        {
          '*': {
            ...baseNonCountCriterion,
            comparator: Comparator.GT,
            threshold: [0.75],
            metric: 'test.metric.1',
            currentValue: 1.0,
            timestamp: new Date().toISOString(),
            shouldFire: true,
            shouldWarn: false,
            isNoData: false,
            bucketKey: { groupBy0: '*' },
          },
        },
      ]);

      const alertID = '*';
      await execute(Comparator.GT, [0.75]);
      testNAlertsReported(1);
      testAlertReported(1, {
        id: alertID,
        conditions: [
          { metric: 'test.metric.1', threshold: ['0.75'], value: '1', evaluation_value: 1 },
        ],
        actionGroup: FIRED_ACTIONS.id,
        alertState: 'ALERT',
        reason: 'test.metric.1 is 1 in the last 1 min. Alert when > 0.75.',
        tags: ['ruleTag1', 'ruleTag2'],
      });
    });
  });

  describe('querying with multiple criteria', () => {
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

    test('should report alert when all criteria cross the threshold', async () => {
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
            bucketKey: { groupBy0: '*' },
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
            bucketKey: { groupBy0: '*' },
          },
        },
      ]);
      const alertID = '*';
      await execute(Comparator.GT_OR_EQ, [1.0], [3.0]);
      testNAlertsReported(1);
      testAlertReported(1, {
        id: alertID,
        conditions: [
          { metric: 'test.metric.1', threshold: ['1'], value: '1', evaluation_value: 1 },
          { metric: 'test.metric.2', threshold: ['3'], value: '3', evaluation_value: 3 },
        ],
        actionGroup: FIRED_ACTIONS.id,
        alertState: 'ALERT',
        reason:
          'test.metric.1 is 1 in the last 1 min. Alert when >= 1.\ntest.metric.2 is 3 in the last 1 min. Alert when >= 3.',
        tags: [],
      });
    });

    test('should not report any alerts when some, but not all, criteria cross the threshold', async () => {
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
            bucketKey: { groupBy0: '*' },
          },
        },
        {},
      ]);
      await execute(Comparator.LT_OR_EQ, [1.0], [2.5]);
      testNAlertsReported(0);
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
            bucketKey: { groupBy0: 'a' },
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
            bucketKey: { groupBy0: 'b' },
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
            bucketKey: { groupBy0: 'a' },
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
            bucketKey: { groupBy0: 'b' },
          },
        },
      ]);
      const alertIdA = 'a';
      await execute(Comparator.GT_OR_EQ, [1.0], [3.0], 'something');
      testNAlertsReported(1);
      testAlertReported(1, {
        id: alertIdA,
        conditions: [
          { metric: 'test.metric.1', threshold: ['1'], value: '1', evaluation_value: 1 },
          { metric: 'test.metric.2', threshold: ['3'], value: '3', evaluation_value: 3 },
        ],
        actionGroup: FIRED_ACTIONS.id,
        alertState: 'ALERT',
        reason:
          'test.metric.1 is 1 in the last 1 min for a. Alert when >= 1.\ntest.metric.2 is 3 in the last 1 min for a. Alert when >= 3.',
        tags: [],
        groupByKeys: { something: alertIdA },
      });
    });
  });

  describe('querying with the count aggregator', () => {
    const alertID = '*';
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
            bucketKey: { groupBy0: 'a' },
          },
        },
      ]);
      await execute(Comparator.GT, [0.9]);
      testNAlertsReported(1);
      testAlertReported(1, {
        id: alertID,
        conditions: [{ metric: 'count', threshold: ['0.9'], value: '1', evaluation_value: 1 }],
        actionGroup: FIRED_ACTIONS.id,
        alertState: 'ALERT',
        reason: 'count is 1 in the last 1 min. Alert when > 0.9.',
        tags: [],
      });

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
            bucketKey: { groupBy0: 'a' },
          },
        },
      ]);
      await execute(Comparator.LT, [0.5]);
      // should still have only been called once
      testNAlertsReported(1);
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
          state: state ?? mockOptions.state,
        });
      const alertIdA = 'a';
      const alertIdB = 'b';

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
              bucketKey: { groupBy0: 'a' },
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
              bucketKey: { groupBy0: 'b' },
            },
          },
        ]);
        const resultState = await executeGroupBy(Comparator.LT_OR_EQ, [0]);
        testNAlertsReported(0);
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
              bucketKey: { groupBy0: 'a' },
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
              bucketKey: { groupBy0: 'b' },
            },
          },
        ]);
        await executeGroupBy(Comparator.LT_OR_EQ, [0], 'empty-response', resultState);
        testNAlertsReported(2);
        testAlertReported(1, {
          id: alertIdA,
          conditions: [{ metric: 'count', threshold: ['0'], value: '0', evaluation_value: 0 }],
          actionGroup: FIRED_ACTIONS.id,
          alertState: 'ALERT',
          reason: 'count is 0 in the last 1 min for a. Alert when <= 0.',
          tags: [],
          groupByKeys: { something: alertIdA },
        });
        testAlertReported(2, {
          id: alertIdB,
          conditions: [{ metric: 'count', threshold: ['0'], value: '0', evaluation_value: 0 }],
          actionGroup: FIRED_ACTIONS.id,
          alertState: 'ALERT',
          reason: 'count is 0 in the last 1 min for b. Alert when <= 0.',
          tags: [],
          groupByKeys: { something: alertIdB },
        });
      });
    });
  });
  describe('querying with the p99 aggregator', () => {
    const alertID = '*';
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
            bucketKey: { groupBy0: '*' },
          },
        },
      ]);
      await execute(Comparator.GT, [1]);
      testNAlertsReported(1);
      testAlertReported(1, {
        id: alertID,
        conditions: [
          { metric: 'test.metric.2', threshold: ['1'], value: '3', evaluation_value: 3 },
        ],
        actionGroup: FIRED_ACTIONS.id,
        alertState: 'ALERT',
        reason: 'test.metric.2 is 3 in the last 1 min. Alert when > 1.',
        tags: [],
      });

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
            bucketKey: { groupBy0: '*' },
          },
        },
      ]);
      await execute(Comparator.LT, [1]);
      // should still only have been called once
      testNAlertsReported(1);
    });
  });

  describe('querying with the p95 aggregator', () => {
    const alertID = '*';
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
            bucketKey: { groupBy0: '*' },
          },
        },
      ]);
      await execute(Comparator.GT, [0.25]);
      testNAlertsReported(1);
      testAlertReported(1, {
        id: alertID,
        conditions: [
          { metric: 'test.metric.1', threshold: ['0.25'], value: '1', evaluation_value: 1 },
        ],
        actionGroup: FIRED_ACTIONS.id,
        alertState: 'ALERT',
        reason: 'test.metric.1 is 1 in the last 1 min. Alert when > 0.25.',
        tags: [],
      });

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
            bucketKey: { groupBy0: '*' },
          },
        },
      ]);
      await execute(Comparator.LT, [0.95]);
      // should still only have been called once
      testNAlertsReported(1);
    });
  });

  describe("querying a metric that hasn't reported data", () => {
    const alertID = '*';
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
            bucketKey: { groupBy0: '*' },
          },
        },
      ]);
      await execute(true);
      testNAlertsReported(1);
      testAlertReported(1, {
        id: alertID,
        conditions: [
          { metric: 'test.metric.3', threshold: ['1'], value: '[NO DATA]', evaluation_value: null },
        ],
        actionGroup: NO_DATA_ACTIONS.id,
        alertState: 'NO DATA',
        reason: 'test.metric.3 reported no data in the last 1m',
        tags: [],
      });
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
            bucketKey: { groupBy0: '*' },
          },
        },
      ]);
      await execute(false);
      testNAlertsReported(0);
    });
  });

  describe('alerts with NO_DATA where one condition is an aggregation and the other is a document count', () => {
    const alertID = '*';
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
            {
              ...baseCountCriterion,
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
            ...baseNonCountCriterion,
            comparator: Comparator.LT,
            threshold: [1],
            metric: 'test.metric.3',
            currentValue: null,
            timestamp: mockNow.toISOString(),
            shouldFire: false,
            shouldWarn: false,
            isNoData: true,
            bucketKey: { groupBy0: '*' },
          },
        },
        {},
      ]);
      await execute(true);
      testNAlertsReported(1);
      testAlertReported(1, {
        id: alertID,
        conditions: [
          { metric: 'test.metric.3', threshold: ['1'], value: '[NO DATA]', evaluation_value: null },
          { metric: 'count', threshold: [30], value: 0 },
        ],
        actionGroup: NO_DATA_ACTIONS.id,
        alertState: 'NO DATA',
        reason: 'test.metric.3 reported no data in the last 1m',
        tags: [],
      });
    });
  });

  describe('querying a groupBy alert that starts reporting no data, and then later reports data', () => {
    const alertID = '*';
    const alertIdA = 'a';
    const alertIdB = 'b';
    const alertIdC = 'c';
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
        state: state ?? mockOptions.state,
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
            bucketKey: { groupBy0: '*' },
          },
        },
      ]);
      let resultState = await executeEmptyResponse();
      testNAlertsReported(1);
      testAlertReported(1, {
        id: alertID,
        conditions: [
          { metric: 'test.metric.3', threshold: ['0'], value: '[NO DATA]', evaluation_value: null },
        ],
        actionGroup: NO_DATA_ACTIONS.id,
        alertState: 'NO DATA',
        reason: 'test.metric.3 reported no data in the last 1m',
        tags: [],
        groupByKeys: { something: alertID },
      });

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
            bucketKey: { groupBy0: '*' },
          },
        },
      ]);
      resultState = await executeEmptyResponse(true, resultState);
      testNAlertsReported(2);
      testAlertReported(2, {
        id: alertID,
        conditions: [
          { metric: 'test.metric.3', threshold: ['0'], value: '[NO DATA]', evaluation_value: null },
        ],
        actionGroup: NO_DATA_ACTIONS.id,
        alertState: 'NO DATA',
        reason: 'test.metric.3 reported no data in the last 1m',
        tags: [],
        groupByKeys: { something: alertID },
      });

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
            bucketKey: { groupBy0: 'a' },
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
            bucketKey: { groupBy0: 'b' },
          },
        },
      ]);
      resultState = await execute2GroupsABResponse(true, resultState);
      testNAlertsReported(4);
      testAlertReported(3, {
        id: alertIdA,
        conditions: [
          { metric: 'test.metric.1', threshold: ['0'], value: '1', evaluation_value: 1 },
        ],
        actionGroup: FIRED_ACTIONS.id,
        alertState: 'ALERT',
        reason: 'test.metric.1 is 1 in the last 1 min for a. Alert when > 0.',
        tags: [],
        groupByKeys: { something: alertIdA },
      });
      testAlertReported(4, {
        id: alertIdB,
        conditions: [
          { metric: 'test.metric.1', threshold: ['0'], value: '3', evaluation_value: 3 },
        ],
        actionGroup: FIRED_ACTIONS.id,
        alertState: 'ALERT',
        reason: 'test.metric.1 is 3 in the last 1 min for b. Alert when > 0.',
        tags: [],
        groupByKeys: { something: alertIdB },
      });

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
            bucketKey: { groupBy0: 'a' },
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
            bucketKey: { groupBy0: 'b' },
          },
        },
      ]);
      await executeEmptyResponse(true, resultState);
      testNAlertsReported(2);
      testAlertReported(1, {
        id: alertIdA,
        conditions: [
          { metric: 'test.metric.3', threshold: ['0'], value: '[NO DATA]', evaluation_value: null },
        ],
        actionGroup: NO_DATA_ACTIONS.id,
        alertState: 'NO DATA',
        reason: 'test.metric.3 reported no data in the last 1m for a',
        tags: [],
        groupByKeys: { something: alertIdA },
      });
      testAlertReported(2, {
        id: alertIdB,
        conditions: [
          { metric: 'test.metric.3', threshold: ['0'], value: '[NO DATA]', evaluation_value: null },
        ],
        actionGroup: NO_DATA_ACTIONS.id,
        alertState: 'NO DATA',
        reason: 'test.metric.3 reported no data in the last 1m for b',
        tags: [],
        groupByKeys: { something: alertIdB },
      });
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
            bucketKey: { groupBy0: 'a' },
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
            bucketKey: { groupBy0: 'b' },
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
            bucketKey: { groupBy0: 'c' },
          },
        },
      ]);
      const resultState = await execute3GroupsABCResponse(false);
      testNAlertsReported(3);
      testAlertReported(1, {
        id: alertIdA,
        conditions: [
          { metric: 'test.metric.2', threshold: ['0'], value: '3', evaluation_value: 3 },
        ],
        actionGroup: FIRED_ACTIONS.id,
        alertState: 'ALERT',
        reason: 'test.metric.2 is 3 in the last 1 min for a. Alert when > 0.',
        tags: [],
        groupByKeys: { something: alertIdA },
      });
      testAlertReported(2, {
        id: alertIdB,
        conditions: [
          { metric: 'test.metric.2', threshold: ['0'], value: '1', evaluation_value: 1 },
        ],
        actionGroup: FIRED_ACTIONS.id,
        alertState: 'ALERT',
        reason: 'test.metric.2 is 1 in the last 1 min for b. Alert when > 0.',
        tags: [],
        groupByKeys: { something: alertIdB },
      });
      testAlertReported(3, {
        id: alertIdC,
        conditions: [
          { metric: 'test.metric.2', threshold: ['0'], value: '3', evaluation_value: 3 },
        ],
        actionGroup: FIRED_ACTIONS.id,
        alertState: 'ALERT',
        reason: 'test.metric.2 is 3 in the last 1 min for c. Alert when > 0.',
        tags: [],
        groupByKeys: { something: alertIdC },
      });

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
            bucketKey: { groupBy0: 'a' },
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
            bucketKey: { groupBy0: 'b' },
          },
        },
      ]);
      await execute2GroupsABResponse(false, resultState);
      testNAlertsReported(5);
      testAlertReported(4, {
        id: alertIdA,
        conditions: [
          { metric: 'test.metric.1', threshold: ['0'], value: '1', evaluation_value: 1 },
        ],
        actionGroup: FIRED_ACTIONS.id,
        alertState: 'ALERT',
        reason: 'test.metric.1 is 1 in the last 1 min for a. Alert when > 0.',
        tags: [],
        groupByKeys: { something: alertIdA },
      });
      testAlertReported(5, {
        id: alertIdB,
        conditions: [
          { metric: 'test.metric.1', threshold: ['0'], value: '3', evaluation_value: 3 },
        ],
        actionGroup: FIRED_ACTIONS.id,
        alertState: 'ALERT',
        reason: 'test.metric.1 is 3 in the last 1 min for b. Alert when > 0.',
        tags: [],
        groupByKeys: { something: alertIdB },
      });
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
          state: state ?? mockOptions.state,
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
              bucketKey: { groupBy0: '*' },
            },
          },
        ]);
        let resultState = await executeWeirdEmptyResponse();
        testNAlertsReported(0);
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
              bucketKey: { groupBy0: '*' },
            },
          },
        ]);
        resultState = await executeWeirdEmptyResponse(resultState);
        testNAlertsReported(0);
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
              bucketKey: { groupBy0: 'a' },
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
              bucketKey: { groupBy0: 'b' },
            },
          },
        ]);
        resultState = await executeWeird2GroupsABResponse(resultState);
        testNAlertsReported(2);
        testAlertReported(1, {
          id: alertIdA,
          conditions: [
            { metric: 'test.metric.1', threshold: ['0'], value: '1', evaluation_value: 1 },
          ],
          actionGroup: FIRED_ACTIONS.id,
          alertState: 'ALERT',
          reason: 'test.metric.1 is 1 in the last 1 min for a. Alert when > 0.',
          tags: [],
          groupByKeys: { something: alertIdA },
        });
        testAlertReported(2, {
          id: alertIdB,
          conditions: [
            { metric: 'test.metric.1', threshold: ['0'], value: '3', evaluation_value: 3 },
          ],
          actionGroup: FIRED_ACTIONS.id,
          alertState: 'ALERT',
          reason: 'test.metric.1 is 3 in the last 1 min for b. Alert when > 0.',
          tags: [],
          groupByKeys: { something: alertIdB },
        });

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
              bucketKey: { groupBy0: 'a' },
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
              bucketKey: { groupBy0: 'b' },
            },
          },
        ]);
        await executeWeirdEmptyResponse(resultState);
        testNAlertsReported(2);
        testAlertReported(1, {
          id: alertIdA,
          conditions: [
            {
              metric: 'test.metric.3',
              threshold: ['0'],
              value: '[NO DATA]',
              evaluation_value: null,
            },
          ],
          actionGroup: NO_DATA_ACTIONS.id,
          alertState: 'NO DATA',
          reason: 'test.metric.3 reported no data in the last 1m for a',
          tags: [],
          groupByKeys: { something: alertIdA },
        });
        testAlertReported(2, {
          id: alertIdB,
          conditions: [
            {
              metric: 'test.metric.3',
              threshold: ['0'],
              value: '[NO DATA]',
              evaluation_value: null,
            },
          ],
          actionGroup: NO_DATA_ACTIONS.id,
          alertState: 'NO DATA',
          reason: 'test.metric.3 reported no data in the last 1m for b',
          tags: [],
          groupByKeys: { something: alertIdB },
        });
      });
    });
  });

  describe('attempting to use a malformed filterQuery', () => {
    const alertID = '*';
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
      testNAlertsReported(1);
      testAlertReported(1, {
        id: alertID,
        conditions: [
          { metric: 'test.metric.1', threshold: ['0'], value: '3', evaluation_value: 3 },
        ],
        actionGroup: FIRED_ACTIONS.id,
        alertState: 'ERROR',
        reason:
          'Alert is using a malformed KQL query: host.name:(look.there.is.no.space.after.these.parentheses)and uh.oh: "wow that is bad"',
      });
    });
  });

  describe('querying the entire infrastructure with warning threshold', () => {
    const alertID = '*';

    const execute = () =>
      executor({
        ...mockOptions,
        services,
        params: {
          sourceId: 'default',
          criteria: [
            {
              ...baseNonCountCriterion,
              comparator: Comparator.GT,
              threshold: [9999],
            },
          ],
        },
      });

    const setResults = ({
      comparator = Comparator.GT,
      threshold = [9999],
      warningComparator = Comparator.GT,
      warningThreshold = [2.49],
      metric = 'test.metric.1',
      currentValue = 7.59,
      shouldWarn = false,
    }) =>
      setEvaluationResults([
        {
          '*': {
            ...baseNonCountCriterion,
            comparator,
            threshold,
            warningComparator,
            warningThreshold,
            metric,
            currentValue,
            timestamp: new Date().toISOString(),
            shouldFire: false,
            shouldWarn,
            isNoData: false,
            bucketKey: { groupBy0: '*' },
          },
        },
      ]);

    test('warns as expected with the > comparator', async () => {
      setResults({ warningThreshold: [2.49], currentValue: 2.5, shouldWarn: true });
      await execute();
      testNAlertsReported(1);
      testAlertReported(1, {
        id: alertID,
        conditions: [
          { metric: 'test.metric.1', threshold: ['9,999'], value: '2.5', evaluation_value: 2.5 },
        ],
        actionGroup: WARNING_ACTIONS.id,
        alertState: 'WARNING',
        reason: 'test.metric.1 is 2.5 in the last 1 min. Alert when > 2.49.',
        tags: [],
      });

      setResults({ warningThreshold: [2.49], currentValue: 1.23, shouldWarn: false });
      await execute();
      // should not have been called again
      testNAlertsReported(1);
    });

    test('reports expected warning values to the action context for percentage metric', async () => {
      setResults({
        warningThreshold: [0.81],
        currentValue: 0.82,
        shouldWarn: true,
        metric: 'system.cpu.user.pct',
      });
      await execute();

      testNAlertsReported(1);
      testAlertReported(1, {
        id: alertID,
        conditions: [
          {
            metric: 'test.metric.1',
            threshold: ['999,900%'],
            value: '82%',
            evaluation_value: 0.82,
          },
        ],
        actionGroup: WARNING_ACTIONS.id,
        alertState: 'WARNING',
        reason: 'system.cpu.user.pct is 82% in the last 1 min. Alert when > 81%.',
        tags: [],
      });
    });
  });

  function testNAlertsReported(n: number) {
    expect(services.alertsClient.report).toHaveBeenCalledTimes(n);
    expect(services.alertsClient.setAlertData).toHaveBeenCalledTimes(n);
  }

  function testAlertReported(
    index: number,
    {
      id,
      actionGroup,
      alertState,
      groupByKeys,
      conditions,
      reason,
      tags,
    }: {
      id: string;
      actionGroup: string;
      alertState: string;
      groupByKeys?: any;
      conditions: Array<{
        metric: string;
        threshold: Array<number | string>;
        value: string | number;
        evaluation_value?: number | null;
      }>;
      reason: string;
      tags?: string[];
    }
  ) {
    expect(services.alertsClient.report).toHaveBeenNthCalledWith(index, {
      id,
      actionGroup,
    });
    expect(services.alertsClient.setAlertData).toHaveBeenNthCalledWith(index, {
      context: {
        alertDetailsUrl: '',
        alertState,
        group: id,
        reason,
        timestamp: mockNow.toISOString(),
        viewInAppUrl: 'http://localhost:5601/app/metrics/explorer',

        metric: conditions.reduce((acc, curr, ndx) => {
          set(acc, `condition${ndx}`, curr.metric);
          return acc;
        }, {}),

        value:
          alertState !== 'ERROR'
            ? conditions.reduce((acc, curr, ndx) => {
                set(acc, `condition${ndx}`, curr.value);
                return acc;
              }, {})
            : null,

        ...(groupByKeys ? { groupByKeys } : {}),

        ...(tags ? { tags } : {}),
        ...(alertState !== 'ERROR'
          ? {
              threshold: conditions.reduce((acc, curr, ndx) => {
                set(acc, `condition${ndx}`, curr.threshold);
                return acc;
              }, {}),
            }
          : {}),
      },
      id,
      payload: {
        ...(alertState !== 'ERROR'
          ? {
              [ALERT_EVALUATION_VALUES]: conditions.map((c) => c.evaluation_value),
            }
          : {}),
        [ALERT_REASON]: reason,
        ...(tags ? { tags } : {}),
      },
    });
  }
});

const createMockStaticConfiguration = (sources: any): InfraConfig => ({
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
  featureFlags: {
    customThresholdAlertsEnabled: false,
    logsUIEnabled: true,
    metricsExplorerEnabled: true,
    osqueryEnabled: true,
    inventoryThresholdAlertRuleEnabled: true,
    metricThresholdAlertRuleEnabled: true,
    logThresholdAlertRuleEnabled: true,
    alertsAndRulesDropdownEnabled: true,
  },
  enabled: true,
  sources,
});

const mockLibs: any = {
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
  configuration: createMockStaticConfiguration({}),
  basePath: {
    publicBaseUrl: 'http://localhost:5601',
    prepend: (path: string) => path,
  },
  logger,
};

const executor = createMetricThresholdExecutor(mockLibs);

const services = alertsMock.createRuleExecutorServices();
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

const baseNonCountCriterion = {
  aggType: Aggregators.AVERAGE,
  metric: 'test.metric.1',
  timeSize: 1,
  timeUnit: 'm',
  threshold: [0],
  comparator: Comparator.GT,
} as NonCountMetricExpressionParams;

const baseCountCriterion = {
  aggType: Aggregators.COUNT,
  timeSize: 1,
  timeUnit: 'm',
  threshold: [0],
  comparator: Comparator.GT,
} as CountMetricExpressionParams;
