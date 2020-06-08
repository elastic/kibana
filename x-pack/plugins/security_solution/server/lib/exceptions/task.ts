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
import { ConfigType } from '../../config';
import { GetFullEndpointExceptionList, CompressExceptionList } from './fetch_endpoint_exceptions';

const PackagerTaskConstants = {
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
  config: ConfigType;
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
        context.logger.debug(`No endpoint exceptions found for ${os}.`);
        return;
      }

      const compressedExceptions: Buffer = await CompressExceptionList(exceptions);

      const sha256Hash = createHash('sha256')
        .update(compressedExceptions.toString('utf8'), 'utf8')
        .digest('hex');

      for (const schemaVersion of ArtifactConstants.SUPPORTED_SCHEMA_VERSIONS) {
        const artifactName = `${ArtifactConstants.GLOBAL_ALLOWLIST_NAME}-${os}`;
        const exceptionSO = {
          name: artifactName,
          schemaVersion,
          sha256: sha256Hash,
          encoding: 'xz',
          created: Date.now(),
          body: compressedExceptions.toString('binary'),
          size: Buffer.from(JSON.stringify(exceptions)).byteLength,
        };

        try {
          // Create the new artifact
          const soResponse = await soClient.create(
            ArtifactConstants.SAVED_OBJECT_TYPE,
            exceptionSO,
            { id: sha256Hash }
          );
          context.logger.debug(JSON.stringify(soResponse));

          // Clean up old artifacts
          const otherArtifacts = await soClient.find({
            type: ArtifactConstants.SAVED_OBJECT_TYPE,
            search: artifactName,
            searchFields: ['name'],
            sortField: 'created',
            sortOrder: 'desc',
          });

          // Remove all but the latest artifact
          const toDelete = otherArtifacts.saved_objects.slice(
            1,
            otherArtifacts.saved_objects.length
          );
          for (const delObj of toDelete) {
            context.logger.debug(`REMOVING ${delObj.id}`);
            await soClient.delete(ArtifactConstants.SAVED_OBJECT_TYPE, delObj.id);
          }
        } catch (error) {
          if (error.statusCode === 409) {
            context.logger.debug('No update to Endpoint Exceptions, skipping.');
          } else {
            context.logger.error(error);
          }
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
              interval: context.config.packagerTaskInterval,
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
