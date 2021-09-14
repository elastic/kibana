/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { estypes } from '@elastic/elasticsearch';
import {
  ScriptBasedSortClause,
  ScriptClause,
  mustBeAllOf,
  MustCondition,
  MustNotCondition,
} from './query_clauses';

export function taskWithLessThanMaxAttempts(type: string, maxAttempts: number): MustCondition {
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

export function tasksOfType(taskTypes: string[]): estypes.QueryDslQueryContainer {
  return {
    bool: {
      should: [...taskTypes].map((type) => ({ term: { 'task.taskType': type } })),
    },
  };
}

export function tasksClaimedByOwner(
  taskManagerId: string,
  ...taskFilters: estypes.QueryDslQueryContainer[]
) {
  return mustBeAllOf(
    {
      term: {
        'task.ownerId': taskManagerId,
      },
    },
    { term: { 'task.status': 'claiming' } },
    ...taskFilters
  );
}

export const IdleTaskWithExpiredRunAt: MustCondition = {
  bool: {
    must: [{ term: { 'task.status': 'idle' } }, { range: { 'task.runAt': { lte: 'now' } } }],
  },
};

export const InactiveTasks: MustNotCondition = {
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

export const RunningOrClaimingTaskWithExpiredRetryAt: MustCondition = {
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

const SortByRunAtAndRetryAtScript: ScriptBasedSortClause = {
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
export const SortByRunAtAndRetryAt = (SortByRunAtAndRetryAtScript as unknown) as Record<
  string,
  estypes.SearchSort
>;

export const updateFieldsAndMarkAsFailed = (
  fieldUpdates: {
    [field: string]: string | number | Date;
  },
  claimTasksById: string[],
  claimableTaskTypes: string[],
  skippedTaskTypes: string[],
  taskMaxAttempts: { [field: string]: number }
): ScriptClause => {
  const markAsClaimingScript = `ctx._source.task.status = "claiming"; ${Object.keys(fieldUpdates)
    .map((field) => `ctx._source.task.${field}=params.fieldUpdates.${field};`)
    .join(' ')}`;
  return {
    source: `
    if (params.claimableTaskTypes.contains(ctx._source.task.taskType)) {
      if (ctx._source.task.schedule != null || ctx._source.task.attempts < params.taskMaxAttempts[ctx._source.task.taskType] || params.claimTasksById.contains(ctx._id)) {
        ${markAsClaimingScript}
      } else {
        ctx._source.task.status = "failed";
      }
    } else if (params.skippedTaskTypes.contains(ctx._source.task.taskType) && params.claimTasksById.contains(ctx._id)) {
      ${markAsClaimingScript}
    } else if (!params.skippedTaskTypes.contains(ctx._source.task.taskType)) {
      ctx._source.task.status = "unrecognized";
    } else {
      ctx.op = "noop";
    }`,
    lang: 'painless',
    params: {
      fieldUpdates,
      claimTasksById,
      claimableTaskTypes,
      skippedTaskTypes,
      taskMaxAttempts,
    },
  };
};
