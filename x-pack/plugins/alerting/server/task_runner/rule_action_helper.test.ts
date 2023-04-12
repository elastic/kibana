/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger } from '@kbn/logging';
import { RuleAction } from '../types';
import {
  generateActionHash,
  getSummaryActionsFromTaskState,
  isActionOnInterval,
  isSummaryAction,
  isSummaryActionOnInterval,
  isSummaryActionThrottled,
  getTimeBoundsOfSummarizedAlerts,
} from './rule_action_helper';

const mockOldAction: RuleAction = {
  id: '1',
  group: 'default',
  actionTypeId: 'slack',
  params: {},
  uuid: '123-456',
};

const mockAction: RuleAction = {
  id: '1',
  group: 'default',
  actionTypeId: 'slack',
  params: {},
  frequency: {
    summary: false,
    notifyWhen: 'onActiveAlert',
    throttle: null,
  },
  uuid: '123-456',
};

const mockSummaryAction: RuleAction = {
  id: '1',
  group: 'default',
  actionTypeId: 'slack',
  params: {},
  frequency: {
    summary: true,
    notifyWhen: 'onThrottleInterval',
    throttle: '1d',
  },
  uuid: '111-111',
};

const mockAAD = {
  '@timestamp': '2022-12-07T15:38:43.472Z',
  event: {
    kind: 'signal',
    action: 'active',
  },
  kibana: {
    version: '8.7.0',
    space_ids: ['default'],
    alert: {
      instance: { id: '*' },
      uuid: '2d3e8fe5-3e8b-4361-916e-9eaab0bf2084',
      status: 'active',
      workflow_status: 'open',
      reason: 'system.cpu is 90% in the last 1 min for all hosts. Alert when > 50%.',
      time_range: { gte: '2022-01-01T12:00:00.000Z' },
      start: '2022-12-07T15:23:13.488Z',
      duration: { us: 100000 },
      flapping: false,
      rule: {
        category: 'Metric threshold',
        consumer: 'alerts',
        execution: { uuid: 'c35db7cc-5bf7-46ea-b43f-b251613a5b72' },
        name: 'test-rule',
        producer: 'infrastructure',
        rule_type_id: 'metrics.alert.threshold',
        uuid: '0de91960-7643-11ed-b719-bb9db8582cb6',
        tags: [],
      },
    },
  },
};

describe('rule_action_helper', () => {
  describe('isSummaryAction', () => {
    test('should return false if the action is not a summary action', () => {
      const result = isSummaryAction(mockAction);
      expect(result).toBe(false);
    });
    test('should return false if the action does not have frequency field', () => {
      const result = isSummaryAction(mockOldAction);
      expect(result).toBe(false);
    });

    test('should return true if the action is a summary action', () => {
      const result = isSummaryAction(mockSummaryAction);
      expect(result).toBe(true);
    });

    test('should return false if the action is undefined', () => {
      const result = isSummaryAction(undefined);
      expect(result).toBe(false);
    });

    test('should return false if the action is not a proper RuleAction', () => {
      const result = isSummaryAction({} as RuleAction);
      expect(result).toBe(false);
    });
  });

  describe('isActionOnInterval', () => {
    test('should return false if the action does not have frequency field', () => {
      const result = isActionOnInterval(mockOldAction);
      expect(result).toBe(false);
    });

    test('should return false if notifyWhen is not onThrottleInterval', () => {
      const result = isActionOnInterval({
        ...mockAction,
        frequency: { ...mockAction.frequency, notifyWhen: 'onActiveAlert' },
      } as RuleAction);
      expect(result).toBe(false);
    });

    test('should return false if throttle is not a valid interval string', () => {
      const result = isActionOnInterval({
        ...mockAction,
        frequency: { ...mockAction.frequency, throttle: null },
      } as RuleAction);
      expect(result).toBe(false);
    });

    test('should return true if the action is a throttling action', () => {
      const result = isActionOnInterval(mockSummaryAction);
      expect(result).toBe(true);
    });

    test('should return false if the action  undefined', () => {
      const result = isActionOnInterval(undefined);
      expect(result).toBe(false);
    });

    test('should return false if the action is not a proper RuleAction', () => {
      const result = isActionOnInterval({} as RuleAction);
      expect(result).toBe(false);
    });
  });

  describe('generateActionHash', () => {
    test('should return a hash for non-throttling action', () => {
      const result = generateActionHash(mockAction);
      expect(result).toBe('slack:default:no-throttling');
    });

    test('should return a hash for an old action type', () => {
      const result = generateActionHash(mockOldAction);
      expect(result).toBe('slack:default:no-throttling');
    });

    test('should return a hash for a summary action', () => {
      const result = generateActionHash(mockSummaryAction);
      expect(result).toBe('slack:summary:1d');
    });

    test('should return a hash for a broken summary action', () => {
      const result = generateActionHash(undefined);
      expect(result).toBe('no-action-type-id:no-action-group:no-throttling');
    });
  });

  describe('getSummaryActionsFromTaskState', () => {
    test('should remove the obsolete actions from the task instance', () => {
      const result = getSummaryActionsFromTaskState({
        actions: [mockSummaryAction],
        summaryActions: {
          '111-111': { date: new Date('01.01.2020') },
          '222-222': { date: new Date('01.01.2020') },
        },
      });
      expect(result).toEqual({ '111-111': { date: new Date('01.01.2020') } });
    });

    test('should replace hash with uuid', () => {
      const result = getSummaryActionsFromTaskState({
        actions: [mockSummaryAction],
        summaryActions: {
          'slack:summary:1d': { date: new Date('01.01.2020') },
        },
      });
      expect(result).toEqual({ '111-111': { date: new Date('01.01.2020') } });
    });
  });

  describe('isSummaryActionThrottled', () => {
    beforeAll(() => {
      jest.useFakeTimers();
    });

    beforeEach(() => {
      jest.setSystemTime(new Date('2020-01-01T23:00:00.000Z').getTime());
    });
    afterEach(() => {
      jest.clearAllMocks();
    });

    afterAll(() => {
      jest.useRealTimers();
    });
    const logger = { debug: jest.fn() } as unknown as Logger;
    const throttledSummaryActions = { '111-111': { date: new Date('2020-01-01T00:00:00.000Z') } };

    test('should return false if the action does not have throttle filed', () => {
      const result = isSummaryActionThrottled({
        action: mockAction,
        throttledSummaryActions,
        logger,
      });
      expect(result).toBe(false);
    });

    test('should return false if the action does not have frequency field', () => {
      const result = isSummaryActionThrottled({
        action: mockOldAction,
        throttledSummaryActions,
        logger,
      });
      expect(result).toBe(false);
    });

    test('should return false if notifyWhen is not onThrottleInterval', () => {
      const result = isSummaryActionThrottled({
        action: {
          ...mockSummaryAction,
          frequency: { ...mockSummaryAction.frequency, notifyWhen: 'onActiveAlert' },
        } as RuleAction,
        throttledSummaryActions,
        logger,
      });
      expect(result).toBe(false);
    });

    test('should return false if throttle field is not a valid interval', () => {
      const result = isSummaryActionThrottled({
        action: {
          ...mockSummaryAction,
          frequency: { ...mockSummaryAction.frequency, throttle: null },
        } as RuleAction,
        throttledSummaryActions,
        logger,
      });
      expect(result).toBe(false);
    });

    test('should return false if the action is not in the task instance', () => {
      const result = isSummaryActionThrottled({
        action: mockSummaryAction,
        throttledSummaryActions: { '123-456': { date: new Date('2020-01-01T00:00:00.000Z') } },
        logger,
      });
      expect(result).toBe(false);
    });

    test('should return false if the action is not being throttled', () => {
      jest.advanceTimersByTime(3600000 * 2);
      const result = isSummaryActionThrottled({
        action: mockSummaryAction,
        throttledSummaryActions: { '123-456': { date: new Date('2020-01-01T00:00:00.000Z') } },
        logger,
      });
      expect(result).toBe(false);
    });

    test('should return true for a throttling action', () => {
      const result = isSummaryActionThrottled({
        action: mockSummaryAction,
        throttledSummaryActions,
        logger,
      });
      expect(result).toBe(true);
    });

    test('should return false if the action is broken', () => {
      const result = isSummaryActionThrottled({
        action: undefined,
        throttledSummaryActions,
        logger,
      });
      expect(result).toBe(false);
    });

    test('should return false if there is no summary action in the state', () => {
      const result = isSummaryActionThrottled({
        action: mockSummaryAction,
        throttledSummaryActions: undefined,
        logger,
      });
      expect(result).toBe(false);
    });

    test('should return false if the actions throttle interval is not valid', () => {
      const result = isSummaryActionThrottled({
        action: {
          ...mockSummaryAction,
          frequency: {
            summary: true,
            notifyWhen: 'onThrottleInterval',
            throttle: '1',
          },
        },
        throttledSummaryActions,
        logger,
      });
      expect(result).toBe(false);
      expect(logger.debug).toHaveBeenCalledWith(
        "Action'slack:1', has an invalid throttle interval"
      );
    });
  });

  describe('isSummaryActionOnInterval', () => {
    test('returns true for a summary action on interval', () => {
      expect(isSummaryActionOnInterval(mockSummaryAction)).toBe(true);
    });

    test('returns false for a non-summary ', () => {
      expect(
        isSummaryActionOnInterval({
          ...mockAction,
          frequency: { summary: false, notifyWhen: 'onThrottleInterval', throttle: '1h' },
        })
      ).toBe(false);
    });

    test('returns false for a summary per rule run ', () => {
      expect(
        isSummaryActionOnInterval({
          ...mockAction,
          frequency: { summary: true, notifyWhen: 'onActiveAlert', throttle: null },
        })
      ).toBe(false);
    });
  });

  describe('getTimeBoundsOfSummarizedAlerts', () => {
    test('returns start and end for summarized alerts', () => {
      const data = [
        mockAAD,
        {
          ...mockAAD,
          '@timestamp': '2022-12-07T15:45:41.4672Z',
          alert: { instance: { id: 'all' } },
        },
      ];
      expect(
        getTimeBoundsOfSummarizedAlerts({
          new: { count: data.length, data },
          ongoing: { count: 0, data: [] },
          recovered: { count: 0, data: [] },
          all: { count: data.length, data },
        })
      ).toEqual({ start: 1670427523472, end: 1670427941467 });
    });

    test('returns undefined start and end when there are no summarized alerts', () => {
      expect(
        getTimeBoundsOfSummarizedAlerts({
          new: { count: 0, data: [] },
          ongoing: { count: 0, data: [] },
          recovered: { count: 0, data: [] },
          all: { count: 0, data: [] },
        })
      ).toEqual({ start: undefined, end: undefined });
    });

    test('returns undefined start and end when no timestamps are available', () => {
      const data = [
        {
          ...mockAAD,
          '@timestamp': null,
        },
      ];
      expect(
        getTimeBoundsOfSummarizedAlerts({
          new: { count: 1, data },
          ongoing: { count: 0, data: [] },
          recovered: { count: 0, data: [] },
          all: { count: 1, data },
        })
      ).toEqual({ start: undefined, end: undefined });
    });
  });
});
