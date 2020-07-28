/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import {
  SortClause,
  ScriptClause,
  ExistsFilter,
  TermFilter,
  RangeFilter,
  mustBeAllOf,
  MustCondition,
  BoolClauseWithAnyCondition,
} from './query_clauses';

export const TaskWithSchedule: ExistsFilter = {
  exists: { field: 'task.schedule' },
};
export function taskWithLessThanMaxAttempts(
  type: string,
  maxAttempts: number
): MustCondition<TermFilter | RangeFilter> {
  return {
    bool: {
      must: [
        { term: { 'task.taskType': type } },
        {
          range: {
            'task.attempts': {
              lt: maxAttempts,
            },
          },
        },
      ],
    },
  };
}

export function tasksClaimedByOwner(taskManagerId: string) {
  return mustBeAllOf(
    {
      term: {
        'task.ownerId': taskManagerId,
      },
    },
    { term: { 'task.status': 'claiming' } }
  );
}

export const IdleTaskWithExpiredRunAt: MustCondition<TermFilter | RangeFilter> = {
  bool: {
    must: [{ term: { 'task.status': 'idle' } }, { range: { 'task.runAt': { lte: 'now' } } }],
  },
};

// TODO: Fix query clauses to support this
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const InactiveTasks: BoolClauseWithAnyCondition<any> = {
  bool: {
    must_not: [
      {
        bool: {
          should: [{ term: { 'task.status': 'running' } }, { term: { 'task.status': 'claiming' } }],
          must: { range: { 'task.retryAt': { gt: 'now' } } },
        },
      },
    ],
  },
};

export const RunningOrClaimingTaskWithExpiredRetryAt: MustCondition<TermFilter | RangeFilter> = {
  bool: {
    must: [
      {
        bool: {
          should: [{ term: { 'task.status': 'running' } }, { term: { 'task.status': 'claiming' } }],
        },
      },
      { range: { 'task.retryAt': { lte: 'now' } } },
    ],
  },
};

export const SortByRunAtAndRetryAt: SortClause = {
  _script: {
    type: 'number',
    order: 'asc',
    script: {
      lang: 'painless',
      source: `
if (doc['task.retryAt'].size()!=0) {
  return doc['task.retryAt'].value.toInstant().toEpochMilli();
}
if (doc['task.runAt'].size()!=0) {
  return doc['task.runAt'].value.toInstant().toEpochMilli();
}
    `,
    },
  },
};

export const updateFields = (fieldUpdates: {
  [field: string]: string | number | Date;
}): ScriptClause => ({
  source: Object.keys(fieldUpdates)
    .map((field) => `ctx._source.task.${field}=params.${field};`)
    .join(' '),
  lang: 'painless',
  params: fieldUpdates,
});
