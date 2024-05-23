/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * new task claiming strategy for https://github.com/elastic/kibana/issues/155770
 *
 * Does not yet handle:
 * - marking tasks as `unused` (search for updateFieldsAndMarkAsFailed for how it's done today)
 */

/*
 * This module contains helpers for managing the task manager storage layer.
 */
import type { estypes } from '@elastic/elasticsearch';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';

import apm from 'elastic-apm-node';
import { Subject, Observable } from 'rxjs';

import { TaskTypeDictionary } from '../task_type_dictionary';
import { TaskClaimerOpts, ClaimOwnershipResult } from '.';
import {
  TaskPriority,
  ConcreteTaskInstance,
  TaskStatus,
  ConcreteTaskInstanceVersion,
} from '../task';
import { TASK_MANAGER_TRANSACTION_TYPE } from '../task_running';
import {
  isLimited,
  TASK_MANAGER_MARK_AS_CLAIMED,
  TaskClaimingBatches,
} from '../queries/task_claiming';
import { TaskClaim, startTaskTimer } from '../task_events';
import { shouldBeOneOf, mustBeAllOf, filterDownBy, matchesClauses } from '../queries/query_clauses';

import {
  IdleTaskWithExpiredRunAt,
  InactiveTasks,
  RunningOrClaimingTaskWithExpiredRetryAt,
  SortByRunAtAndRetryAt,
  EnabledTask,
  OneOfTaskTypes,
  RecognizedTask,
} from '../queries/mark_available_tasks_as_claimed';

import { TaskStore, SearchOpts } from '../task_store';
import { isOk } from '../lib/result_type';

interface OwnershipClaimingOpts {
  claimOwnershipUntil: Date;
  size: number;
  taskTypes: Set<string>;
  removedTypes: Set<string>;
  excludedTypes: Set<string>;
  taskStore: TaskStore;
  events$: Subject<TaskClaim>;
  definitions: TaskTypeDictionary;
  taskMaxAttempts: Record<string, number>;
}

const SIZE_MULTIPLIER_FOR_TASK_FETCH = 4;

export function claimAvailableTasksMget(opts: TaskClaimerOpts): Observable<ClaimOwnershipResult> {
  const taskClaimOwnership$ = new Subject<ClaimOwnershipResult>();

  claimAvailableTasksApm(opts)
    .then((result) => {
      taskClaimOwnership$.next(result);
    })
    .catch((err) => {
      taskClaimOwnership$.error(err);
    })
    .finally(() => {
      taskClaimOwnership$.complete();
    });

  return taskClaimOwnership$;
}

async function claimAvailableTasksApm(opts: TaskClaimerOpts): Promise<ClaimOwnershipResult> {
  const apmTrans = apm.startTransaction(
    TASK_MANAGER_MARK_AS_CLAIMED,
    TASK_MANAGER_TRANSACTION_TYPE
  );

  try {
    const result = await claimAvailableTasks(opts);
    apmTrans.end('success');
    return result;
  } catch (err) {
    apmTrans.end('failure');
    throw err;
  }
}

async function claimAvailableTasks(opts: TaskClaimerOpts): Promise<ClaimOwnershipResult> {
  const { getCapacity, claimOwnershipUntil, batches, events$, taskStore } = opts;
  const { definitions, unusedTypes, excludedTaskTypes, taskMaxAttempts } = opts;
  const { logger } = opts;
  const loggerTag = claimAvailableTasksMget.name;
  const logMeta = { tags: [loggerTag] };
  const initialCapacity = getCapacity();
  const stopTaskTimer = startTaskTimer();

  const removedTypes = new Set(unusedTypes); // REMOVED_TYPES
  const excludedTypes = new Set(excludedTaskTypes); // excluded via config
  const { docs, versionMap } = await searchAvailableTasks({
    definitions,
    taskTypes: new Set(definitions.getAllTypes()),
    excludedTypes,
    removedTypes,
    taskStore,
    events$,
    claimOwnershipUntil,
    size: initialCapacity * SIZE_MULTIPLIER_FOR_TASK_FETCH,
    taskMaxAttempts,
  });

  if (docs.length === 0) return emptyClaimOwnershipResult();

  const currentTasks = new Set<ConcreteTaskInstance>();
  const staleTasks = new Set<ConcreteTaskInstance>();
  const missingTasks = new Set<ConcreteTaskInstance>();
  const removedTasks = new Set<ConcreteTaskInstance>();

  const docLatestVersions = await taskStore.getDocVersions(docs.map((doc) => `task:${doc.id}`));

  for (const searchDoc of docs) {
    if (removedTypes.has(searchDoc.taskType)) {
      removedTasks.add(searchDoc);
      continue;
    }

    const searchVersion = versionMap.get(searchDoc.id);
    const latestVersion = docLatestVersions.get(`task:${searchDoc.id}`);
    if (!searchVersion || !latestVersion) {
      missingTasks.add(searchDoc);
      continue;
    }

    if (
      searchVersion.seqNo === latestVersion.seqNo &&
      searchVersion.primaryTerm === latestVersion.primaryTerm
    ) {
      currentTasks.add(searchDoc);
      continue;
    } else {
      staleTasks.add(searchDoc);
      continue;
    }
  }

  const candidateTasks = applyLimitedConcurrency(currentTasks, batches);
  const taskUpdates: ConcreteTaskInstance[] = Array.from(candidateTasks)
    .slice(0, initialCapacity)
    .map((task) => {
      if (task.retryAt != null && new Date(task.retryAt).getTime() < Date.now()) {
        task.scheduledAt = task.retryAt;
      } else {
        task.scheduledAt = task.runAt;
      }
      task.retryAt = claimOwnershipUntil;
      task.ownerId = taskStore.taskManagerId;
      task.status = TaskStatus.Claiming;

      return task;
    });

  const finalResults: ConcreteTaskInstance[] = [];
  let conflicts = staleTasks.size;
  let bulkErrors = 0;

  try {
    const updateResults = await taskStore.bulkUpdate(taskUpdates, { validate: false });
    for (const updateResult of updateResults) {
      if (isOk(updateResult)) {
        finalResults.push(updateResult.value);
      } else {
        const { id, type, error } = updateResult.error;

        // this check is needed so error will be typed correctly for isConflictError
        if (SavedObjectsErrorHelpers.isSavedObjectsClientError(error)) {
          if (SavedObjectsErrorHelpers.isConflictError(error)) {
            conflicts++;
          } else {
            logger.warn(
              `Saved Object error updating task ${id}:${type} during claim: ${error.error}`,
              logMeta
            );
            bulkErrors++;
          }
        } else {
          logger.warn(`Error updating task ${id}:${type} during claim: ${error.message}`, logMeta);
          bulkErrors++;
        }
      }
    }
  } catch (err) {
    logger.warn(`Error updating tasks during claim: ${err}`, logMeta);
  }

  // separate update for removed tasks; shouldn't happen often, so unlikely
  // a performance concern, and keeps the rest of the logic simpler
  let removedCount = 0;
  if (removedTasks.size > 0) {
    const tasksToRemove = Array.from(removedTasks);
    for (const task of tasksToRemove) {
      task.status = TaskStatus.Unrecognized;
    }

    // don't worry too much about errors, we'll get them next time
    try {
      const removeResults = await taskStore.bulkUpdate(tasksToRemove, { validate: false });
      for (const removeResult of removeResults) {
        if (isOk(removeResult)) {
          removedCount++;
        } else {
          const { id, type, error } = removeResult.error;
          logger.warn(
            `Error updating task ${id}:${type} to mark as unrecognized during claim: ${error.message}`,
            logMeta
          );
        }
      }
    } catch (err) {
      logger.warn(`Error updating tasks to mark as unrecognized during claim: ${err}`, logMeta);
    }
  }

  const message = `task claimer claimed: ${finalResults.length}; stale: ${staleTasks.size}; conflicts: ${conflicts}; missing: ${missingTasks.size}; updateErrors: ${bulkErrors}; removed: ${removedCount};`;
  logger.debug(message, logMeta);

  return {
    stats: {
      tasksUpdated: finalResults.length,
      tasksConflicted: conflicts,
      tasksClaimed: finalResults.length,
    },
    docs: finalResults,
    timing: stopTaskTimer(),
  };
}

interface SearchAvailableTasksResponse {
  docs: ConcreteTaskInstance[];
  versionMap: Map<string, ConcreteTaskInstanceVersion>;
}

async function searchAvailableTasks({
  definitions,
  taskTypes,
  removedTypes,
  excludedTypes,
  taskStore,
  claimOwnershipUntil,
  size,
  taskMaxAttempts,
}: OwnershipClaimingOpts): Promise<SearchAvailableTasksResponse> {
  const searchedTypes = Array.from(taskTypes)
    .concat(Array.from(removedTypes))
    .filter((type) => !excludedTypes.has(type));
  const queryForScheduledTasks = mustBeAllOf(
    // Task must be enabled
    EnabledTask,
    // a task type that's not excluded (may be removed or not)
    OneOfTaskTypes('task.taskType', searchedTypes),
    // Either a task with idle status and runAt <= now or
    // status running or claiming with a retryAt <= now.
    shouldBeOneOf(IdleTaskWithExpiredRunAt, RunningOrClaimingTaskWithExpiredRetryAt),
    // must have a status that isn't 'unrecognized'
    RecognizedTask
  );

  const sort: NonNullable<SearchOpts['sort']> = getClaimSort(definitions);
  const query = matchesClauses(queryForScheduledTasks, filterDownBy(InactiveTasks));

  // console.log(`query: ${JSON.stringify(query, null, 4)}`);
  return await taskStore.fetch({
    query,
    sort,
    size,
    seq_no_primary_term: true,
  });
}

function getClaimSort(definitions: TaskTypeDictionary): estypes.SortCombinations[] {
  // Sort by descending priority, then by ascending runAt/retryAt time
  if (definitions.size() === 0) {
    return [SortByRunAtAndRetryAt];
  }

  return [
    {
      _script: {
        type: 'number',
        order: 'desc',
        script: {
          lang: 'painless',
          // Use priority if explicitly specified in task definition, otherwise default to 50 (Normal)
          // TODO: we could do this locally as well, but they may starve
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

function applyLimitedConcurrency(
  tasks: Set<ConcreteTaskInstance>,
  batches: TaskClaimingBatches
): Set<ConcreteTaskInstance> {
  // create a map of task type - concurrency
  const limitedBatches = batches.filter(isLimited);
  const limitedMap = new Map<string, number>();
  for (const limitedBatch of limitedBatches) {
    const { tasksTypes, concurrency } = limitedBatch;
    limitedMap.set(tasksTypes, concurrency);
  }

  // apply the limited concurrency
  const result = new Set<ConcreteTaskInstance>();
  for (const task of tasks) {
    const concurrency = limitedMap.get(task.taskType);
    if (concurrency == null) {
      result.add(task);
      continue;
    }

    if (concurrency > 0) {
      result.add(task);
      limitedMap.set(task.taskType, concurrency - 1);
    }
  }

  return result;
}
