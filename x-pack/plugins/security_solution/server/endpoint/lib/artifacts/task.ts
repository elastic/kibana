/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger } from 'src/core/server';
import {
  ConcreteTaskInstance,
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '../../../../../task_manager/server';
import { EndpointAppContext } from '../../types';
import { getArtifactId, reportErrors } from './common';
import { InternalArtifactCompleteSchema } from '../../schemas/artifacts';
import { isEmptyManifestDiff } from './manifest';

export const ManifestTaskConstants = {
  TIMEOUT: '1m',
  TYPE: 'endpoint:user-artifact-packager',
  VERSION: '1.0.0',
};

export interface ManifestTaskSetupContract {
  endpointAppContext: EndpointAppContext;
  taskManager: TaskManagerSetupContract;
}

export interface ManifestTaskStartContract {
  taskManager: TaskManagerStartContract;
}

export class ManifestTask {
  private endpointAppContext: EndpointAppContext;
  private logger: Logger;

  constructor(setupContract: ManifestTaskSetupContract) {
    this.endpointAppContext = setupContract.endpointAppContext;
    this.logger = this.endpointAppContext.logFactory.get(this.getTaskId());

    setupContract.taskManager.registerTaskDefinitions({
      [ManifestTaskConstants.TYPE]: {
        title: 'Security Solution Endpoint Exceptions Handler',
        timeout: ManifestTaskConstants.TIMEOUT,
        createTaskRunner: ({ taskInstance }: { taskInstance: ConcreteTaskInstance }) => {
          return {
            run: async () => {
              const taskInterval = (await this.endpointAppContext.config()).packagerTaskInterval;
              await this.runTask(taskInstance.id);
              const nextRun = new Date();
              if (taskInterval.endsWith('s')) {
                const seconds = parseInt(taskInterval.slice(0, -1), 10);
                nextRun.setSeconds(nextRun.getSeconds() + seconds);
              } else if (taskInterval.endsWith('m')) {
                const minutes = parseInt(taskInterval.slice(0, -1), 10);
                nextRun.setMinutes(nextRun.getMinutes() + minutes);
              } else {
                this.logger.error(`Invalid task interval: ${taskInterval}`);
                return;
              }
              return {
                state: {},
                runAt: nextRun,
              };
            },
            cancel: async () => {},
          };
        },
      },
    });
  }

  public start = async (startContract: ManifestTaskStartContract) => {
    try {
      await startContract.taskManager.ensureScheduled({
        id: this.getTaskId(),
        taskType: ManifestTaskConstants.TYPE,
        scope: ['securitySolution'],
        schedule: {
          interval: (await this.endpointAppContext.config()).packagerTaskInterval,
        },
        state: {},
        params: { version: ManifestTaskConstants.VERSION },
      });
    } catch (e) {
      this.logger.debug(`Error scheduling task, received ${e.message}`);
    }
  };

  private getTaskId = (): string => {
    return `${ManifestTaskConstants.TYPE}:${ManifestTaskConstants.VERSION}`;
  };

  public runTask = async (taskId: string) => {
    // Check that this task is current
    if (taskId !== this.getTaskId()) {
      // old task, return
      this.logger.debug(`Outdated task running: ${taskId}`);
      return;
    }

    const manifestManager = this.endpointAppContext.service.getManifestManager();

    if (manifestManager === undefined) {
      this.logger.debug('Manifest Manager not available.');
      return;
    }

    try {
      // Last manifest we computed, which was saved to ES
      const oldManifest = await manifestManager.getLastComputedManifest();
      if (oldManifest == null) {
        this.logger.debug('User manifest not available yet.');
        return;
      }

      // New computed manifest based on current manifest
      const newManifest = await manifestManager.buildNewManifest(oldManifest);

      const diff = newManifest.diff(oldManifest);

      const persistErrors = await manifestManager.pushArtifacts(
        diff.additions as InternalArtifactCompleteSchema[]
      );
      if (persistErrors.length) {
        reportErrors(this.logger, persistErrors);
        throw new Error('Unable to persist new artifacts.');
      }

      if (!isEmptyManifestDiff(diff)) {
        // Commit latest manifest state
        newManifest.bumpSemanticVersion();
        await manifestManager.commit(newManifest);
      }

      // Try dispatching to ingest-manager package policies
      const dispatchErrors = await manifestManager.tryDispatch(newManifest);
      if (dispatchErrors.length) {
        reportErrors(this.logger, dispatchErrors);
        throw new Error('Error dispatching manifest.');
      }

      // Try to clean up superceded artifacts
      const deleteErrors = await manifestManager.deleteArtifacts(
        diff.removals.map((artifact) => getArtifactId(artifact))
      );
      if (deleteErrors.length) {
        reportErrors(this.logger, deleteErrors);
      }
    } catch (err) {
      this.logger.error(err);
    }
  };
}
