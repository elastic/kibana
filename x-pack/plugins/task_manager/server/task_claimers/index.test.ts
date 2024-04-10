/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getTaskClaimer } from '.';
import { claimAvailableTasksDefault } from './strategy_default';
import { claimAvailableTasksMget } from './strategy_mget';

describe('task_claimers/index', () => {
  describe('getTaskClaimer()', () => {
    test('returns expected result for default', () => {
      const taskClaimer = getTaskClaimer('default');
      expect(taskClaimer).toBe(claimAvailableTasksDefault);
    });

    test('returns expected result for mget', () => {
      const taskClaimer = getTaskClaimer('mget');
      expect(taskClaimer).toBe(claimAvailableTasksMget);
    });

    test('throws error for unsupported parameter', () => {
      expect(() => getTaskClaimer('not-supported')).toThrowErrorMatchingInlineSnapshot(
        `"Unknown task claiming strategy (not-supported)"`
      );
    });
  });
});
