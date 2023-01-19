/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectError } from '@kbn/core-saved-objects-common';
import { ConcreteTaskInstance } from '../task';
import { TaskStore, BulkUpdateResult, BulkGetResult } from '../task_store';
import { isErr, isOk, asErr } from './result_type';
import { BulkUpdateTaskResult } from '../task_scheduling';

export const MAX_RETRIES = 2;

export interface RetryableBulkUpdateOpts {
  taskIds: string[];
  getTasks: (taskIds: string[]) => Promise<BulkGetResult>;
  filter: (task: ConcreteTaskInstance) => boolean;
  map: (task: ConcreteTaskInstance) => ConcreteTaskInstance;
  store: TaskStore;
}

export async function retryableBulkUpdate({
  taskIds,
  getTasks,
  filter,
  map,
  store,
}: RetryableBulkUpdateOpts): Promise<BulkUpdateTaskResult> {
  const resultMap: Record<string, BulkUpdateResult> = {};
  const tasksToUpdate = (await getTasks(taskIds))
    .reduce<ConcreteTaskInstance[]>((acc, task) => {
      if (isErr(task)) {
        resultMap[task.error.id] = buildBulkUpdateErr(task.error);
      } else {
        acc.push(task.value);
      }
      return acc;
    }, [])
    .filter(filter)
    .map(map);
  const bulkUpdateResult = await store.bulkUpdate(tasksToUpdate);
  for (const result of bulkUpdateResult) {
    const taskId = getId(result);
    resultMap[taskId] = result;
  }

  let retry = 1;
  while (retry++ <= MAX_RETRIES && getRetriableTaskIds(resultMap).length > 0) {
    const retriesToGet = getRetriableTaskIds(resultMap);
    const retriesToUpdate = (await getTasks(retriesToGet))
      .reduce<ConcreteTaskInstance[]>((acc, task) => {
        if (isErr(task)) {
          resultMap[task.error.id] = buildBulkUpdateErr(task.error);
        } else {
          acc.push(task.value);
        }
        return acc;
      }, [])
      .filter(filter)
      .map(map);
    const retryResult = await store.bulkUpdate(retriesToUpdate);
    for (const result of retryResult) {
      const taskId = getId(result);
      resultMap[taskId] = result;
    }
  }

  return Object.values(resultMap).reduce<BulkUpdateTaskResult>(
    (acc, result) => {
      if (isOk(result)) {
        acc.tasks.push(result.value);
      } else {
        acc.errors.push({ error: result.error.error, task: result.error.entity });
      }
      return acc;
    },
    { tasks: [], errors: [] }
  );
}

function getId(bulkUpdateResult: BulkUpdateResult): string {
  return isOk(bulkUpdateResult) ? bulkUpdateResult.value.id : bulkUpdateResult.error.error.id;
}

function getRetriableTaskIds(resultMap: Record<string, BulkUpdateResult>) {
  return Object.values(resultMap)
    .filter((result) => isErr(result) && result.error.error.error.statusCode === 409)
    .map((result) => getId(result));
}

function buildBulkUpdateErr(error: { type: string; id: string; error: SavedObjectError }) {
  return asErr({
    error: {
      id: error.id,
      type: error.type,
      error: {
        error: error.error.error,
        statusCode: error.error.statusCode,
        message: error.error.message,
        ...(error.error.metadata ? error.error.metadata : {}),
      },
    },
  });
}
