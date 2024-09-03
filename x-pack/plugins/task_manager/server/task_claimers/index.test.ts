/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getTaskClaimer, isTaskTypeExcluded } from '.';
import { mockLogger } from '../test_utils';
import { claimAvailableTasksUpdateByQuery } from './strategy_update_by_query';
import { claimAvailableTasksMget } from './strategy_mget';

const logger = mockLogger();

describe('task_claimers/index', () => {
  beforeEach(() => jest.resetAllMocks());

  describe('getTaskClaimer()', () => {
    test('returns expected result for update_by_query', () => {
      const taskClaimer = getTaskClaimer(logger, 'update_by_query');
      expect(taskClaimer).toBe(claimAvailableTasksUpdateByQuery);
      expect(logger.warn).not.toHaveBeenCalled();
    });

    test('returns expected result for mget', () => {
      const taskClaimer = getTaskClaimer(logger, 'mget');
      expect(taskClaimer).toBe(claimAvailableTasksMget);
      expect(logger.warn).not.toHaveBeenCalled();
    });

    test('logs a warning for unsupported parameter', () => {
      const taskClaimer = getTaskClaimer(logger, 'not-supported');
      expect(taskClaimer).toBe(claimAvailableTasksUpdateByQuery);
      expect(logger.warn).toHaveBeenCalledWith(
        'Unknown task claiming strategy "not-supported", falling back to update_by_query'
      );
    });
  });
});

describe('isTaskTypeExcluded', () => {
  test('returns false when task type is not in the excluded list', () => {
    expect(isTaskTypeExcluded(['otherTaskType'], 'taskType')).toBe(false);
    expect(isTaskTypeExcluded(['otherTaskType*'], 'taskType')).toBe(false);
  });

  test('returns true when task type is in the excluded list', () => {
    expect(isTaskTypeExcluded(['taskType'], 'taskType')).toBe(true);
    expect(isTaskTypeExcluded(['task*'], 'taskType')).toBe(true);
  });
});
