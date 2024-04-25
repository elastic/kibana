/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RuleExecutorServicesMock, alertsMock } from '@kbn/alerting-plugin/server/mocks';
import { searchSourceCommonMock } from '@kbn/data-plugin/common/search/search_source/mocks';
import type { ISearchSource } from '@kbn/data-plugin/common';
import { createCustomThresholdExecutor } from './custom_threshold_executor';
import { FIRED_ACTION, NO_DATA_ACTION } from './constants';
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
  startedAtOverridden: false,
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
  return jest.requireMock('./lib/evaluate_rule').evaluateRule.mockImplementation(() => response);
};

const mockLibs: any = {
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
let services: RuleExecutorServicesMock;

interface ReportedAlert {
  id: string;
  actionGroup: string;
  payload: object;
  context?: {
    group: string;
    reason: string;
    tags: string[];
  };
}

const alerts = new Map<string, ReportedAlert[]>();

const setup = () => {
  const alertsServices = alertsMock.createRuleExecutorServices();

  services = {
    ...alertsServices,
    searchSourceClient: {
      ...searchSourceCommonMock,
      create: jest.fn(() => Promise.resolve(mockedSearchSource)),
    },
  };

  services.alertsClient.report.mockImplementation((params: any) => {
    alerts.set(params.id, [
      {
        id: params.id,
        actionGroup: params.actionGroup,
        payload: params.payload,
      },
    ]);

    return {
      uuid: `uuid-${params.id}`,
      start: new Date().toISOString(),
      alertDoc: {},
    };
  });

  services.alertsClient.setAlertData.mockImplementation((params: any) => {
    const alertsList = alerts.get(params.id);
    if (alertsList && alertsList.length > 0) {
      const lastAlert = alertsList[alertsList.length - 1];
      lastAlert.context = params.context;
    }
  });

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
};

describe('The custom threshold alert type', () => {
  setup();

  describe('querying the entire infrastructure', () => {
    beforeEach(() => jest.clearAllMocks());
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
      expect(getLastReportedAlert(instanceID)).toHaveAlertAction();
      setResults(Comparator.GT, [1.5], false);
      await execute(Comparator.GT, [1.5]);
      expect(getLastReportedAlert(instanceID)).toBe(undefined);
    });
    test('alerts as expected with the < comparator', async () => {
      setResults(Comparator.LT, [1.5], true);
      await execute(Comparator.LT, [1.5]);
      expect(getLastReportedAlert(instanceID)).toHaveAlertAction();
      setResults(Comparator.LT, [0.75], false);
      await execute(Comparator.LT, [0.75]);
      expect(getLastReportedAlert(instanceID)).toBe(undefined);
    });
    test('alerts as expected with the >= comparator', async () => {
      setResults(Comparator.GT_OR_EQ, [0.75], true);
      await execute(Comparator.GT_OR_EQ, [0.75]);
      expect(getLastReportedAlert(instanceID)).toHaveAlertAction();
      setResults(Comparator.GT_OR_EQ, [1.0], true);
      await execute(Comparator.GT_OR_EQ, [1.0]);
      expect(getLastReportedAlert(instanceID)).toHaveAlertAction();
      setResults(Comparator.GT_OR_EQ, [1.5], false);
      await execute(Comparator.GT_OR_EQ, [1.5]);
      expect(getLastReportedAlert(instanceID)).toBe(undefined);
    });
    test('alerts as expected with the <= comparator', async () => {
      setResults(Comparator.LT_OR_EQ, [1.5], true);
      await execute(Comparator.LT_OR_EQ, [1.5]);
      expect(getLastReportedAlert(instanceID)).toHaveAlertAction();
      setResults(Comparator.LT_OR_EQ, [1.0], true);
      await execute(Comparator.LT_OR_EQ, [1.0]);
      expect(getLastReportedAlert(instanceID)).toHaveAlertAction();
      setResults(Comparator.LT_OR_EQ, [0.75], false);
      await execute(Comparator.LT_OR_EQ, [0.75]);
      expect(getLastReportedAlert(instanceID)).toBe(undefined);
    });
    test('alerts as expected with the between comparator', async () => {
      setResults(Comparator.BETWEEN, [0, 1.5], true);
      await execute(Comparator.BETWEEN, [0, 1.5]);
      expect(getLastReportedAlert(instanceID)).toHaveAlertAction();
      setResults(Comparator.BETWEEN, [0, 0.75], false);
      await execute(Comparator.BETWEEN, [0, 0.75]);
      expect(getLastReportedAlert(instanceID)).toBe(undefined);
    });
    test('alerts as expected with the outside range comparator', async () => {
      setResults(Comparator.OUTSIDE_RANGE, [0, 0.75], true);
      await execute(Comparator.OUTSIDE_RANGE, [0, 0.75]);
      expect(getLastReportedAlert(instanceID)).toHaveAlertAction();
      setResults(Comparator.OUTSIDE_RANGE, [0, 1.5], false);
      await execute(Comparator.OUTSIDE_RANGE, [0, 1.5]);
      expect(getLastReportedAlert(instanceID)).toBe(undefined);
    });
    test('reports expected values to the action context', async () => {
      setResults(Comparator.GT, [0.75], true);
      await execute(Comparator.GT, [0.75]);
      const reportedAlert = getLastReportedAlert(instanceID);
      expect(reportedAlert?.context?.group).toBeUndefined();
      expect(reportedAlert?.context?.reason).toBe(
        'Average test.metric.1 is 1, above the threshold of 0.75. (duration: 1 min, data view: mockedDataViewName)'
      );
    });
  });

  describe('querying with a groupBy parameter', () => {
    beforeEach(() => jest.clearAllMocks());
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
      expect(getLastReportedAlert(instanceIdA)).toHaveAlertAction();
      expect(getLastReportedAlert(instanceIdB)).toHaveAlertAction();
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
      expect(getLastReportedAlert(instanceIdA)).toHaveAlertAction();
      expect(getLastReportedAlert(instanceIdB)).toBe(undefined);
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
      expect(getLastReportedAlert(instanceIdA)).toBe(undefined);
      expect(getLastReportedAlert(instanceIdB)).toBe(undefined);
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
      expect(getLastReportedAlert(instanceIdA)?.context?.group).toEqual([
        { field: 'groupByField', value: 'a' },
      ]);
      expect(getLastReportedAlert(instanceIdB)?.context?.group).toEqual([
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
      expect(stateResult3.missingGroups).toEqual(expect.arrayContaining([]));
    });
    test('should remove a group from previous missing groups if the related alert is untracked', async () => {
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
            currentValue: null,
            timestamp: new Date().toISOString(),
            shouldFire: true,
            isNoData: true,
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
        expect.arrayContaining([
          { key: 'b', bucketKey: { groupBy0: 'b' } },
          { key: 'c', bucketKey: { groupBy0: 'c' } },
        ])
      );
      const mockedEvaluateRule = setEvaluationResults([
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
            currentValue: null,
            timestamp: new Date().toISOString(),
            shouldFire: true,
            isNoData: true,
            bucketKey: { groupBy0: 'b' },
          },
        },
      ]);
      // Consider c as untracked
      services.alertsClient.isTrackedAlert.mockImplementation((id: string) => id !== 'c');
      const { state: stateResult3 } = await executeWithFilter(
        Comparator.GT,
        [0.75],
        JSON.stringify({ query: 'q' }),
        'test.metric.1',
        stateResult2
      );
      expect(stateResult3.missingGroups).toEqual([{ key: 'b', bucketKey: { groupBy0: 'b' } }]);
      expect(mockedEvaluateRule.mock.calls[2][9]).toEqual([
        { bucketKey: { groupBy0: 'b' }, key: 'b' },
      ]);
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
      expect(getLastReportedAlert(instanceIdA)?.context?.tags).toStrictEqual([
        'host-01_tag1',
        'host-01_tag2',
        'ruleTag1',
        'ruleTag2',
      ]);
      expect(getLastReportedAlert(instanceIdB)?.context?.tags).toStrictEqual([
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
      expect(getLastReportedAlert(instanceID)?.context?.tags).toStrictEqual([
        'ruleTag1',
        'ruleTag2',
      ]);
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
      expect(getLastReportedAlert(instanceID)).toHaveAlertAction();
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
      expect(getLastReportedAlert(instanceID)).toBe(undefined);
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
      expect(getLastReportedAlert(instanceIdA)).toHaveAlertAction();
      expect(getLastReportedAlert(instanceIdB)).toBe(undefined);
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
      const reportedAlert = getLastReportedAlert(instanceID);
      const reasons = reportedAlert?.context?.reason;
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
      expect(getLastReportedAlert(instanceID)).toHaveAlertAction();
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
      expect(getLastReportedAlert(instanceID)).toBe(undefined);
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
        expect(getLastReportedAlert(instanceIdA)).toBe(undefined);
        expect(getLastReportedAlert(instanceIdB)).toBe(undefined);
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
        expect(getLastReportedAlert(instanceIdA)).toHaveAlertAction();
        expect(getLastReportedAlert(instanceIdB)).toHaveAlertAction();
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
        logsExplorerLocator: undefined,
        metrics: customThresholdCountCriterion.metrics,
        startedAt: expect.stringMatching(ISO_DATE_REGEX),
        searchConfiguration: {
          index: {},
          query: {
            query: mockQuery,
            language: 'kuery',
          },
        },
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
      const reportedAlert = getLastReportedAlert(instanceID);
      expect(reportedAlert?.context?.reason).toEqual(
        'Average test.metric.3 reported no data in the last 1m'
      );
      expect(reportedAlert).toHaveNoDataAction();
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
      expect(getLastReportedAlert(instanceID)).toBe(undefined);
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
      const recentAlert = getLastReportedAlert(instanceID);
      expect(recentAlert?.context).toEqual({
        alertDetailsUrl: 'http://localhost:5601/app/observability/alerts/uuid-*',
        reason: 'Average test.metric.3 reported no data in the last 1m',
        timestamp: STARTED_AT_MOCK_DATE.toISOString(),
        value: ['[NO DATA]', null],
        tags: [],
        viewInAppUrl: 'mockedViewInApp',
      });
      expect(recentAlert).toHaveNoDataAction();
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
      expect(getLastReportedAlert(instanceID)).toHaveNoDataAction();
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
      expect(getLastReportedAlert(instanceID)).toHaveNoDataAction();
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
      expect(getLastReportedAlert(instanceID)).toBe(undefined);
      expect(getLastReportedAlert(instanceIdA)).toHaveAlertAction();
      expect(getLastReportedAlert(instanceIdB)).toHaveAlertAction();
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
      expect(getLastReportedAlert(instanceID)).toBe(undefined);
      expect(getLastReportedAlert(instanceIdA)).toHaveNoDataAction();
      expect(getLastReportedAlert(instanceIdB)).toHaveNoDataAction();
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
      expect(getLastReportedAlert(instanceID)).toBe(undefined);
      expect(getLastReportedAlert(instanceIdA)).toHaveAlertAction();
      expect(getLastReportedAlert(instanceIdB)).toHaveAlertAction();
      expect(getLastReportedAlert(instanceIdC)).toHaveAlertAction();
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
      expect(getLastReportedAlert(instanceID)).toBe(undefined);
      expect(getLastReportedAlert(instanceIdA)).toHaveAlertAction();
      expect(getLastReportedAlert(instanceIdB)).toHaveAlertAction();
      expect(getLastReportedAlert(instanceIdC)).toBe(undefined);
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
        expect(getLastReportedAlert(instanceID)).toBe(undefined);
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
        expect(getLastReportedAlert(instanceID)).toBe(undefined);
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
        expect(getLastReportedAlert(instanceID)).toBe(undefined);
        expect(getLastReportedAlert(instanceIdA)).toHaveAlertAction();
        expect(getLastReportedAlert(instanceIdB)).toHaveAlertAction();
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
        expect(getLastReportedAlert(instanceID)).toBe(undefined);
        expect(getLastReportedAlert(instanceIdA)).toHaveNoDataAction();
        expect(getLastReportedAlert(instanceIdB)).toHaveNoDataAction();
      });
    });
  });
});

function getLastReportedAlert(id: string): ReportedAlert | undefined {
  const alert = alerts.get(id);
  if (!alert) return undefined;
  return alert.pop();
}

function clearInstances() {
  alerts.clear();
}

interface Action {
  actionGroup: string;
  context: {
    alertDetailsUrl: string;
    reason: string;
    timestamp: string;
  };
}

expect.extend({
  toHaveAlertAction(action?: Action) {
    const pass =
      action?.actionGroup === FIRED_ACTION.id && !action?.context?.reason?.includes('no data');
    const message = () => `expected ${action} to be an ALERT action`;
    return {
      message,
      pass,
    };
  },
  toHaveNoDataAction(action?: Action) {
    const pass =
      action?.actionGroup === NO_DATA_ACTION.id && action?.context?.reason?.includes('no data');
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
      toHaveAlertAction(action?: Action): R;
      toHaveNoDataAction(action?: Action): R;
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
