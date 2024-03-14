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
import { Subject } from 'rxjs';

import { asOk, isOk, isErr } from '../lib/result_type';
import { TaskTypeDictionary } from '../task_type_dictionary';
import { TaskClaimerOpts, ClaimOwnershipResult } from '.';
import { ConcreteTaskInstance, TaskPriority, TaskStatus } from '../task';
import { TaskClaim, asTaskClaimEvent, startTaskTimer } from '../task_events';
import { shouldBeOneOf, mustBeAllOf, filterDownBy, matchesClauses } from '../queries/query_clauses';

import {
  IdleTaskWithExpiredRunAt,
  InactiveTasks,
  RunningOrClaimingTaskWithExpiredRetryAt,
  SortByRunAtAndRetryAt,
  tasksOfType,
  EnabledTask,
} from '../queries/mark_available_tasks_as_claimed';

import { correctVersionConflictsForContinuation, SearchOpts } from '../task_store';

export async function claimAvailableTasksDefault(
  opts: TaskClaimerOpts
): Promise<ClaimOwnershipResult> {
  const { getCapacity, batches, events$, taskStore } = opts;
  const initialCapacity = getCapacity();
  const stopTaskTimer = startTaskTimer();

  // TODO: Start apm transaction?

  try {
    const results = await Promise.all(
      batches
        .map((batch) => {
          const size = batch.size();
          if (size > 0) {
            return searchForTasks(size, batch.types, opts);
          }
        })
        .filter((p): p is Promise<ConcreteTaskInstance[]> => !!p)
    );

    const docsToUpdate = processResultFromSearches(opts, results);

    if (docsToUpdate.length === 0) {
      return {
        stats: {
          tasksUpdated: 0,
          tasksConflicted: 0,
          tasksClaimed: 0,
        },
        docs: [],
        timing: stopTaskTimer(),
      };
    }

    const bulkUpdateResults = await taskStore.bulkUpdate(docsToUpdate, { validate: false });

    // TODO: End apm transaction?

    const claimedDocs = bulkUpdateResults.filter(isOk).map((result) => result.value);
    const numOfVersionConflicts = bulkUpdateResults
      .filter(isErr)
      .filter((result) => result.error.error.error === 'Conflict').length;

    emitEvents(
      events$,
      claimedDocs.map((doc) => asTaskClaimEvent(doc.id, asOk(doc)))
    );

    return {
      stats: {
        tasksUpdated: claimedDocs.length,
        tasksConflicted: correctVersionConflictsForContinuation(
          claimedDocs.length,
          numOfVersionConflicts,
          initialCapacity
        ),
        tasksClaimed: claimedDocs.length,
      },
      docs: claimedDocs,
      timing: stopTaskTimer(),
    };
  } catch (e) {
    // TODO: End apm transaction?
    throw e;
  }
}

function processResultFromSearches(
  opts: TaskClaimerOpts,
  results: ConcreteTaskInstance[][]
): ConcreteTaskInstance[] {
  const { getCapacity, claimOwnershipUntil, taskStore } = opts;
  const { definitions, unusedTypes } = opts;
  // Calculate capacity again in case more capacity opened up since the search queries started
  let availableCapacity = getCapacity();
  const docsToUpdate: ConcreteTaskInstance[] = [];

  const sortedResults = ([] as ConcreteTaskInstance[]).concat(...results).sort((a, b) => {
    const aTaskDef = definitions.get(a.taskType);
    const bTaskDef = definitions.get(b.taskType);
    const aPriority =
      typeof aTaskDef.priority === 'number' ? aTaskDef.priority : TaskPriority.Normal;
    const bPriority =
      typeof bTaskDef.priority === 'number' ? bTaskDef.priority : TaskPriority.Normal;
    if (aPriority === bPriority) {
      return aTaskDef.workerCost - bTaskDef.workerCost;
    }
    return bPriority - aPriority;
  });

  for (const doc of sortedResults) {
    if (availableCapacity - definitions.get(doc.taskType).workerCost >= 0) {
      const updates: Partial<ConcreteTaskInstance> = {};
      if (unusedTypes.includes(doc.taskType)) {
        updates.status = TaskStatus.Unrecognized;
      } else {
        if (doc.retryAt && doc.retryAt < new Date()) {
          updates.scheduledAt = doc.retryAt || undefined;
        } else {
          updates.scheduledAt = doc.runAt;
        }

        // TODO: We should be able to set them directly to running at this point
        updates.status = TaskStatus.Claiming;
        updates.ownerId = taskStore.taskManagerId;
        updates.retryAt = claimOwnershipUntil;
      }

      docsToUpdate.push({ ...doc, ...updates });
      availableCapacity -= definitions.get(doc.taskType).workerCost;
    }
  }

  return docsToUpdate;
}

function emitEvents(events$: Subject<TaskClaim>, events: TaskClaim[]) {
  events.forEach((event) => events$.next(event));
}

async function searchForTasks(
  size: number,
  types: string[],
  { definitions, taskStore }: TaskClaimerOpts
): Promise<ConcreteTaskInstance[]> {
  const queryForScheduledTasks = mustBeAllOf(
    // Task must be enabled
    EnabledTask,
    // Either a task with idle status and runAt <= now or
    // status running or claiming with a retryAt <= now.
    shouldBeOneOf(IdleTaskWithExpiredRunAt, RunningOrClaimingTaskWithExpiredRetryAt),
    tasksOfType(types)
  );

  const sort: NonNullable<SearchOpts['sort']> = getClaimSort(definitions);
  const query = matchesClauses(queryForScheduledTasks, filterDownBy(InactiveTasks));

  const searchResult = await taskStore.fetch({ query, sort, size, seq_no_primary_term: true });

  return searchResult.docs;
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
