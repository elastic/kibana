/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get } from 'lodash';
import { PluginConfigDescriptor, PluginInitializerContext } from '@kbn/core/server';
import { configSchema, TaskManagerConfig, MAX_WORKERS_LIMIT } from './config';

export const plugin = async (initContext: PluginInitializerContext) => {
  const { TaskManagerPlugin } = await import('./plugin');
  return new TaskManagerPlugin(initContext);
};

export type {
  TaskInstance,
  ConcreteTaskInstance,
  EphemeralTask,
  TaskRunCreatorFunction,
  RunContext,
  IntervalSchedule,
} from './task';

export { TaskStatus, TaskPriority } from './task';

export type { TaskRegisterDefinition, TaskDefinitionRegistry } from './task_type_dictionary';

export { asInterval } from './lib/intervals';
export {
  isUnrecoverableError,
  throwUnrecoverableError,
  throwRetryableError,
  isEphemeralTaskRejectedDueToCapacityError,
  createTaskRunError,
  TaskErrorSource,
} from './task_running';

export type { DecoratedError } from './task_running';

export type { RunNowResult, BulkUpdateTaskResult } from './task_scheduling';
export { getOldestIdleActionTask } from './queries/oldest_idle_action_task';
export {
  IdleTaskWithExpiredRunAt,
  RunningOrClaimingTaskWithExpiredRetryAt,
} from './queries/mark_available_tasks_as_claimed';
export { aggregateTaskOverduePercentilesForType } from './queries/aggregate_task_overdue_percentiles_for_type';

export type {
  TaskManagerPlugin as TaskManager,
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from './plugin';

export const config: PluginConfigDescriptor<TaskManagerConfig> = {
  schema: configSchema,
  deprecations: ({ deprecate }) => {
    return [
      deprecate('ephemeral_tasks.enabled', 'a future version', {
        level: 'warning',
        message: `Configuring "xpack.task_manager.ephemeral_tasks.enabled" is deprecated and will be removed in a future version. Remove this setting to increase task execution resiliency.`,
      }),
      deprecate('ephemeral_tasks.request_capacity', 'a future version', {
        level: 'warning',
        message: `Configuring "xpack.task_manager.ephemeral_tasks.request_capacity" is deprecated and will be removed in a future version. Remove this setting to increase task execution resiliency.`,
      }),
      deprecate('max_workers', 'a future version', {
        level: 'warning',
        message: `Configuring "xpack.task_manager.max_workers" is deprecated and will be removed in a future version. Remove this setting and use "xpack.task_manager.capacity" instead.`,
      }),
      (settings, fromPath, addDeprecation) => {
        const taskManager = get(settings, fromPath);
        if (taskManager?.index) {
          addDeprecation({
            level: 'critical',
            configPath: `${fromPath}.index`,
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
      },
      (settings, fromPath, addDeprecation) => {
        const taskManager = get(settings, fromPath);
        if (taskManager?.max_workers > MAX_WORKERS_LIMIT) {
          addDeprecation({
            level: 'critical',
            configPath: `${fromPath}.max_workers`,
            message: `setting "${fromPath}.max_workers" (${taskManager?.max_workers}) greater than ${MAX_WORKERS_LIMIT} is deprecated.`,
            correctiveActions: {
              manualSteps: [
                `Maximum allowed value of "${fromPath}.max_workers" is ${MAX_WORKERS_LIMIT}.` +
                  `Replace "${fromPath}.max_workers: ${taskManager?.max_workers}" with (${MAX_WORKERS_LIMIT}).`,
              ],
            },
          });
        }
      },
    ];
  },
};
