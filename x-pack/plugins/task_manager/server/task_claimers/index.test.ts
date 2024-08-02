/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getTaskClaimer } from '.';
import { mockLogger } from '../test_utils';
import { claimAvailableTasksDefault } from './strategy_default';
import { claimAvailableTasksMget } from './strategy_mget';

const logger = mockLogger();

describe('task_claimers/index', () => {
  beforeEach(() => jest.resetAllMocks());

  describe('getTaskClaimer()', () => {
    test('returns expected result for default', () => {
      const taskClaimer = getTaskClaimer(logger, 'default');
      expect(taskClaimer).toBe(claimAvailableTasksDefault);
      expect(logger.warn).not.toHaveBeenCalled();
    });

    test('returns expected result for mget', () => {
      const taskClaimer = getTaskClaimer(logger, 'unsafe_mget');
      expect(taskClaimer).toBe(claimAvailableTasksMget);
      expect(logger.warn).not.toHaveBeenCalled();
    });

    test('logs a warning for unsupported parameter', () => {
      const taskClaimer = getTaskClaimer(logger, 'not-supported');
      expect(taskClaimer).toBe(claimAvailableTasksDefault);
      expect(logger.warn).toHaveBeenCalledWith(
        'Unknown task claiming strategy "not-supported", falling back to default'
      );
    });
  });
});
