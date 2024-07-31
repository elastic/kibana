/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Basic operation of this task claimer:
// - search for candidate tasks to run, more than we actually can run
// - for each task found, do an mget to get the current seq_no and primary_term
// - if the mget result doesn't match the search result, the task is stale
// - from the non-stale search results, return as many as we can run

import { SavedObjectsErrorHelpers } from '@kbn/core/server';

import apm from 'elastic-apm-node';
import { Subject, Observable } from 'rxjs';

import { TaskTypeDictionary } from '../task_type_dictionary';
import { TaskClaimerOpts, ClaimOwnershipResult, getEmptyClaimOwnershipResult } from '.';
import { ConcreteTaskInstance, TaskStatus, ConcreteTaskInstanceVersion } from '../task';
import { TASK_MANAGER_TRANSACTION_TYPE } from '../task_running';
import {
  isLimited,
  TASK_MANAGER_MARK_AS_CLAIMED,
  TaskClaimingBatches,
} from '../queries/task_claiming';
import { TaskClaim, asTaskClaimEvent, startTaskTimer } from '../task_events';
import { shouldBeOneOf, mustBeAllOf, filterDownBy, matchesClauses } from '../queries/query_clauses';

import {
  IdleTaskWithExpiredRunAt,
  InactiveTasks,
  RunningOrClaimingTaskWithExpiredRetryAt,
  getClaimSort,
  EnabledTask,
  OneOfTaskTypes,
  RecognizedTask,
  tasksWithPartitions,
} from '../queries/mark_available_tasks_as_claimed';

import { TaskStore, SearchOpts } from '../task_store';
import { isOk, asOk } from '../lib/result_type';
import { TaskPartitioner } from '../lib/task_partitioner';

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
  taskPartitioner: TaskPartitioner;
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
  const { getCapacity, claimOwnershipUntil, batches, events$, taskStore, taskPartitioner } = opts;
  const { definitions, unusedTypes, excludedTaskTypes, taskMaxAttempts } = opts;
  const { logger } = opts;
  const loggerTag = claimAvailableTasksMget.name;
  const logMeta = { tags: [loggerTag] };
  const initialCapacity = getCapacity();
  const stopTaskTimer = startTaskTimer();

  const removedTypes = new Set(unusedTypes); // REMOVED_TYPES
  const excludedTypes = new Set(excludedTaskTypes); // excluded via config

  // get a list of candidate tasks to claim, with their version info
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
    taskPartitioner,
  });

  if (docs.length === 0)
    return {
      ...getEmptyClaimOwnershipResult(),
      timing: stopTaskTimer(),
    };

  // use mget to get the latest version of each task
  const docLatestVersions = await taskStore.getDocVersions(docs.map((doc) => `task:${doc.id}`));

  // filter out stale, missing and removed tasks
  const currentTasks: ConcreteTaskInstance[] = [];
  const staleTasks: ConcreteTaskInstance[] = [];
  const missingTasks: ConcreteTaskInstance[] = [];
  const removedTasks: ConcreteTaskInstance[] = [];

  for (const searchDoc of docs) {
    if (removedTypes.has(searchDoc.taskType)) {
      removedTasks.push(searchDoc);
      continue;
    }

    const searchVersion = versionMap.get(searchDoc.id);
    const latestVersion = docLatestVersions.get(`task:${searchDoc.id}`);
    if (!searchVersion || !latestVersion) {
      missingTasks.push(searchDoc);
      continue;
    }

    if (
      searchVersion.seqNo === latestVersion.seqNo &&
      searchVersion.primaryTerm === latestVersion.primaryTerm
    ) {
      currentTasks.push(searchDoc);
      continue;
    } else {
      staleTasks.push(searchDoc);
      continue;
    }
  }
  // apply limited concurrency limits (TODO: can currently starve other tasks)
  const candidateTasks = applyLimitedConcurrency(currentTasks, batches);

  // build the updated task objects we'll claim
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

  // perform the task object updates, deal with errors
  const finalResults: ConcreteTaskInstance[] = [];
  let conflicts = staleTasks.length;
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
  if (removedTasks.length > 0) {
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

  // TODO: need a better way to generate stats
  const message = `task claimer claimed: ${finalResults.length}; stale: ${staleTasks.length}; conflicts: ${conflicts}; missing: ${missingTasks.length}; updateErrors: ${bulkErrors}; removed: ${removedCount};`;
  logger.debug(message, logMeta);

  // build results
  const finalResult = {
    stats: {
      tasksUpdated: finalResults.length,
      tasksConflicted: conflicts,
      tasksClaimed: finalResults.length,
    },
    docs: finalResults,
    timing: stopTaskTimer(),
  };

  for (const doc of finalResults) {
    events$.next(asTaskClaimEvent(doc.id, asOk(doc), finalResult.timing));
  }

  return finalResult;
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
  size,
  taskPartitioner,
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
  const partitions = await taskPartitioner.getPartitions();

  const sort: NonNullable<SearchOpts['sort']> = getClaimSort(definitions);
  const query = matchesClauses(
    queryForScheduledTasks,
    filterDownBy(InactiveTasks),
    tasksWithPartitions(partitions)
  );

  return await taskStore.fetch({
    query,
    sort,
    size,
    seq_no_primary_term: true,
  });
}

function applyLimitedConcurrency(
  tasks: ConcreteTaskInstance[],
  batches: TaskClaimingBatches
): ConcreteTaskInstance[] {
  // create a map of task type - concurrency
  const limitedBatches = batches.filter(isLimited);
  const limitedMap = new Map<string, number>();
  for (const limitedBatch of limitedBatches) {
    const { tasksTypes, concurrency } = limitedBatch;
    limitedMap.set(tasksTypes, concurrency);
  }

  // apply the limited concurrency
  const result: ConcreteTaskInstance[] = [];
  for (const task of tasks) {
    const concurrency = limitedMap.get(task.taskType);
    if (concurrency == null) {
      result.push(task);
      continue;
    }

    if (concurrency > 0) {
      result.push(task);
      limitedMap.set(task.taskType, concurrency - 1);
    }
  }

  return result;
}
