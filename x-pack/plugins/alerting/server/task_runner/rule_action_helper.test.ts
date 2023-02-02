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
  isSummaryActionOnInterval,
  isSummaryAction,
  isSummaryActionThrottled,
} from './rule_action_helper';

const mockOldAction: RuleAction = {
  id: '1',
  group: 'default',
  actionTypeId: 'slack',
  params: {},
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
};

const mockSummaryAction: RuleAction = {
  id: '1',
  // @ts-ignore
  group: null,
  actionTypeId: 'slack',
  params: {},
  frequency: {
    summary: true,
    notifyWhen: 'onThrottleInterval',
    throttle: '1d',
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
  });

  describe('isSummaryActionOnInterval', () => {
    test('should return false if the action does not have frequency field', () => {
      const result = isSummaryActionOnInterval(mockOldAction);
      expect(result).toBe(false);
    });

    test('should return false if notifyWhen is not onThrottleInterval', () => {
      const result = isSummaryActionOnInterval({
        ...mockAction,
        frequency: { ...mockAction.frequency, notifyWhen: 'onActiveAlert' },
      } as RuleAction);
      expect(result).toBe(false);
    });

    test('should return false if throttle is not a valid interval string', () => {
      const result = isSummaryActionOnInterval({
        ...mockAction,
        frequency: { ...mockAction.frequency, throttle: null },
      } as RuleAction);
      expect(result).toBe(false);
    });

    test('should return true if the action is a throttling action', () => {
      const result = isSummaryActionOnInterval(mockSummaryAction);
      expect(result).toBe(true);
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
  });

  describe('getSummaryActionsFromTaskState', () => {
    test('should remove the obsolete actions from the task instance', () => {
      const result = getSummaryActionsFromTaskState({
        actions: [mockSummaryAction],
        summaryActions: {
          'slack:summary:1d': { date: new Date('01.01.2020') },
          'slack:summary:2d': { date: new Date('01.01.2020') },
        },
      });
      expect(result).toEqual({ 'slack:summary:1d': { date: new Date('01.01.2020') } });
    });
  });

  describe('isSummaryActionThrottled', () => {
    beforeAll(() => {
      jest.useFakeTimers();
    });

    beforeEach(() => {
      jest.setSystemTime(new Date('2020-01-01T23:00:00.000Z').getTime());
    });

    afterAll(() => {
      jest.useRealTimers();
    });
    const logger = { debug: jest.fn } as unknown as Logger;
    const summaryActions = { 'slack:summary:1d': { date: new Date('2020-01-01T00:00:00.000Z') } };

    test('should return false if the action does not have throttle filed', () => {
      const result = isSummaryActionThrottled({
        action: mockAction,
        summaryActions,
        logger,
      });
      expect(result).toBe(false);
    });

    test('should return false if the action does not have frequency field', () => {
      const result = isSummaryActionThrottled({
        action: mockOldAction,
        summaryActions,
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
        summaryActions,
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
        summaryActions,
        logger,
      });
      expect(result).toBe(false);
    });

    test('should return false if the action is not in the task instance', () => {
      const result = isSummaryActionThrottled({
        action: mockSummaryAction,
        summaryActions: { 'slack:summary:2d': { date: new Date('2020-01-01T00:00:00.000Z') } },
        logger,
      });
      expect(result).toBe(false);
    });

    test('should return false if the action is not being throttled', () => {
      jest.advanceTimersByTime(3600000 * 2);
      const result = isSummaryActionThrottled({
        action: mockSummaryAction,
        summaryActions: { 'slack:summary:1d': { date: new Date('2020-01-01T00:00:00.000Z') } },
        logger,
      });
      expect(result).toBe(false);
    });

    test('should return true for a throttling action', () => {
      const result = isSummaryActionThrottled({
        action: mockSummaryAction,
        summaryActions,
        logger,
      });
      expect(result).toBe(true);
    });
  });
});
