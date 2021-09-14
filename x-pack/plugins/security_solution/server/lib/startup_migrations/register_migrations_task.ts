/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreSetup } from 'kibana/server';
import { StartPlugins, PluginStart } from '../../plugin';
import { TaskManagerSetupContract } from '../../../../task_manager/server';
import { Logger } from '../../../../../../src/core/server';
import { migrationsTaskRunner } from './migrations_task_runner';
import { MigrationTask } from './types';
import { STARTUP_MIGRATIONS } from './constants';
import { additionalValidation } from './utils/additional_validation';

export interface RegisterMigrationsTaskOptions<T> {
  logger: Logger;
  taskManager: TaskManagerSetupContract;
  coreSetup: CoreSetup<StartPlugins, PluginStart>;
  migrationTasks: Array<MigrationTask<T>>;
}

/**
 * Registers the migration tasks that run shortly after startup. These are migration tasks that cannot
 * be accomplished by the current migration framework. You should use this as a last resort and instead
 * try to use all features of the existing migration framework before resorting to utilizing this mechanism.
 *
 * See: {@link https://github.com/elastic/kibana/issues/109188}
 *
 * @param logger The logger to log messages
 * @param taskManager The task manager to register our migration
 * @param core
 * @param kibanaIndex
 */
export const registerMigrationsTask = <T>({
  logger,
  taskManager,
  coreSetup,
  migrationTasks,
}: RegisterMigrationsTaskOptions<T>): void => {
  additionalValidation(migrationTasks);
  taskManager.registerTaskDefinitions({
    [STARTUP_MIGRATIONS]: {
      title: 'security_solution startup migrations',
      timeout: '30m',
      createTaskRunner: migrationsTaskRunner({ logger, coreSetup, migrationTasks }),
    },
  });
};
