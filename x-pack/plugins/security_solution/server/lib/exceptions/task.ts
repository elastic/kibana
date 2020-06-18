/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createHash } from 'crypto';
import { CoreSetup, Logger, SavedObjectsClient } from '../../../../../../src/core/server';
import {
  ConcreteTaskInstance,
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '../../../../../plugins/task_manager/server';
import { ListPluginSetup } from '../../../../lists/server';
import { ConfigType } from '../../config';
import { ExceptionsCache } from './cache';
import { GetFullEndpointExceptionList, CompressExceptionList } from './lists';
import { ArtifactSoSchema } from './schemas';

const PackagerTaskConstants = {
  TIMEOUT: '1m',
  TYPE: 'securitySolution:endpoint:exceptions-packager',
  VERSION: '1.0.0',
};

export const ArtifactConstants = {
  GLOBAL_ALLOWLIST_NAME: 'endpoint-allowlist',
  SAVED_OBJECT_TYPE: 'securitySolution-exceptions-artifact',
  SUPPORTED_OPERATING_SYSTEMS: ['linux', 'windows'],
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
  cache: ExceptionsCache;
}

interface PackagerTaskRunnerContext {
  taskManager: TaskManagerStartContract;
}

export function setupPackagerTask(context: PackagerTaskContext): PackagerTask {
  const getTaskId = (): string => {
    return `${PackagerTaskConstants.TYPE}:${PackagerTaskConstants.VERSION}`;
  };

  const run = async (taskId: int, taskState: Record<string, string>): Record<string, string> => {
    const state = Object.assign({}, ...taskState);

    // Check that this task is current
    if (taskId !== getTaskId()) {
      // old task, return
      context.logger.debug(`Outdated task running: ${taskId}`);
      return state;
    }

    // Get clients
    const [{ savedObjects }] = await context.core.getStartServices();
    const savedObjectsRepository = savedObjects.createInternalRepository();
    const soClient = new SavedObjectsClient(savedObjectsRepository);
    const exceptionListClient = context.lists.getExceptionListClient(soClient, 'kibana');

    // Main loop
    let updated = false;

    for (const os of ArtifactConstants.SUPPORTED_OPERATING_SYSTEMS) {
      for (const schemaVersion of ArtifactConstants.SUPPORTED_SCHEMA_VERSIONS) {
        const artifactName = `${ArtifactConstants.GLOBAL_ALLOWLIST_NAME}-${os}-${schemaVersion}`;

        // Initialize state and prime cache
        if (state[artifactName] === undefined) {
          try {
            const soGetResponse = await soClient.get<ArtifactSoSchema>(
              ArtifactConstants.SAVED_OBJECT_TYPE,
              artifactName
            );

            const cacheKey = `${artifactName}-${soGetResponse.attributes.sha256}`;
            context.cache.set(cacheKey, soGetResponse.attributes.body);

            state[artifactName] = soGetResponse.attributes.sha256;

            updated = true;
          } catch (err) {
            context.logger.debug(`No artifact found ${artifactName} -- cache not primed`);
          }
        }

        try {
          // Retrieve exceptions, compute hash
          const exceptions = await GetFullEndpointExceptionList(
            exceptionListClient,
            os,
            schemaVersion
          );
          const compressedExceptions: Buffer = await CompressExceptionList(exceptions);

          const sha256Hash = createHash('sha256')
            .update(compressedExceptions.toString('utf8'), 'utf8')
            .digest('hex');

          const exceptionSO = {
            name: artifactName,
            schemaVersion,
            sha256: sha256Hash,
            encoding: 'xz',
            created: Date.now(),
            body: compressedExceptions.toString('binary'),
            size: Buffer.from(JSON.stringify(exceptions)).byteLength,
          };

          // Create/update the artifact
          const soResponse = await soClient.create<ArtifactSoSchema>(
            ArtifactConstants.SAVED_OBJECT_TYPE,
            exceptionSO,
            { id: `${artifactName}`, overwrite: true }
          );

          // If new, update state
          if (state[artifactName] !== soResponse.attributes.sha256) {
            context.logger.info(
              `Change to artifact[${artifactName}] detected hash[${soResponse.attributes.sha256}]`
            );

            state[artifactName] = soResponse.attributes.sha256;

            updated = true;
          }

          // Update the cache
          const cacheKey = `${artifactName}-${sha256Hash}`;
          // TODO: does this reset the ttl?
          context.cache.set(cacheKey, compressedExceptions.toString('binary'));
        } catch (error) {
          context.logger.error(error);
        }
      }
    }

    // Update manifest if there are changes
    if (updated) {
      context.logger.debug('One or more changes detected. Updating manifest...');
      // TODO: update manifest
    }

    return state;
  };

  const getTaskRunner = (runnerContext: PackagerTaskRunnerContext): PackagerTaskRunner => {
    return {
      run: async () => {
        const taskId = getTaskId();
        try {
          await runnerContext.taskManager.ensureScheduled({
            id: taskId,
            taskType: PackagerTaskConstants.TYPE,
            scope: ['securitySolution'],
            state: {},
            params: { version: PackagerTaskConstants.VERSION },
          });
        } catch (e) {
          context.logger.debug(`Error scheduling task, received ${e.message}`);
        }

        await runnerContext.taskManager.runNow(taskId);
      },
    };
  };

  context.taskManager.registerTaskDefinitions({
    [PackagerTaskConstants.TYPE]: {
      title: 'Security Solution Endpoint Exceptions Handler',
      type: PackagerTaskConstants.TYPE,
      timeout: PackagerTaskConstants.TIMEOUT,
      createTaskRunner: ({ taskInstance }: { taskInstance: ConcreteTaskInstance }) => {
        return {
          run: async () => {
            // const state = Object.assign({}, ...taskInstance.state);
            const state = await run(taskInstance.id, taskInstance.state);

            const nextRun = new Date();
            nextRun.setSeconds(nextRun.getSeconds() + context.config.packagerTaskInterval);

            return {
              state,
              runAt: nextRun,
            };
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
