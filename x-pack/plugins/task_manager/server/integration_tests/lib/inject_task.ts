/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type ElasticsearchClient } from '@kbn/core/server';
import { type ConcreteTaskInstance } from '../../task';

export async function injectTask(
  esClient: ElasticsearchClient,
  { id, ...task }: ConcreteTaskInstance
) {
  const soId = `task:${id}`;
  await esClient.index({
    id: soId,
    index: '.kibana_task_manager',
    document: {
      references: [],
      type: 'task',
      updated_at: new Date().toISOString(),
      task: {
        ...task,
        state: JSON.stringify(task.state),
        params: JSON.stringify(task.params),
        runAt: task.runAt.toISOString(),
        scheduledAt: task.scheduledAt.toISOString(),
      },
    },
  });
}
