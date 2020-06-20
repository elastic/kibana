/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createHash } from 'crypto';
import {
  CoreSetup,
  Logger,
  SavedObjectsClient,
  SavedObjectsPluginStart,
} from '../../../../../../src/core/server';
import {
  ConcreteTaskInstance,
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '../../../../../plugins/task_manager/server';
import { ListPluginSetup } from '../../../../lists/server';
import { ConfigType } from '../../config';
import { EndpointAppContext } from '../../types';
import { ExceptionsCache } from './cache';
import { GetFullEndpointExceptionList, CompressExceptionList } from './lists';
import { ArtifactConstants, ManifestService } from './manifest';
import { ArtifactSoSchema } from './schemas';

const PackagerTaskConstants = {
  TIMEOUT: '1m',
  TYPE: 'securitySolution:endpoint:exceptions-packager',
  VERSION: '1.0.0',
};

export interface PackagerTask {
  getTaskRunner: (context: PackagerTaskRunnerContext) => PackagerTaskRunner;
}

interface PackagerTaskRunner {
  run: () => void;
}

interface PackagerTaskContext {
  endpointAppContext: EndpointAppContext;
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

  const logger = context.endpointAppContext.logFactory.get(getTaskId());

  const run = async (taskId: int, state: Record<string, string>): Record<string, string> => {

    const artifactService = context.endpointAppContext.service.getArtifactService();
    const manifestService = context.endpointAppContext.service.getManifestService();

    // Check that this task is current
    if (taskId !== getTaskId()) {
      // old task, return
      logger.debug(`Outdated task running: ${taskId}`);
      return;
    }

    // TODO
    // 1. Pull manifest, note version
    // 2. No manifest, do nothing (should have been created on policy create)
    // 3. If manifest, pull all associated artifacts (if not already in memory)
    // 4. Construct new artifacts from current exception list items
    // 5. Any differences? Update manifest, perform conflict check.
    // 6. Has this manifest been dispatched? If not, dispatch.
    let oldManifest: Manifest;

    try {
      oldManifest = await manifestService.getManifest();
    catch (err) {
      logger.debug('Manifest not created yet, nothing to do.');
      return;
    }

    let artifacts = await artifactService.buildExceptionListArtifacts();
    for (const artifact in artifacts) {
      if (!oldManifest.contains(artifact)) {
        try {
          await artifactService.upsertArtifact(
            ArtifactConstants.SAVED_OBJECT_TYPE,
            artifact,
            { id: artifact.id, overwrite: true },
            );
        } catch (err) {
          // Error updating... try again later
          logger.error(err);
          return;
        }
      }
    }

    artifacts = await artifactService.buildExceptionListArtifacts();

    const newManifest = buildNewManifest(artifacts);
    if (oldManifest.diff(newManifest)) {
      try {
        await manifestService.dispatchAndUpdate(newManifest);
      } catch(err) {
        logger.error(err);
        return;
      }
    }
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
          logger.debug(`Error scheduling task, received ${e.message}`);
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
            await run(taskInstance.id, taskInstance.state);

            const nextRun = new Date();
            nextRun.setSeconds(nextRun.getSeconds() + context.endpointAppContext.config.packagerTaskInterval);

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
