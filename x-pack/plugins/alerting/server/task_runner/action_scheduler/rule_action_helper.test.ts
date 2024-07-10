/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger } from '@kbn/logging';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import { RuleAction } from '../../types';
import {
  generateActionHash,
  getSummaryActionsFromTaskState,
  isActionOnInterval,
  isSummaryAction,
  isSummaryActionThrottled,
  getSummaryActionTimeBounds,
  logNumberOfFilteredAlerts,
} from './rule_action_helper';

const now = '2021-05-13T12:33:37.000Z';
Date.now = jest.fn().mockReturnValue(new Date(now));

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
          '111-111': { date: new Date('01.01.2020').toISOString() },
          '222-222': { date: new Date('01.01.2020').toISOString() },
        },
      });
      expect(result).toEqual({ '111-111': { date: new Date('01.01.2020').toISOString() } });
    });

    test('should replace hash with uuid', () => {
      const result = getSummaryActionsFromTaskState({
        actions: [mockSummaryAction],
        summaryActions: {
          'slack:summary:1d': { date: new Date('01.01.2020').toISOString() },
        },
      });
      expect(result).toEqual({ '111-111': { date: new Date('01.01.2020').toISOString() } });
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
    const throttledSummaryActions = { '111-111': { date: '2020-01-01T00:00:00.000Z' } };

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
        throttledSummaryActions: { '123-456': { date: '2020-01-01T00:00:00.000Z' } },
        logger,
      });
      expect(result).toBe(false);
    });

    test('should return false if the action is not being throttled', () => {
      jest.advanceTimersByTime(3600000 * 2);
      const result = isSummaryActionThrottled({
        action: mockSummaryAction,
        throttledSummaryActions: { '123-456': { date: '2020-01-01T00:00:00.000Z' } },
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

  describe('getSummaryActionTimeBounds', () => {
    test('returns undefined start and end action is not summary action', () => {
      expect(getSummaryActionTimeBounds(mockAction, { interval: '1m' }, null)).toEqual({
        start: undefined,
        end: undefined,
      });
    });

    test('returns start and end for summary action with throttle', () => {
      const { start, end } = getSummaryActionTimeBounds(
        mockSummaryAction,
        { interval: '1m' },
        null
      );
      expect(end).toEqual(1620909217000);
      expect(end).toEqual(new Date(now).valueOf());
      expect(start).toEqual(1620822817000);
      // start is end - throttle interval (1d)
      expect(start).toEqual(new Date('2021-05-12T12:33:37.000Z').valueOf());
    });

    test('returns start and end for summary action without throttle with previousStartedAt', () => {
      const { start, end } = getSummaryActionTimeBounds(
        {
          ...mockSummaryAction,
          frequency: { summary: true, notifyWhen: 'onActiveAlert', throttle: null },
        },
        { interval: '1m' },
        new Date('2021-05-13T12:31:57.000Z')
      );

      expect(end).toEqual(1620909217000);
      expect(end).toEqual(new Date(now).valueOf());
      expect(start).toEqual(1620909117000);
      // start is previous started at time
      expect(start).toEqual(new Date('2021-05-13T12:31:57.000Z').valueOf());
    });

    test('returns start and end for summary action without throttle without previousStartedAt', () => {
      const { start, end } = getSummaryActionTimeBounds(
        {
          ...mockSummaryAction,
          frequency: { summary: true, notifyWhen: 'onActiveAlert', throttle: null },
        },
        { interval: '1m' },
        null
      );

      expect(end).toEqual(1620909217000);
      expect(end).toEqual(new Date(now).valueOf());
      expect(start).toEqual(1620909157000);
      // start is end - schedule interval (1m)
      expect(start).toEqual(new Date('2021-05-13T12:32:37.000Z').valueOf());
    });
  });

  describe('logNumberOfFilteredAlerts', () => {
    test('should log when the number of alerts is different than the number of summarized alerts', () => {
      const logger = loggingSystemMock.create().get();
      logNumberOfFilteredAlerts({
        logger,
        numberOfAlerts: 10,
        numberOfSummarizedAlerts: 5,
        action: mockSummaryAction,
      });
      expect(logger.debug).toHaveBeenCalledWith(
        '(5) alerts have been filtered out for: slack:111-111'
      );
    });

    test('should not log when the number of alerts is the same as the number of summarized alerts', () => {
      const logger = loggingSystemMock.create().get();
      logNumberOfFilteredAlerts({
        logger,
        numberOfAlerts: 10,
        numberOfSummarizedAlerts: 10,
        action: mockSummaryAction,
      });
      expect(logger.debug).not.toHaveBeenCalled();
    });
  });
});
