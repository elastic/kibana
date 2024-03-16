/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RunContext, TaskManagerSetupContract } from '@kbn/task-manager-plugin/server';
import { BidirectionalSyncTaskFactory } from './task_factory';

// Should we have one per connector type?
const TASK_NAME = 'cases-connectors-bidi-sync';

export const registerBidirectionalSyncTask = ({
  taskManager,
}: {
  taskManager: TaskManagerSetupContract;
}) => {
  taskManager.registerTaskDefinitions({
    [TASK_NAME]: {
      title: 'Connectors bidirectional synchronization task for Cases',
      createTaskRunner: (context: RunContext) => {
        return new BidirectionalSyncTaskFactory().create();
      },
    },
  });
};
