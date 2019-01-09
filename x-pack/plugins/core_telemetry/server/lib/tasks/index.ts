/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IHapiServer } from '../../../';
import { PLUGIN_ID, VIS_TELEMETRY_TASK } from '../../../constants';
import { visualizationsTaskRunner } from './visualizations/task_runner';

export function registerTasks(server: IHapiServer) {
  const { taskManager } = server;

  taskManager.registerTaskDefinitions({
    [VIS_TELEMETRY_TASK]: {
      title: 'X-Pack telemetry calculator for Visualizations',
      type: VIS_TELEMETRY_TASK,
      numWorkers: 10, // use the max so no other tasks run concurrently
      createTaskRunner({ taskInstance, kbnServer }: { kbnServer: any; taskInstance: any }) {
        return {
          run: visualizationsTaskRunner(taskInstance, kbnServer),
        };
      },
    },
  });
}

export function scheduleTasks(server: IHapiServer) {
  const { taskManager } = server;
  const { kbnServer } = server.plugins.xpack_main.status.plugin;

  kbnServer.afterPluginsInit(() => {
    taskManager.schedule({
      id: `${PLUGIN_ID}-${VIS_TELEMETRY_TASK}`,
      taskType: VIS_TELEMETRY_TASK,
      state: { stats: {}, runs: 0 },
    });
  });
}
