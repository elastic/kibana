/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import {
  MustCondition,
  shouldBeOneOf,
  mustBeAllOf,
  ExistsFilter,
  TermFilter,
  RangeFilter,
  matchesClauses,
} from './query_clauses';

describe('matchesClauses', () => {
  test('merges multiple types of Bool Clauses into one', () => {
    const TaskWithSchedule: ExistsFilter = {
      exists: { field: 'task.schedule' },
    };

    const IdleTaskWithExpiredRunAt: MustCondition<TermFilter | RangeFilter> = {
      bool: {
        must: [{ term: { 'task.status': 'idle' } }, { range: { 'task.runAt': { lte: 'now' } } }],
      },
    };

    const RunningTask: MustCondition<TermFilter> = {
      bool: {
        must: [{ term: { 'task.status': 'running' } }],
      },
    };

    expect(
      matchesClauses(
        mustBeAllOf(TaskWithSchedule),
        shouldBeOneOf<ExistsFilter | TermFilter | RangeFilter>(
          RunningTask,
          IdleTaskWithExpiredRunAt
        )
      )
    ).toMatchObject({
      bool: {
        must: [TaskWithSchedule],
        should: [RunningTask, IdleTaskWithExpiredRunAt],
      },
    });
  });
});
