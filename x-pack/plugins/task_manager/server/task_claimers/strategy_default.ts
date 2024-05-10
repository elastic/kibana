/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * This module contains helpers for managing the task manager storage layer.
 */
import type { estypes } from '@elastic/elasticsearch';
import apm from 'elastic-apm-node';
import minimatch from 'minimatch';
import { Subject, Observable, from, of } from 'rxjs';
import { mergeScan } from 'rxjs';
import { groupBy, pick } from 'lodash';

import { asOk } from '../lib/result_type';
import { TaskTypeDictionary } from '../task_type_dictionary';
import { TaskClaimerOpts, ClaimOwnershipResult } from '.';
import { ConcreteTaskInstance, TaskPriority } from '../task';
import { TASK_MANAGER_TRANSACTION_TYPE } from '../task_running';
import { isLimited, TASK_MANAGER_MARK_AS_CLAIMED } from '../queries/task_claiming';
import { TaskClaim, asTaskClaimEvent, startTaskTimer } from '../task_events';
import { shouldBeOneOf, mustBeAllOf, filterDownBy, matchesClauses } from '../queries/query_clauses';

import {
  updateFieldsAndMarkAsFailed,
  IdleTaskWithExpiredRunAt,
  InactiveTasks,
  RunningOrClaimingTaskWithExpiredRetryAt,
  SortByRunAtAndRetryAt,
  tasksClaimedByOwner,
  tasksOfType,
  EnabledTask,
} from '../queries/mark_available_tasks_as_claimed';

import {
  correctVersionConflictsForContinuation,
  TaskStore,
  UpdateByQueryResult,
  SearchOpts,
} from '../task_store';

interface OwnershipClaimingOpts {
  claimOwnershipUntil: Date;
  size: number;
  taskTypes: Set<string>;
  taskStore: TaskStore;
  events$: Subject<TaskClaim>;
  definitions: TaskTypeDictionary;
  unusedTypes: string[];
  excludedTaskTypes: string[];
  taskMaxAttempts: Record<string, number>;
}

export function claimAvailableTasksDefault(
  opts: TaskClaimerOpts
): Observable<ClaimOwnershipResult> {
  const { getCapacity, claimOwnershipUntil, batches, events$, taskStore } = opts;
  const { definitions, unusedTypes, excludedTaskTypes, taskMaxAttempts } = opts;
  const initialCapacity = getCapacity();
  return from(batches).pipe(
    mergeScan(
      (accumulatedResult, batch) => {
        const stopTaskTimer = startTaskTimer();
        const capacity = Math.min(
          initialCapacity - accumulatedResult.stats.tasksClaimed,
          isLimited(batch) ? getCapacity(batch.tasksTypes) : getCapacity()
        );
        // if we have no more capacity, short circuit here
        if (capacity <= 0) {
          return of(accumulatedResult);
        }
        return from(
          executeClaimAvailableTasks({
            claimOwnershipUntil,
            size: capacity,
            events$,
            taskTypes: isLimited(batch) ? new Set([batch.tasksTypes]) : batch.tasksTypes,
            taskStore,
            definitions,
            unusedTypes,
            excludedTaskTypes,
            taskMaxAttempts,
          }).then((result) => {
            const { stats, docs } = accumulateClaimOwnershipResults(accumulatedResult, result);
            stats.tasksConflicted = correctVersionConflictsForContinuation(
              stats.tasksClaimed,
              stats.tasksConflicted,
              initialCapacity
            );
            return { stats, docs, timing: stopTaskTimer() };
          })
        );
      },
      // initialise the accumulation with no results
      accumulateClaimOwnershipResults(),
      // only run one batch at a time
      1
    )
  );
}

async function executeClaimAvailableTasks(
  opts: OwnershipClaimingOpts
): Promise<ClaimOwnershipResult> {
  const { taskStore, size, taskTypes, events$, definitions } = opts;
  const { updated: tasksUpdated, version_conflicts: tasksConflicted } =
    await markAvailableTasksAsClaimed(opts);

  const docs =
    tasksUpdated > 0 ? await sweepForClaimedTasks(taskStore, taskTypes, size, definitions) : [];

  emitEvents(
    events$,
    docs.map((doc) => asTaskClaimEvent(doc.id, asOk(doc)))
  );

  const stats = {
    tasksUpdated,
    tasksConflicted,
    tasksClaimed: docs.length,
  };

  return {
    stats,
    docs,
  };
}

function emitEvents(events$: Subject<TaskClaim>, events: TaskClaim[]) {
  events.forEach((event) => events$.next(event));
}

function isTaskTypeExcluded(excludedTaskTypes: string[], taskType: string) {
  for (const excludedType of excludedTaskTypes) {
    if (minimatch(taskType, excludedType)) {
      return true;
    }
  }

  return false;
}

async function markAvailableTasksAsClaimed({
  definitions,
  excludedTaskTypes,
  taskStore,
  claimOwnershipUntil,
  size,
  taskTypes,
  unusedTypes,
  taskMaxAttempts,
}: OwnershipClaimingOpts): Promise<UpdateByQueryResult> {
  const { taskTypesToSkip = [], taskTypesToClaim = [] } = groupBy(
    definitions.getAllTypes(),
    (type) =>
      taskTypes.has(type) && !isTaskTypeExcluded(excludedTaskTypes, type)
        ? 'taskTypesToClaim'
        : 'taskTypesToSkip'
  );
  const queryForScheduledTasks = mustBeAllOf(
    // Task must be enabled
    EnabledTask,
    // Either a task with idle status and runAt <= now or
    // status running or claiming with a retryAt <= now.
    shouldBeOneOf(IdleTaskWithExpiredRunAt, RunningOrClaimingTaskWithExpiredRetryAt)
  );

  const sort: NonNullable<SearchOpts['sort']> = getClaimSort(definitions);
  const query = matchesClauses(queryForScheduledTasks, filterDownBy(InactiveTasks));
  const script = updateFieldsAndMarkAsFailed({
    fieldUpdates: {
      ownerId: taskStore.taskManagerId,
      retryAt: claimOwnershipUntil,
    },
    claimableTaskTypes: taskTypesToClaim,
    skippedTaskTypes: taskTypesToSkip,
    unusedTaskTypes: unusedTypes,
    taskMaxAttempts: pick(taskMaxAttempts, taskTypesToClaim),
  });

  const apmTrans = apm.startTransaction(
    TASK_MANAGER_MARK_AS_CLAIMED,
    TASK_MANAGER_TRANSACTION_TYPE
  );

  try {
    const result = await taskStore.updateByQuery(
      {
        query,
        script,
        sort,
      },
      {
        max_docs: size,
      }
    );
    apmTrans.end('success');
    return result;
  } catch (err) {
    apmTrans.end('failure');
    throw err;
  }
}

async function sweepForClaimedTasks(
  taskStore: TaskStore,
  taskTypes: Set<string>,
  size: number,
  definitions: TaskTypeDictionary
): Promise<ConcreteTaskInstance[]> {
  const claimedTasksQuery = tasksClaimedByOwner(
    taskStore.taskManagerId,
    tasksOfType([...taskTypes])
  );
  const { docs } = await taskStore.fetch({
    query: claimedTasksQuery,
    size,
    sort: getClaimSort(definitions),
    seq_no_primary_term: true,
  });

  return docs;
}

function emptyClaimOwnershipResult() {
  return {
    stats: {
      tasksUpdated: 0,
      tasksConflicted: 0,
      tasksClaimed: 0,
      tasksRejected: 0,
    },
    docs: [],
  };
}

function accumulateClaimOwnershipResults(
  prev: ClaimOwnershipResult = emptyClaimOwnershipResult(),
  next?: ClaimOwnershipResult
) {
  if (next) {
    const { stats, docs, timing } = next;
    const res = {
      stats: {
        tasksUpdated: stats.tasksUpdated + prev.stats.tasksUpdated,
        tasksConflicted: stats.tasksConflicted + prev.stats.tasksConflicted,
        tasksClaimed: stats.tasksClaimed + prev.stats.tasksClaimed,
      },
      docs,
      timing,
    };
    return res;
  }
  return prev;
}

function getClaimSort(definitions: TaskTypeDictionary): estypes.SortCombinations[] {
  // Sort by descending priority, then by ascending runAt/retryAt time
  return [
    {
      _script: {
        type: 'number',
        order: 'desc',
        script: {
          lang: 'painless',
          // Use priority if explicitly specified in task definition, otherwise default to 50 (Normal)
          source: `
            String taskType = doc['task.taskType'].value;
            if (params.priority_map.containsKey(taskType)) {
              return params.priority_map[taskType];
            } else {
              return ${TaskPriority.Normal};
            }
          `,
          params: {
            priority_map: definitions
              .getAllDefinitions()
              .reduce<Record<string, TaskPriority>>((acc, taskDefinition) => {
                if (taskDefinition.priority) {
                  acc[taskDefinition.type] = taskDefinition.priority;
                }
                return acc;
              }, {}),
          },
        },
      },
    },
    SortByRunAtAndRetryAt,
  ];
}
