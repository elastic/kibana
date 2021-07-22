/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get } from 'lodash';
import { PluginConfigDescriptor, PluginInitializerContext } from 'src/core/server';
import { TaskManagerPlugin } from './plugin';
import { configSchema, TaskManagerConfig, MAX_WORKERS_LIMIT } from './config';

export const plugin = (initContext: PluginInitializerContext) => new TaskManagerPlugin(initContext);

export {
  TaskInstance,
  ConcreteTaskInstance,
  EphemeralTask,
  TaskRunCreatorFunction,
  TaskStatus,
  RunContext,
} from './task';

export { asInterval } from './lib/intervals';
export {
  isUnrecoverableError,
  throwUnrecoverableError,
  isEphemeralTaskRejectedDueToCapacityError,
} from './task_running';
export { RunNowResult } from './task_scheduling';

export {
  TaskManagerPlugin as TaskManager,
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from './plugin';

export const config: PluginConfigDescriptor<TaskManagerConfig> = {
  schema: configSchema,
  deprecations: () => [
    (settings, fromPath, addDeprecation) => {
      const taskManager = get(settings, fromPath);
      if (taskManager?.index) {
        addDeprecation({
          documentationUrl: 'https://ela.st/kbn-remove-legacy-multitenancy',
          message: `"${fromPath}.index" is deprecated. Multitenancy by changing "kibana.index" will not be supported starting in 8.0. See https://ela.st/kbn-remove-legacy-multitenancy for more details`,
          correctiveActions: {
            manualSteps: [
              `If you rely on this setting to achieve multitenancy you should use Spaces, cross-cluster replication, or cross-cluster search instead.`,
              `To migrate to Spaces, we encourage using saved object management to export your saved objects from a tenant into the default tenant in a space.`,
            ],
          },
        });
      }
      if (taskManager?.max_workers > MAX_WORKERS_LIMIT) {
        addDeprecation({
          message: `setting "${fromPath}.max_workers" (${taskManager?.max_workers}) greater than ${MAX_WORKERS_LIMIT} is deprecated. Values greater than ${MAX_WORKERS_LIMIT} will not be supported starting in 8.0.`,
          correctiveActions: {
            manualSteps: [
              `Maximum allowed value of "${fromPath}.max_workers" is ${MAX_WORKERS_LIMIT}.` +
                `Replace "${fromPath}.max_workers: ${taskManager?.max_workers}" with (${MAX_WORKERS_LIMIT}).`,
            ],
          },
        });
      }
    },
  ],
};
