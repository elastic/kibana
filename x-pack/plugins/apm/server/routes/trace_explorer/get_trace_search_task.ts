/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TaskManagerStartContract } from '../../../../task_manager/server';
import { isTaskSavedObjectNotFoundError } from '../../../../task_manager/server';
import { TraceSearchParams } from '../../../common/trace_explorer/trace_data_search_state';
import { getTraceSearchTaskId } from './get_task_id';

export function getTraceSearchTask({
  id,
  taskManagerStart,
}: {
  id: string;
  taskManagerStart: TaskManagerStartContract;
}) {
  return taskManagerStart.get(id).catch((err) => {
    if (isTaskSavedObjectNotFoundError(err, id)) {
      return undefined;
    }
    throw err;
  });
}
