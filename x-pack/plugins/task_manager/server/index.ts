/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get } from 'lodash';
import { PluginConfigDescriptor, PluginInitializerContext } from 'src/core/server';
import { TaskManagerPlugin } from './plugin';
import { configSchema, TaskManagerConfig, MAX_WORKERS_LIMIT } from './config';

export const plugin = (initContext: PluginInitializerContext) => new TaskManagerPlugin(initContext);

export {
  TaskInstance,
  ConcreteTaskInstance,
  TaskRunCreatorFunction,
  TaskStatus,
  RunContext,
} from './task';

export { isUnrecoverableError, throwUnrecoverableError } from './task_running';

export {
  TaskManagerPlugin as TaskManager,
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from './plugin';

export const config: PluginConfigDescriptor<TaskManagerConfig> = {
  schema: configSchema,
  deprecations: () => [
    (settings, fromPath, log) => {
      const taskManager = get(settings, fromPath);
      if (taskManager?.index) {
        log(
          `"${fromPath}.index" is deprecated. Multitenancy by changing "kibana.index" will not be supported starting in 8.0. See https://ela.st/kbn-remove-legacy-multitenancy for more details`
        );
      }
      if (taskManager?.max_workers > MAX_WORKERS_LIMIT) {
        log(
          `setting "${fromPath}.max_workers" (${taskManager?.max_workers}) greater than ${MAX_WORKERS_LIMIT} is deprecated. Values greater than ${MAX_WORKERS_LIMIT} will not be supported starting in 8.0.`
        );
      }
      return settings;
    },
  ],
};
