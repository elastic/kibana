/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Logger } from 'src/core/server';
import {
  ConcreteTaskInstance,
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '../../../../../task_manager/server';
import { EndpointAppContext } from '../../types';
import { reportErrors } from './common';

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
        type: ManifestTaskConstants.TYPE,
        timeout: ManifestTaskConstants.TIMEOUT,
        createTaskRunner: ({ taskInstance }: { taskInstance: ConcreteTaskInstance }) => {
          return {
            run: async () => {
              await this.runTask(taskInstance.id);
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
          interval: '60s',
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

    let errors: Error[] = [];
    try {
      // get snapshot based on exception-list-agnostic SOs
      // with diffs from last dispatched manifest
      const snapshot = await manifestManager.getSnapshot();
      if (snapshot && snapshot.diffs.length > 0) {
        // create new artifacts
        errors = await manifestManager.syncArtifacts(snapshot, 'add');
        if (errors.length) {
          reportErrors(this.logger, errors);
          throw new Error('Error writing new artifacts.');
        }
        // write to ingest-manager package config
        errors = await manifestManager.dispatch(snapshot.manifest);
        if (errors.length) {
          reportErrors(this.logger, errors);
          throw new Error('Error dispatching manifest.');
        }
        // commit latest manifest state to user-artifact-manifest SO
        const error = await manifestManager.commit(snapshot.manifest);
        if (error) {
          reportErrors(this.logger, [error]);
          throw new Error('Error committing manifest.');
        }
        // clean up old artifacts
        errors = await manifestManager.syncArtifacts(snapshot, 'delete');
        if (errors.length) {
          reportErrors(this.logger, errors);
          throw new Error('Error cleaning up outdated artifacts.');
        }
      }
    } catch (err) {
      this.logger.error(err);
    }
  };
}
