/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Observable } from 'rxjs';
import { CoreSetup, Logger } from 'kibana/server';
import { PLUGIN_ID, VIS_TELEMETRY_TASK } from '../../../constants';
import { visualizationsTaskRunner } from './visualizations/task_runner';
import {
  TaskInstance,
  TaskManagerStartContract,
  TaskManagerSetupContract,
} from '../../../../task_manager/server';

export function registerTasks({
  taskManager,
  logger,
  getStartServices,
  config,
}: {
  taskManager?: TaskManagerSetupContract;
  logger: Logger;
  getStartServices: CoreSetup['getStartServices'];
  config: Observable<{ kibana: { index: string } }>;
}) {
  if (!taskManager) {
    logger.debug('Task manager is not available');
    return;
  }

  const esClientPromise = getStartServices().then(
    ([{ elasticsearch }]) => elasticsearch.legacy.client
  );

  taskManager.registerTaskDefinitions({
    [VIS_TELEMETRY_TASK]: {
      title: 'X-Pack telemetry calculator for Visualizations',
      type: VIS_TELEMETRY_TASK,
      createTaskRunner({ taskInstance }: { taskInstance: TaskInstance }) {
        return {
          run: visualizationsTaskRunner(taskInstance, config, esClientPromise),
          cancel: async () => {},
        };
      },
    },
  });
}

export async function scheduleTasks({
  taskManager,
  logger,
}: {
  taskManager?: TaskManagerStartContract;
  logger: Logger;
}) {
  if (!taskManager) {
    logger.debug('Task manager is not available');
    return;
  }

  try {
    await taskManager.ensureScheduled({
      id: `${PLUGIN_ID}-${VIS_TELEMETRY_TASK}`,
      taskType: VIS_TELEMETRY_TASK,
      state: { stats: {}, runs: 0 },
      params: {},
    });
  } catch (e) {
    logger.debug(`Error scheduling task, received ${e.message}`);
  }
}
