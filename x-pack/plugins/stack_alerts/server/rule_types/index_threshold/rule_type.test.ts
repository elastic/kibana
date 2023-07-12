/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import sinon from 'sinon';
import type { Writable } from '@kbn/utility-types';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import { RuleExecutorServices } from '@kbn/alerting-plugin/server';
import { getRuleType, ActionGroupId } from './rule_type';
import { ActionContext } from './action_context';
import { Params } from './rule_type_params';
import { TIME_SERIES_BUCKET_SELECTOR_FIELD } from '@kbn/triggers-actions-ui-plugin/server';
import { RuleExecutorServicesMock, alertsMock } from '@kbn/alerting-plugin/server/mocks';
import { Comparator } from '../../../common/comparator_types';
import { DEFAULT_FLAPPING_SETTINGS } from '@kbn/alerting-plugin/common/rules_settings';

let fakeTimer: sinon.SinonFakeTimers;

describe('ruleType', () => {
  const logger = loggingSystemMock.create().get();
  const data = {
    timeSeriesQuery: jest.fn(),
  };
  const alertServices: RuleExecutorServicesMock = alertsMock.createRuleExecutorServices();

  const ruleType = getRuleType(Promise.resolve(data));

  beforeAll(() => {
    fakeTimer = sinon.useFakeTimers();
  });

  afterEach(() => {
    data.timeSeriesQuery.mockReset();
  });

  afterAll(() => fakeTimer.restore());

  it('rule type creation structure is the expected value', async () => {
    expect(ruleType.id).toBe('.index-threshold');
    expect(ruleType.name).toBe('Index threshold');
    expect(ruleType.actionGroups).toEqual([{ id: 'threshold met', name: 'Threshold met' }]);

    expect(ruleType.actionVariables).toMatchInlineSnapshot(`
      Object {
        "context": Array [
          Object {
            "description": "A pre-constructed message for the alert.",
            "name": "message",
          },
          Object {
            "description": "A pre-constructed title for the alert.",
            "name": "title",
          },
          Object {
            "description": "The group that exceeded the threshold.",
            "name": "group",
          },
          Object {
            "description": "The date the alert exceeded the threshold.",
            "name": "date",
          },
          Object {
            "description": "The value that exceeded the threshold.",
            "name": "value",
          },
          Object {
            "description": "A string describing the threshold comparator and threshold.",
            "name": "conditions",
          },
        ],
        "params": Array [
          Object {
            "description": "An array of values to use as the threshold; 'between' and 'notBetween' require two values, the others require one.",
            "name": "threshold",
          },
          Object {
            "description": "A comparison function to use to determine if the threshold as been met.",
            "name": "thresholdComparator",
          },
          Object {
            "description": "The index label.",
            "name": "index",
          },
          Object {
            "description": "The time field label.",
            "name": "timeField",
          },
          Object {
            "description": "The agg type label.",
            "name": "aggType",
          },
          Object {
            "description": "The agg field label.",
            "name": "aggField",
          },
          Object {
            "description": "The groupBy label.",
            "name": "groupBy",
          },
          Object {
            "description": "The term field label.",
            "name": "termField",
          },
          Object {
            "description": "The filter kuery label.",
            "name": "filterKuery",
          },
          Object {
            "description": "The term size label.",
            "name": "termSize",
          },
          Object {
            "description": "The time window size label.",
            "name": "timeWindowSize",
          },
          Object {
            "description": "The time window unit label.",
            "name": "timeWindowUnit",
          },
        ],
      }
    `);
  });

  it('validator succeeds with valid params', async () => {
    const params: Partial<Writable<Params>> = {
      index: 'index-name',
      timeField: 'time-field',
      aggType: 'count',
      groupBy: 'all',
      timeWindowSize: 5,
      timeWindowUnit: 'm',
      thresholdComparator: Comparator.LT,
      threshold: [0],
    };

    expect(ruleType.validate.params.validate(params)).toBeTruthy();
  });

  it('validator fails with invalid params', async () => {
    const paramsSchema = ruleType.validate.params;
    if (!paramsSchema) throw new Error('params validator not set');

    const params: Partial<Writable<Params>> = {
      index: 'index-name',
      timeField: 'time-field',
      aggType: 'foo',
      groupBy: 'all',
      timeWindowSize: 5,
      timeWindowUnit: 'm',
      thresholdComparator: Comparator.GT,
      threshold: [0],
    };

    expect(() => paramsSchema.validate(params)).toThrowErrorMatchingInlineSnapshot(
      `"[aggType]: invalid aggType: \\"foo\\""`
    );
  });

  it('should ensure 0 results fires actions if it passes the comparator check', async () => {
    data.timeSeriesQuery.mockImplementation((...args) => {
      return {
        results: [
          {
            group: 'all documents',
            metrics: [['2021-07-14T14:49:30.978Z', 0]],
          },
        ],
      };
    });
    const params: Params = {
      index: 'index-name',
      timeField: 'time-field',
      aggType: 'foo',
      groupBy: 'all',
      timeWindowSize: 5,
      timeWindowUnit: 'm',
      thresholdComparator: Comparator.LT,
      threshold: [1],
    };

    await ruleType.executor({
      executionId: uuidv4(),
      startedAt: new Date(),
      previousStartedAt: new Date(),
      services: alertServices as unknown as RuleExecutorServices<
        {},
        ActionContext,
        typeof ActionGroupId,
        never
      >,
      params,
      state: {
        latestTimestamp: undefined,
      },
      spaceId: uuidv4(),
      rule: {
        id: uuidv4(),
        name: uuidv4(),
        tags: [],
        consumer: '',
        producer: '',
        revision: 0,
        ruleTypeId: '',
        ruleTypeName: '',
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
        muteAll: false,
        snoozeSchedule: [],
      },
      logger,
      flappingSettings: DEFAULT_FLAPPING_SETTINGS,
    });

    expect(alertServices.alertFactory.create).toHaveBeenCalledWith('all documents');
  });

  it('should ensure a null result does not fire actions', async () => {
    const customAlertServices: RuleExecutorServicesMock = alertsMock.createRuleExecutorServices();
    data.timeSeriesQuery.mockImplementation((...args) => {
      return {
        results: [
          {
            group: 'all documents',
            metrics: [['2021-07-14T14:49:30.978Z', null]],
          },
        ],
      };
    });
    const params: Params = {
      index: 'index-name',
      timeField: 'time-field',
      aggType: 'foo',
      groupBy: 'all',
      timeWindowSize: 5,
      timeWindowUnit: 'm',
      thresholdComparator: Comparator.LT,
      threshold: [1],
    };

    await ruleType.executor({
      executionId: uuidv4(),
      startedAt: new Date(),
      previousStartedAt: new Date(),
      services: customAlertServices as unknown as RuleExecutorServices<
        {},
        ActionContext,
        typeof ActionGroupId,
        never
      >,
      params,
      state: {
        latestTimestamp: undefined,
      },
      spaceId: uuidv4(),
      rule: {
        id: uuidv4(),
        name: uuidv4(),
        tags: [],
        consumer: '',
        producer: '',
        revision: 0,
        ruleTypeId: '',
        ruleTypeName: '',
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
        muteAll: false,
        snoozeSchedule: [],
      },
      logger,
      flappingSettings: DEFAULT_FLAPPING_SETTINGS,
    });

    expect(customAlertServices.alertFactory.create).not.toHaveBeenCalled();
  });

  it('should ensure an undefined result does not fire actions', async () => {
    const customAlertServices: RuleExecutorServicesMock = alertsMock.createRuleExecutorServices();
    data.timeSeriesQuery.mockImplementation((...args) => {
      return {
        results: [
          {
            group: 'all documents',
            metrics: [['2021-07-14T14:49:30.978Z', undefined]],
          },
        ],
      };
    });
    const params: Params = {
      index: 'index-name',
      timeField: 'time-field',
      aggType: 'foo',
      groupBy: 'all',
      timeWindowSize: 5,
      timeWindowUnit: 'm',
      thresholdComparator: Comparator.LT,
      threshold: [1],
    };

    await ruleType.executor({
      executionId: uuidv4(),
      startedAt: new Date(),
      previousStartedAt: new Date(),
      services: customAlertServices as unknown as RuleExecutorServices<
        {},
        ActionContext,
        typeof ActionGroupId,
        never
      >,
      params,
      state: {
        latestTimestamp: undefined,
      },
      spaceId: uuidv4(),
      rule: {
        id: uuidv4(),
        name: uuidv4(),
        tags: [],
        consumer: '',
        producer: '',
        revision: 0,
        ruleTypeId: '',
        ruleTypeName: '',
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
        muteAll: false,
        snoozeSchedule: [],
      },
      logger,
      flappingSettings: DEFAULT_FLAPPING_SETTINGS,
    });

    expect(customAlertServices.alertFactory.create).not.toHaveBeenCalled();
  });

  it('should correctly pass comparator script to timeSeriesQuery', async () => {
    data.timeSeriesQuery.mockImplementation((...args) => {
      return {
        results: [
          {
            group: 'all documents',
            metrics: [['2021-07-14T14:49:30.978Z', 0]],
          },
        ],
      };
    });
    const params: Params = {
      index: 'index-name',
      timeField: 'time-field',
      aggType: 'foo',
      groupBy: 'all',
      timeWindowSize: 5,
      timeWindowUnit: 'm',
      thresholdComparator: Comparator.LT,
      threshold: [1],
    };

    await ruleType.executor({
      executionId: uuidv4(),
      startedAt: new Date(),
      previousStartedAt: new Date(),
      services: alertServices as unknown as RuleExecutorServices<
        {},
        ActionContext,
        typeof ActionGroupId,
        never
      >,
      params,
      state: {
        latestTimestamp: undefined,
      },
      spaceId: uuidv4(),
      rule: {
        id: uuidv4(),
        name: uuidv4(),
        tags: [],
        consumer: '',
        producer: '',
        revision: 0,
        ruleTypeId: '',
        ruleTypeName: '',
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
        muteAll: false,
        snoozeSchedule: [],
      },
      logger,
      flappingSettings: DEFAULT_FLAPPING_SETTINGS,
    });

    expect(data.timeSeriesQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        query: {
          aggField: undefined,
          aggType: 'foo',
          dateEnd: '1970-01-01T00:00:00.000Z',
          dateStart: '1970-01-01T00:00:00.000Z',
          groupBy: 'all',
          index: 'index-name',
          interval: undefined,
          termField: undefined,
          termSize: undefined,
          timeField: 'time-field',
          timeWindowSize: 5,
          timeWindowUnit: 'm',
        },
        condition: {
          conditionScript: `${TIME_SERIES_BUCKET_SELECTOR_FIELD} < 1L`,
          resultLimit: 1000,
        },
      })
    );
  });
});
