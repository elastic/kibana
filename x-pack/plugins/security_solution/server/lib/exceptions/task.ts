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

const PackagerTaskConstants = {
  INTERVAL: '30s',
  TIMEOUT: '1m',
  TYPE: 'securitySolution:endpoint:exceptions-packager',
};

export const ArtifactConstants = {
  GLOBAL_ALLOWLIST_NAME: 'endpoint-allowlist',
  SAVED_OBJECT_TYPE: 'securitySolution-exceptions-artifact',
  SUPPORTED_OPERATING_SYSTEMS: ['windows'],
  SUPPORTED_SCHEMA_VERSIONS: ['1.0.0'],
};

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

    for (const os of ArtifactConstants.SUPPORTED_OPERATING_SYSTEMS) {
      const exceptions = await GetFullEndpointExceptionList(exceptionListClient, os);
      // Don't create an artifact if there are no exceptions
      if (exceptions.exceptions_list.length === 0) {
        context.logger.debug('No endpoint exceptions found.');
        return;
      }

      const compressedExceptions: Buffer = await CompressExceptionList(exceptions);

      const sha256Hash = createHash('sha256')
        .update(compressedExceptions.toString('utf8'), 'utf8')
        .digest('hex');

      for (const schemaVersion of ArtifactConstants.SUPPORTED_SCHEMA_VERSIONS) {
        const exceptionSO = {
          name: `${ArtifactConstants.GLOBAL_ALLOWLIST_NAME}-${os}`,
          schemaVersion,
          sha256: sha256Hash,
          encoding: 'xz',
          created: Date.now(),
          body: compressedExceptions.toString(),
          size: Buffer.from(JSON.stringify(exceptions)).byteLength,
        };

        const resp = await soClient.find({
          type: ArtifactConstants.SAVED_OBJECT_TYPE,
          search: sha256Hash,
          searchFields: ['sha256'],
          fields: [],
        });

        // TODO clean this up and handle errors better
        if (resp.total === 0) {
          const soResponse = await soClient.create(
            ArtifactConstants.SAVED_OBJECT_TYPE,
            exceptionSO
          );
          context.logger.debug(JSON.stringify(soResponse));
        } else {
          context.logger.debug('No update to Endpoint Exceptions, skipping.');
        }
      }
    }
  };

  const getTaskRunner = (runnerContext: PackagerTaskRunnerContext) => {
    return {
      run: async () => {
        try {
          await runnerContext.taskManager.ensureScheduled({
            id: PackagerTaskConstants.TYPE,
            taskType: PackagerTaskConstants.TYPE,
            scope: ['securitySolution'],
            schedule: {
              interval: PackagerTaskConstants.INTERVAL,
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
    'securitySolution:endpoint:exceptions-packager': {
      title: 'Security Solution Endpoint Exceptions Handler',
      type: PackagerTaskConstants.TYPE,
      timeout: PackagerTaskConstants.TIMEOUT,
      createTaskRunner: () => {
        return {
          run: async () => {
            await run();
          },
          cancel: async () => {},
        };
      },
    },
  });

  return {
    getTaskRunner,
  };
}
