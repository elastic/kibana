/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import {
  BoolClause,
  SortClause,
  ScriptClause,
  ExistsBoolClause,
  TermBoolClause,
  RangeBoolClause,
  mustBeAllOf,
} from './query_clauses';

export const TaskWithSchedule: ExistsBoolClause = {
  exists: { field: 'task.schedule' },
};
export function taskWithLessThanMaxAttempts(
  type: string,
  maxAttempts: number
): BoolClause<TermBoolClause | RangeBoolClause> {
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

export function claimedTasks(taskManagerId: string) {
  return mustBeAllOf(
    {
      term: {
        'task.ownerId': taskManagerId,
      },
    },
    { term: { 'task.status': 'claiming' } }
  );
}

export const IdleTaskWithExpiredRunAt: BoolClause<TermBoolClause | RangeBoolClause> = {
  bool: {
    must: [{ term: { 'task.status': 'idle' } }, { range: { 'task.runAt': { lte: 'now' } } }],
  },
};

export const InactiveTasks: BoolClause<TermBoolClause | RangeBoolClause> = {
  bool: {
    must_not: [
      {
        bool: {
          should: [{ term: { 'task.status': 'running' } }, { term: { 'task.status': 'claiming' } }],
        },
      },
      { range: { 'task.retryAt': { gt: 'now' } } },
    ],
  },
};

export const RunningOrClaimingTaskWithExpiredRetryAt: BoolClause<
  TermBoolClause | RangeBoolClause
> = {
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
    .map(field => `ctx._source.task.${field}=params.${field};`)
    .join(' '),
  lang: 'painless',
  params: fieldUpdates,
});
