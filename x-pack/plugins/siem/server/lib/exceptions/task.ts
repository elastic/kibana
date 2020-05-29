/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CoreSetup, Logger, SavedObjectsClient } from '../../../../../../src/core/server';
import {
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '../../../../../plugins/task_manager/server';
import { ListPluginSetup } from '../../../../lists/server';
import { GetFullEndpointExceptionList } from './fetch_endpoint_exceptions';

export interface PackagerTask {
  getTaskRunner: (context: PackagerTaskRunnerContext) => PackagerTaskRunner;
}

interface PackagerTaskRunner {
  run: () => void;
}

interface PackagerTaskContext {
  core: CoreSetup;
  logger: Logger;
  taskManager: TaskManagerSetupContract;
  lists: ListPluginSetup;
}

interface PackagerTaskRunnerContext {
  taskManager: TaskManagerStartContract;
}

export function setupPackagerTask(context: PackagerTaskContext): PackagerTask {
  const run = async () => {
    context.logger.debug('Running exception list packager task');

    const [{ savedObjects }] = await context.core.getStartServices();
    const savedObjectsRepository = savedObjects.createInternalRepository();
    const soClient = new SavedObjectsClient(savedObjectsRepository);
    const exceptionListClient = context.lists.getExceptionListClient(soClient, 'kibana');
    const exceptions = await GetFullEndpointExceptionList(exceptionListClient);

    await soClient.create('config', exceptions); // TODO is config the right type?
    // TODO: add logic here to:
    // 1. pull entire exception list
    // 2. compile endpoint message for all supported schemaVersions
    // 3. compare hashes to the latest hashes that appear in the artifact manifest
    // 4. write new artifact record and update manifest, if necessary
    // 5. clean up old artifacts, if necessary
  };

  const getTaskRunner = (runnerContext: PackagerTaskRunnerContext) => {
    return {
      run: async () => {
        try {
          await runnerContext.taskManager.ensureScheduled({
            id: 'siem:endpoint:exceptions-packager',
            taskType: 'siem:endpoint:exceptions-packager',
            scope: ['siem'],
            schedule: {
              interval: '5s', // TODO: update this with real interval
            },
            state: {},
            params: {},
          });
        } catch (e) {
          context.logger.debug(`Error scheduling task, received ${e.message}`);
        }
      },
    };
  };

  context.taskManager.registerTaskDefinitions({
    'siem:endpoint:exceptions-packager': {
      title: 'SIEM Endpoint Exceptions Handler',
      type: 'siem:endpoint:exceptions-packager',
      timeout: '1m',
      createTaskRunner: () => {
        return {
          run: async () => {
            await run();
          },
          cancel: async () => { },
        };
      },
    },
  });

  return {
    getTaskRunner,
  };
}
