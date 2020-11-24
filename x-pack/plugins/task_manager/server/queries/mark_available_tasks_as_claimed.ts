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

export const updateFieldsAndMarkAsFailed = (
  fieldUpdates: {
    [field: string]: string | number | Date;
  },
  claimTasksById: string[],
  registeredTaskTypes: string[],
  taskMaxAttempts: { [field: string]: number }
): ScriptClause => ({
  source: `
  if (params.registeredTaskTypes.contains(ctx._source.task.taskType)) {
    if (ctx._source.task.schedule != null || ctx._source.task.attempts < params.taskMaxAttempts[ctx._source.task.taskType] || params.claimTasksById.contains(ctx._id)) {
      ctx._source.task.status = "claiming"; ${Object.keys(fieldUpdates)
        .map((field) => `ctx._source.task.${field}=params.fieldUpdates.${field};`)
        .join(' ')}
    } else {
      ctx._source.task.status = "failed";
    }
  }
  `,
  lang: 'painless',
  params: {
    fieldUpdates,
    claimTasksById,
    registeredTaskTypes,
    taskMaxAttempts,
  },
});
