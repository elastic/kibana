/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import {
  BoolClause,
  shouldBeOneOf,
  mustBeAllOf,
  ExistsBoolClause,
  TermBoolClause,
  RangeBoolClause,
  mergeBoolClauses,
} from './query_clauses';

describe('mergeBoolClauses', () => {
  test('merges multiple types of Bool Clauses into one', () => {
    const TaskWithSchedule: ExistsBoolClause = {
      exists: { field: 'task.schedule' },
    };

    const IdleTaskWithExpiredRunAt: BoolClause<TermBoolClause | RangeBoolClause> = {
      bool: {
        must: [{ term: { 'task.status': 'idle' } }, { range: { 'task.runAt': { lte: 'now' } } }],
      },
    };

    const RunningTask: BoolClause<TermBoolClause> = {
      bool: {
        must: [{ term: { 'task.status': 'running' } }],
      },
    };

    expect(
      mergeBoolClauses(
        mustBeAllOf(TaskWithSchedule),
        shouldBeOneOf<ExistsBoolClause | TermBoolClause | RangeBoolClause>(
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
