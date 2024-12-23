/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Basic operation of this task claimer:
// - search for candidate tasks to run, more than we actually can run
// - initial search returns a slimmer task document for I/O efficiency (no params or state)
// - for each task found, do an mget to get the current seq_no and primary_term
// - if the mget result doesn't match the search result, the task is stale
// - from the non-stale search results, return as many as we can run based on available
//   capacity and the cost of each task type to run

import apm, { Logger } from 'elastic-apm-node';
import { Subject } from 'rxjs';
import { createWrappedLogger } from '../lib/wrapped_logger';

import { TaskTypeDictionary } from '../task_type_dictionary';
import {
  TaskClaimerOpts,
  ClaimOwnershipResult,
  getEmptyClaimOwnershipResult,
  getExcludedTaskTypes,
} from '.';
import {
  ConcreteTaskInstance,
  TaskStatus,
  ConcreteTaskInstanceVersion,
  TaskCost,
  PartialConcreteTaskInstance,
} from '../task';
import { TASK_MANAGER_TRANSACTION_TYPE } from '../task_running';
import { TASK_MANAGER_MARK_AS_CLAIMED } from '../queries/task_claiming';
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
import { selectTasksByCapacity } from './lib/task_selector_by_capacity';
import { TaskPartitioner } from '../lib/task_partitioner';
import { getRetryAt } from '../lib/get_retry_at';

interface OwnershipClaimingOpts {
  claimOwnershipUntil: Date;
  size: number;
  taskTypes: Set<string>;
  getCapacity: (taskType?: string | undefined) => number;
  excludedTaskTypePatterns: string[];
  taskStore: TaskStore;
  events$: Subject<TaskClaim>;
  definitions: TaskTypeDictionary;
  taskMaxAttempts: Record<string, number>;
  taskPartitioner: TaskPartitioner;
  logger: Logger;
}

const SIZE_MULTIPLIER_FOR_TASK_FETCH = 4;

export async function claimAvailableTasksMget(
  opts: TaskClaimerOpts
): Promise<ClaimOwnershipResult> {
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
  const { definitions, excludedTaskTypes, taskMaxAttempts } = opts;
  const logger = createWrappedLogger({ logger: opts.logger, tags: [claimAvailableTasksMget.name] });
  const initialCapacity = getCapacity();
  const stopTaskTimer = startTaskTimer();

  // get a list of candidate tasks to claim, with their version info
  const { docs, versionMap } = await searchAvailableTasks({
    definitions,
    taskTypes: new Set(definitions.getAllTypes()),
    excludedTaskTypePatterns: excludedTaskTypes,
    taskStore,
    events$,
    claimOwnershipUntil,
    getCapacity,
    // set size to accommodate the possibility of retrieving all
    // tasks with the smallest cost, with a size multipler to account
    // for possible conflicts
    size: initialCapacity * TaskCost.Tiny * SIZE_MULTIPLIER_FOR_TASK_FETCH,
    taskMaxAttempts,
    taskPartitioner,
    logger,
  });

  if (docs.length === 0)
    return {
      ...getEmptyClaimOwnershipResult(),
      timing: stopTaskTimer(),
    };

  // use mget to get the latest version of each task
  const docLatestVersions = await taskStore.getDocVersions(docs.map((doc) => `task:${doc.id}`));

  // filter out stale and missing tasks
  const currentTasks: ConcreteTaskInstance[] = [];
  const staleTasks: ConcreteTaskInstance[] = [];
  const missingTasks: ConcreteTaskInstance[] = [];

  for (const searchDoc of docs) {
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
  const candidateTasks = selectTasksByCapacity(currentTasks, batches);

  // apply capacity constraint to candidate tasks
  const tasksToRun: ConcreteTaskInstance[] = [];
  const leftOverTasks: ConcreteTaskInstance[] = [];

  let capacityAccumulator = 0;
  for (const task of candidateTasks) {
    const taskCost = definitions.get(task.taskType)?.cost ?? TaskCost.Normal;
    if (capacityAccumulator + taskCost <= initialCapacity) {
      tasksToRun.push(task);
      capacityAccumulator += taskCost;
    } else {
      leftOverTasks.push(task);
      capacityAccumulator = initialCapacity;
    }
  }

  // build the updated task objects we'll claim
  const now = new Date();
  const taskUpdates: PartialConcreteTaskInstance[] = [];
  for (const task of tasksToRun) {
    taskUpdates.push({
      id: task.id,
      version: task.version,
      scheduledAt:
        task.retryAt != null && new Date(task.retryAt).getTime() < Date.now()
          ? task.retryAt
          : task.runAt,
      status: TaskStatus.Running,
      startedAt: now,
      attempts: task.attempts + 1,
      retryAt: getRetryAt(task, definitions.get(task.taskType)) ?? null,
      ownerId: taskStore.taskManagerId,
    });
  }

  // perform the task object updates, deal with errors
  const updatedTasks: Record<string, PartialConcreteTaskInstance> = {};
  let conflicts = 0;
  let bulkUpdateErrors = 0;
  let bulkGetErrors = 0;

  const updateResults = await taskStore.bulkPartialUpdate(taskUpdates);
  for (const updateResult of updateResults) {
    if (isOk(updateResult)) {
      updatedTasks[updateResult.value.id] = updateResult.value;
    } else {
      const { id, type, error, status } = updateResult.error;

      // check for 409 conflict errors
      if (status === 409) {
        conflicts++;
      } else {
        logger.error(`Error updating task ${id}:${type} during claim: ${JSON.stringify(error)}`);
        bulkUpdateErrors++;
      }
    }
  }

  // perform an mget to get the full task instance for claiming
  const fullTasksToRun = (await taskStore.bulkGet(Object.keys(updatedTasks))).reduce<
    ConcreteTaskInstance[]
  >((acc, task) => {
    if (isOk(task) && task.value.version !== updatedTasks[task.value.id].version) {
      logger.warn(
        `Task ${task.value.id} was modified during the claiming phase, skipping until the next claiming cycle.`
      );
      conflicts++;
    } else if (isOk(task)) {
      acc.push(task.value);
    } else {
      const { id, type, error } = task.error;
      logger.error(`Error getting full task ${id}:${type} during claim: ${error.message}`);
      bulkGetErrors++;
    }
    return acc;
  }, []);

  // TODO: need a better way to generate stats
  const message = `task claimer claimed: ${fullTasksToRun.length}; stale: ${staleTasks.length}; conflicts: ${conflicts}; missing: ${missingTasks.length}; capacity reached: ${leftOverTasks.length}; updateErrors: ${bulkUpdateErrors}; getErrors: ${bulkGetErrors};`;
  logger.debug(message);

  // build results
  const finalResult = {
    stats: {
      tasksUpdated: fullTasksToRun.length,
      tasksConflicted: conflicts,
      tasksClaimed: fullTasksToRun.length,
      tasksLeftUnclaimed: leftOverTasks.length,
      tasksErrors: bulkUpdateErrors + bulkGetErrors,
      staleTasks: staleTasks.length,
    },
    docs: fullTasksToRun,
    timing: stopTaskTimer(),
  };

  for (const doc of fullTasksToRun) {
    events$.next(asTaskClaimEvent(doc.id, asOk(doc), finalResult.timing));
  }

  return finalResult;
}

interface SearchAvailableTasksResponse {
  docs: ConcreteTaskInstance[];
  versionMap: Map<string, ConcreteTaskInstanceVersion>;
}

let lastPartitionWarningLog: number | undefined;
export const NO_ASSIGNED_PARTITIONS_WARNING_INTERVAL = 60000;

async function searchAvailableTasks({
  definitions,
  taskTypes,
  excludedTaskTypePatterns,
  taskStore,
  getCapacity,
  size,
  taskPartitioner,
  logger,
}: OwnershipClaimingOpts): Promise<SearchAvailableTasksResponse> {
  const excludedTaskTypes = new Set(getExcludedTaskTypes(definitions, excludedTaskTypePatterns));
  const claimPartitions = buildClaimPartitions({
    types: taskTypes,
    excludedTaskTypes,
    getCapacity,
    definitions,
  });
  const partitions = await taskPartitioner.getPartitions();
  if (
    partitions.length === 0 &&
    (lastPartitionWarningLog == null ||
      lastPartitionWarningLog <= Date.now() - NO_ASSIGNED_PARTITIONS_WARNING_INTERVAL)
  ) {
    logger.warn(
      `Background task node "${taskPartitioner.getPodName()}" has no assigned partitions, claiming against all partitions`
    );
    lastPartitionWarningLog = Date.now();
  }

  if (partitions.length !== 0 && lastPartitionWarningLog) {
    lastPartitionWarningLog = undefined;
    logger.info(
      `Background task node "${taskPartitioner.getPodName()}" now claiming with assigned partitions`
    );
  }

  const sort: NonNullable<SearchOpts['sort']> = getClaimSort(definitions);
  const searches: SearchOpts[] = [];

  // not handling removed types yet

  // add search for unlimited types
  if (claimPartitions.unlimitedTypes.length > 0) {
    const queryForUnlimitedTasks = mustBeAllOf(
      // Task must be enabled
      EnabledTask,
      // a task type that's not excluded (may be removed or not)
      OneOfTaskTypes('task.taskType', claimPartitions.unlimitedTypes),
      // Either a task with idle status and runAt <= now or
      // status running or claiming with a retryAt <= now.
      shouldBeOneOf(IdleTaskWithExpiredRunAt, RunningOrClaimingTaskWithExpiredRetryAt),
      // must have a status that isn't 'unrecognized'
      RecognizedTask
    );

    const queryUnlimitedTasks = matchesClauses(
      queryForUnlimitedTasks,
      filterDownBy(InactiveTasks),
      partitions.length ? tasksWithPartitions(partitions) : undefined
    );
    searches.push({
      query: queryUnlimitedTasks,
      sort, // note: we could optimize this to not sort on priority, for this case
      size,
      seq_no_primary_term: true,
    });
  }

  // add searches for limited types
  for (const [type, capacity] of claimPartitions.limitedTypes) {
    const queryForLimitedTasks = mustBeAllOf(
      // Task must be enabled
      EnabledTask,
      // Specific task type
      OneOfTaskTypes('task.taskType', [type]),
      // Either a task with idle status and runAt <= now or
      // status running or claiming with a retryAt <= now.
      shouldBeOneOf(IdleTaskWithExpiredRunAt, RunningOrClaimingTaskWithExpiredRetryAt),
      // must have a status that isn't 'unrecognized'
      RecognizedTask
    );

    const query = matchesClauses(
      queryForLimitedTasks,
      filterDownBy(InactiveTasks),
      partitions.length ? tasksWithPartitions(partitions) : undefined
    );
    searches.push({
      query,
      sort,
      size: capacity * SIZE_MULTIPLIER_FOR_TASK_FETCH,
      seq_no_primary_term: true,
    });
  }

  return await taskStore.msearch(searches);
}

interface ClaimPartitions {
  unlimitedTypes: string[];
  limitedTypes: Map<string, number>;
}

interface BuildClaimPartitionsOpts {
  types: Set<string>;
  excludedTaskTypes: Set<string>;
  getCapacity: (taskType?: string) => number;
  definitions: TaskTypeDictionary;
}

function buildClaimPartitions(opts: BuildClaimPartitionsOpts): ClaimPartitions {
  const result: ClaimPartitions = {
    unlimitedTypes: [],
    limitedTypes: new Map(),
  };

  const { types, excludedTaskTypes, getCapacity, definitions } = opts;
  for (const type of types) {
    const definition = definitions.get(type);
    if (definition == null) continue;

    if (excludedTaskTypes.has(type)) continue;

    if (definition.maxConcurrency == null) {
      result.unlimitedTypes.push(definition.type);
      continue;
    }

    const capacity = getCapacity(definition.type) / definition.cost;
    if (capacity !== 0) {
      result.limitedTypes.set(definition.type, capacity);
    }
  }

  return result;
}
