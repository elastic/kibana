/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createHash } from 'crypto';
import { CoreSetup, Logger, SavedObjectsClient } from '../../../../../../src/core/server';
import {
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '../../../../../plugins/task_manager/server';
import { ListPluginSetup } from '../../../../lists/server';
import { GetFullEndpointExceptionList, CompressExceptionList } from './fetch_endpoint_exceptions';

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
    const compressedExceptions: Buffer = await CompressExceptionList(exceptions);

    const sha256Hash = createHash('sha256')
      .update(compressedExceptions.toString('utf8'), 'utf8')
      .digest('hex');

    const exceptionSO = {
      name: 'global-whitelist',
      schemaVersion: '1.0.0',
      sha256: sha256Hash,
      encoding: 'xz',
      created: Date.now(),
      body: compressedExceptions.toString(),
    };

    const resp = await soClient.find({
      type: 'siem-exceptions-artifact',
      search: sha256Hash,
      searchFields: ['sha256'],
      fields: [],
    });

    // TODO clean this up and handle errors better
    if (resp.total === 0) {
      const soResponse = await soClient.create('siem-exceptions-artifact', exceptionSO);
      context.logger.debug(JSON.stringify(soResponse));
    } else {
      context.logger.debug('No update to Endpoint Exceptions, skipping.');
    }

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
              interval: '30s', // TODO: update this with real interval
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
