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
import { isRetryableError, TASK_MANAGER_TRANSACTION_TYPE } from '../task_running';
import {
  isLimited,
  TASK_MANAGER_MARK_AS_CLAIMED,
  TaskClaimingBatches,
} from '../queries/task_claiming';
import { TaskClaim } from '../task_events';
import { shouldBeOneOf, mustBeAllOf, filterDownBy, matchesClauses } from '../queries/query_clauses';
import { TaskPartitioner } from '../lib/task_partitioner';
import type { PartialConcreteTaskInstance } from '../task_store';

import {
  IdleTaskWithExpiredRunAt,
  InactiveTasks,
  RunningOrClaimingTaskWithExpiredRetryAt,
  SortByRunAtAndRetryAt,
  EnabledTask,
  tasksWithPartition,
} from '../queries/mark_available_tasks_as_claimed';

import { TaskStore, SearchOpts } from '../task_store';
import { isOk } from '../lib/result_type';
import { intervalFromDate, maxIntervalFromDate } from '../lib/intervals';

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
  taskPartitioner: TaskPartitioner;
}

const SIZE_MULTIPLIER_FOR_TASK_FETCH = 4;

type PartialSearchConcreteTaskInstance = PartialConcreteTaskInstance & {
  taskType: ConcreteTaskInstance['taskType'];
  attempts: ConcreteTaskInstance['attempts'];
};

export function claimAvailableTasksMget(opts: TaskClaimerOpts): Observable<ClaimOwnershipResult> {
  const taskClaimOwnership$ = new Subject<ClaimOwnershipResult>();

  claimAvailableTasks(opts)
    .then((result) => {
      taskClaimOwnership$.next(result);
    })
    .catch((err) => {
      taskClaimOwnership$.next(err);
    })
    .finally(() => {
      taskClaimOwnership$.complete();
    });

  return taskClaimOwnership$;
}

async function claimAvailableTasks(opts: TaskClaimerOpts): Promise<ClaimOwnershipResult> {
  const apmTrans = apm.startTransaction(
    TASK_MANAGER_MARK_AS_CLAIMED,
    TASK_MANAGER_TRANSACTION_TYPE
  );

  try {
    const { getCapacity, claimOwnershipUntil, batches, events$, taskStore } = opts;
    const { definitions, unusedTypes, excludedTaskTypes, taskMaxAttempts, taskPartitioner } = opts;
    const initialCapacity = getCapacity();

    const { docs, versionMap } = await searchAvailableTasks({
      definitions,
      excludedTaskTypes,
      taskStore,
      events$,
      claimOwnershipUntil,
      size: initialCapacity * SIZE_MULTIPLIER_FOR_TASK_FETCH,
      taskTypes: new Set(),
      unusedTypes,
      taskMaxAttempts,
      taskPartitioner,
    });

    if (docs.length === 0) {
      // eslint-disable-next-line no-console
      console.log(`*** Room for ${initialCapacity} tasks and claimed 0 tasks.`);
      return emptyClaimOwnershipResult();
    }

    const currentTasks = new Set<PartialSearchConcreteTaskInstance>();
    const staleTasks = new Set<PartialSearchConcreteTaskInstance>();
    const missingTasks = new Set<PartialSearchConcreteTaskInstance>();

    const docLatestVersions = await taskStore.getDocVersions(docs.map((doc) => `task:${doc.id}`));

    for (const searchDoc of docs) {
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

    // for (const doc of missingTasks) {
    //   // eslint-disable-next-line no-console
    //   console.log(`Task ${doc.id} is missing from the task store or something`);
    // }

    // for (const doc of staleTasks) {
    //   // eslint-disable-next-line no-console
    //   console.log(`Task ${doc.id} is stale`);
    // }

    const candidateTasks = applyLimitedConcurrency(currentTasks, batches);
    const now = new Date();
    const taskUpdates: PartialConcreteTaskInstance[] = Array.from(candidateTasks)
      .slice(0, initialCapacity)
      .map((task) => {
        return {
          id: task.id,
          version: task.version,
          status: TaskStatus.Running,
          startedAt: now,
          attempts: task.attempts + 1,
          ownerId: taskStore.taskManagerId,
          scheduledAt:
            task.retryAt != null && new Date(task.retryAt).getTime() < Date.now()
              ? task.retryAt
              : task.runAt,
          retryAt:
            (task.schedule
              ? maxIntervalFromDate(now, task.schedule.interval, '5m')
              : getRetryDelay({
                  attempts: task.attempts + 1,
                  error: new Error('Task timeout'),
                  addDuration: '5m',
                })) ?? null,
        };
      });

    // const finalResults: ConcreteTaskInstance[] = [];
    const idsToMget: string[] = [];
    let conflicts = staleTasks.size;
    try {
      const updateResults = await taskStore.bulkPartialUpdate(taskUpdates);
      for (const updateResult of updateResults) {
        if (isOk(updateResult)) {
          idsToMget.push(updateResult.value.id);
        } else {
          conflicts++;
          const { id, type, error } = updateResult.error;
          // eslint-disable-next-line no-console
          console.log(`Error updating task ${id}:${type} during claim: ${error.message}`);
        }
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.log(`Error updating tasks during claim: ${err}`);
    }

    const finalResults = (await taskStore.bulkGet(idsToMget))
      .map((item) => {
        if (isOk(item)) {
          return item.value;
        } else {
          // eslint-disable-next-line no-console
          console.log('Failed to mget task', item.error.id, item.error.error.message);
        }
      })
      .filter((item): item is ConcreteTaskInstance => !!item);

    apmTrans.end('success');

    // eslint-disable-next-line no-console
    console.log(`*** Room for ${initialCapacity} tasks and claimed ${finalResults.length} tasks.`);
    return {
      stats: {
        tasksUpdated: finalResults.length,
        tasksConflicted: conflicts,
        tasksClaimed: finalResults.length,
      },
      docs: finalResults,
    };
  } catch (e) {
    apmTrans.end('failure');
    throw e;
  }
}

interface SearchAvailableTasksResponse {
  docs: PartialSearchConcreteTaskInstance[];
  versionMap: Map<string, ConcreteTaskInstanceVersion>;
}

async function searchAvailableTasks({
  definitions,
  excludedTaskTypes,
  taskStore,
  claimOwnershipUntil,
  size,
  taskTypes,
  unusedTypes,
  taskMaxAttempts,
  taskPartitioner,
}: OwnershipClaimingOpts): Promise<SearchAvailableTasksResponse> {
  // TODO: handle excludedTaskTypes
  // const { taskTypesToSkip = [], taskTypesToClaim = [] } = groupBy(
  //   definitions.getAllTypes(),
  //   (type) =>
  //     taskTypes.has(type) && !isTaskTypeExcluded(excludedTaskTypes, type)
  //       ? 'taskTypesToClaim'
  //       : 'taskTypesToSkip'
  // );
  const partitions = await taskPartitioner.getPartitions();
  // console.log('Running claiming on partitions:', JSON.stringify(partitions));
  const queryForScheduledTasks = mustBeAllOf(
    // Task must be enabled
    EnabledTask,
    // Either a task with idle status and runAt <= now or
    // status running or claiming with a retryAt <= now.
    shouldBeOneOf(IdleTaskWithExpiredRunAt, RunningOrClaimingTaskWithExpiredRetryAt)
  );

  const sort: NonNullable<SearchOpts['sort']> = getClaimSort(definitions);
  const query = matchesClauses(
    queryForScheduledTasks,
    filterDownBy(InactiveTasks, tasksWithPartition(partitions))
  );

  return (await taskStore.partialSearch({
    query,
    sort,
    size,
    seq_no_primary_term: true,
    fields: ['taskType', 'attempts'],
  })) as SearchAvailableTasksResponse;
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
  tasks: Set<PartialSearchConcreteTaskInstance>,
  batches: TaskClaimingBatches
): Set<PartialSearchConcreteTaskInstance> {
  // create a map of task type - concurrency
  const limitedBatches = batches.filter(isLimited);
  const limitedMap = new Map<string, number>();
  for (const limitedBatch of limitedBatches) {
    const { tasksTypes, concurrency } = limitedBatch;
    limitedMap.set(tasksTypes, concurrency);
  }

  // apply the limited concurrency
  const result = new Set<PartialSearchConcreteTaskInstance>();
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

function getRetryDelay({
  error,
  attempts,
  addDuration,
}: {
  error: Error;
  attempts: number;
  addDuration?: string;
}): Date | undefined {
  const retry: boolean | Date = isRetryableError(error) ?? true;

  let result;
  if (retry instanceof Date) {
    result = retry;
  } else if (retry === true) {
    result = new Date(Date.now() + calculateDelay(attempts));
  }

  // Add a duration to the result
  if (addDuration && result) {
    result = intervalFromDate(result, addDuration)!;
  }
  return result;
}

function calculateDelay(attempts: number) {
  if (attempts === 1) {
    return 30 * 1000; // 30s
  } else {
    // get multiples of 5 min
    const defaultBackoffPerFailure = 5 * 60 * 1000;
    return defaultBackoffPerFailure * Math.pow(2, attempts - 2);
  }
}
