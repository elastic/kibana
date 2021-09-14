/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreSetup } from 'kibana/server';
import Semver from 'semver';
import { StartPlugins, PluginStart } from '../../plugin';
import { RunContext } from '../../../../task_manager/server';
import { Logger } from '../../../../../../src/core/server';
import { deleteSavedObjects, getClientAdmin, updateThroughJoin } from './utils';
import { MigrationTask } from './types';

export interface MigrationsTaskRunnerOptions<T> {
  logger: Logger;
  coreSetup: CoreSetup<StartPlugins, PluginStart>;
  migrationTasks: Array<MigrationTask<T>>;
}

export const migrationsTaskRunner = <T>({
  logger,
  coreSetup,
  migrationTasks,
}: MigrationsTaskRunnerOptions<T>) => {
  return ({ taskInstance }: RunContext) => {
    return {
      run: async () => {
        const [core, plugins] = await coreSetup.getStartServices();
        const savedObjectsClient = getClientAdmin(core);
        const encryptedSavedObjectsClient = plugins.encryptedSavedObjects?.getClient({
          includedHiddenTypes: ['alert', 'action'],
        });

        const migrationTasksSorted = migrationTasks.sort((a, b) =>
          Semver.compare(a.version, b.version)
        );

        for (const migrationTask of migrationTasksSorted) {
          if (migrationTask.escapeHatch != null) {
            await migrationTask.escapeHatch({
              logger,
              savedObjectsClient,
              encryptedSavedObjectsClient,
            });
          }
          if (migrationTask.defineJoin != null) {
            await updateThroughJoin({
              logger,
              savedObjectsClient,
              defineJoin: migrationTask.defineJoin,
              encryptedSavedObjectsClient,
            });
          }
          await deleteSavedObjects({
            logger,
            savedObjects: migrationTask.deleteSavedObjects,
            savedObjectsClient,
          });
        }
      },
    };
  };
};
