/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { registerCollectors } from './server/lib/collectors';
import { registerTasks, scheduleTasks } from './server/lib/tasks';

export const coreTelemetry = (kibana) => {
  return new kibana.Plugin({
    id: 'core_telemetry',
    require: ['elasticsearch', 'xpack_main', 'task_manager'],

    init(server) {
      registerCollectors(server);
      registerTasks(server);
      scheduleTasks(server);
    }
  });
};
