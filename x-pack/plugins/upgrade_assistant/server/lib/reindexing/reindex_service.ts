/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';

import { CallCluster } from 'src/legacy/core_plugins/elasticsearch';
import {
  ReindexSavedObject,
  ReindexStatus,
  ReindexStep,
  ReindexWarning,
} from '../../../common/types';
import { getReindexWarnings, transformFlatSettings } from './index_settings';
import { ReindexActions } from './reindex_actions';

const VERSION_REGEX = new RegExp(/^([1-9]+)\.([0-9]+)\.([0-9]+)/);

export interface ReindexService {
  /**
   * Checks an index's settings and mappings to flag potential issues during reindex.
   * Resolves to null if index does not exist.
   * @param indexName
   */
  detectReindexWarnings(indexName: string): Promise<ReindexWarning[] | null>;

  /**
   * Creates a new reindex operation for a given index.
   * @param indexName
   */
  createReindexOperation(indexName: string): Promise<ReindexSavedObject>;

  /**
   * Retrieves all reindex operations that have the given status.
   * @param status
   */
  findAllByStatus(status: ReindexStatus): Promise<ReindexSavedObject[]>;

  /**
   * Finds the reindex operation for the given index.
   * Resolves to null if there is no existing reindex operation for this index.
   * @param indexName
   */
  findReindexOperation(indexName: string): Promise<ReindexSavedObject | null>;

  /**
   * Process the reindex operation through one step of the state machine and resolves
   * to the updated reindex operation.
   * @param reindexOp
   */
  processNextStep(reindexOp: ReindexSavedObject): Promise<ReindexSavedObject>;

  /**
   * Pauses the in-progress reindex operation for a given index.
   * @param indexName
   */
  pauseReindexOperation(indexName: string): Promise<ReindexSavedObject>;

  /**
   * Resumes the paused reindex operation for a given index.
   * @param indexName
   */
  resumeReindexOperation(indexName: string): Promise<ReindexSavedObject>;
}

export const reindexServiceFactory = (
  callCluster: CallCluster,
  actions: ReindexActions
): ReindexService => {
  // ------ Utility functions

  /**
   * If the index is a ML index that will cause jobs to fail when set to readonly,
   * turn on 'upgrade mode' to pause all ML jobs.
   * @param reindexOp
   */
  const stopMlJobs = async () => {
    await actions.incrementMlReindexes();
    await actions.runWhileMlLocked(async mlDoc => {
      await validateNodesMinimumVersion(6, 7);

      const res = await callCluster('transport.request', {
        path: '/_ml/set_upgrade_mode?enabled=true',
        method: 'POST',
      });

      if (!res.acknowledged) {
        throw new Error(`Could not stop ML jobs`);
      }

      return mlDoc;
    });
  };

  /**
   * Resumes ML jobs if there are no more remaining reindex operations.
   */
  const resumeMlJobs = async () => {
    await actions.decrementMlReindexes();
    await actions.runWhileMlLocked(async mlDoc => {
      if (mlDoc.attributes.mlReindexCount === 0) {
        const res = await callCluster('transport.request', {
          path: '/_ml/set_upgrade_mode?enabled=false',
          method: 'POST',
        });

        if (!res.acknowledged) {
          throw new Error(`Could not resume ML jobs`);
        }
      }

      return mlDoc;
    });
  };

  /**
   * Stops Watcher in Elasticsearch.
   */
  const stopWatcher = async () => {
    const { acknowledged } = await callCluster('transport.request', {
      path: '/_watcher/_stop',
      method: 'POST',
    });

    if (!acknowledged) {
      throw new Error('Could not stop Watcher');
    }
  };

  /**
   * Starts Watcher in Elasticsearch.
   */
  const startWatcher = async () => {
    const { acknowledged } = await callCluster('transport.request', {
      path: '/_watcher/_start',
      method: 'POST',
    });

    if (!acknowledged) {
      throw new Error('Could not start Watcher');
    }
  };

  const cleanupChanges = async (reindexOp: ReindexSavedObject) => {
    // Set back to writable if we ever got past this point.
    if (reindexOp.attributes.lastCompletedStep >= ReindexStep.readonly) {
      await callCluster('indices.putSettings', {
        index: reindexOp.attributes.indexName,
        body: { 'index.blocks.write': false },
      });
    }

    // Stop consumers if we ever got past this point.
    if (reindexOp.attributes.lastCompletedStep >= ReindexStep.indexConsumersStopped) {
      await resumeConsumers(reindexOp);
    }
  };

  // ------ Functions used to process the state machine

  const validateNodesMinimumVersion = async (minMajor: number, minMinor: number) => {
    const nodesResponse = await callCluster('transport.request', {
      path: '/_nodes',
      method: 'GET',
    });

    const outDatedNodes = Object.values(nodesResponse.nodes).filter((node: any) => {
      const matches = node.version.match(VERSION_REGEX);
      const major = parseInt(matches[1], 10);
      const minor = parseInt(matches[2], 10);

      // All ES nodes must be >= 6.7.0 to pause ML jobs
      return !(major > minMajor || (major === minMajor && minor >= minMinor));
    });

    if (outDatedNodes.length > 0) {
      const nodeList = JSON.stringify(outDatedNodes.map((n: any) => n.name));
      throw new Error(
        `Some nodes are not on minimum version (${minMajor}.${minMinor}.0)  required: ${nodeList}`
      );
    }
  };

  const stopConsumers = async (reindexOp: ReindexSavedObject) => {
    if (isMlIndex(reindexOp.attributes.indexName)) {
      await stopMlJobs();
    } else if (isWatcherIndex(reindexOp.attributes.indexName)) {
      await stopWatcher();
    }

    return actions.updateReindexOp(reindexOp, {
      lastCompletedStep: ReindexStep.indexConsumersStopped,
    });
  };

  /**
   * Sets the original index as readonly so new data can be indexed until the reindex
   * is completed.
   * @param reindexOp
   */
  const setReadonly = async (reindexOp: ReindexSavedObject) => {
    const { indexName } = reindexOp.attributes;
    const putReadonly = await callCluster('indices.putSettings', {
      index: indexName,
      body: { 'index.blocks.write': true },
    });

    if (!putReadonly.acknowledged) {
      throw new Error(`Index could not be set to readonly.`);
    }

    return actions.updateReindexOp(reindexOp, { lastCompletedStep: ReindexStep.readonly });
  };

  /**
   * Creates a new index with the same mappings and settings as the original index.
   * @param reindexOp
   */
  const createNewIndex = async (reindexOp: ReindexSavedObject) => {
    const { indexName, newIndexName } = reindexOp.attributes;

    const flatSettings = await actions.getFlatSettings(indexName);
    if (!flatSettings) {
      throw Boom.notFound(`Index ${indexName} does not exist.`);
    }

    const { settings, mappings } = transformFlatSettings(flatSettings);
    const createIndex = await callCluster('indices.create', {
      index: newIndexName,
      body: {
        settings,
        mappings,
      },
    });

    if (!createIndex.acknowledged) {
      throw Boom.badImplementation(`Index could not be created: ${newIndexName}`);
    }

    return actions.updateReindexOp(reindexOp, {
      lastCompletedStep: ReindexStep.newIndexCreated,
    });
  };

  /**
   * Begins the reindex process via Elasticsearch's Reindex API.
   * @param reindexOp
   */
  const startReindexing = async (reindexOp: ReindexSavedObject) => {
    const { indexName } = reindexOp.attributes;
    const startReindex = (await callCluster('reindex', {
      refresh: true,
      waitForCompletion: false,
      body: {
        source: { index: indexName },
        dest: { index: reindexOp.attributes.newIndexName },
      },
    })) as any;

    return actions.updateReindexOp(reindexOp, {
      lastCompletedStep: ReindexStep.reindexStarted,
      reindexTaskId: startReindex.task,
      reindexTaskPercComplete: 0,
    });
  };

  /**
   * Polls Elasticsearch's Tasks API to see if the reindex operation has been completed.
   * @param reindexOp
   */
  const updateReindexStatus = async (reindexOp: ReindexSavedObject) => {
    const taskId = reindexOp.attributes.reindexTaskId;

    // Check reindexing task progress
    const taskResponse = await callCluster('tasks.get', {
      taskId,
      waitForCompletion: false,
    });

    if (taskResponse.completed) {
      const { count } = await callCluster('count', { index: reindexOp.attributes.indexName });
      if (taskResponse.task.status.created < count) {
        if (taskResponse.response.failures && taskResponse.response.failures.length > 0) {
          const failureExample = JSON.stringify(taskResponse.response.failures[0]);
          throw Boom.badData(`Reindexing failed with failures like: ${failureExample}`);
        } else {
          throw Boom.badData('Reindexing failed due to new documents created in original index.');
        }
      }

      // Delete the task from ES .tasks index
      const deleteTaskResp = await callCluster('delete', {
        index: '.tasks',
        type: 'task',
        id: taskId,
      });

      if (deleteTaskResp.result !== 'deleted') {
        throw Boom.badImplementation(`Could not delete reindexing task ${taskId}`);
      }

      // Update the status
      return actions.updateReindexOp(reindexOp, {
        lastCompletedStep: ReindexStep.reindexCompleted,
        reindexTaskPercComplete: 1,
      });
    } else {
      const perc = taskResponse.task.status.created / taskResponse.task.status.total;
      return actions.updateReindexOp(reindexOp, {
        reindexTaskPercComplete: perc,
      });
    }
  };

  /**
   * Creates an alias that points the old index to the new index, deletes the old index.
   * @param reindexOp
   */
  const switchAlias = async (reindexOp: ReindexSavedObject) => {
    const { indexName, newIndexName } = reindexOp.attributes;

    const existingAliases = (await callCluster('indices.getAlias', {
      index: indexName,
    }))[indexName].aliases;

    const extraAlises = Object.keys(existingAliases).map(aliasName => ({
      add: { index: newIndexName, alias: aliasName, ...existingAliases[aliasName] },
    }));

    const aliasResponse = await callCluster('indices.updateAliases', {
      body: {
        actions: [
          { add: { index: newIndexName, alias: indexName } },
          { remove_index: { index: indexName } },
          ...extraAlises,
        ],
      },
    });

    if (!aliasResponse.acknowledged) {
      throw Boom.badImplementation(`Index aliases could not be created.`);
    }

    return actions.updateReindexOp(reindexOp, {
      lastCompletedStep: ReindexStep.aliasCreated,
    });
  };

  const resumeConsumers = async (reindexOp: ReindexSavedObject) => {
    if (isMlIndex(reindexOp.attributes.indexName)) {
      await resumeMlJobs();
    } else if (isWatcherIndex(reindexOp.attributes.indexName)) {
      await startWatcher();
    }

    // Only change the status if we're still in-progress (this function is also called when the reindex fails)
    if (reindexOp.attributes.status === ReindexStatus.inProgress) {
      return actions.updateReindexOp(reindexOp, {
        lastCompletedStep: ReindexStep.indexConsumersStarted,
        status: ReindexStatus.completed,
      });
    } else {
      return reindexOp;
    }
  };

  // ------ The service itself

  return {
    async detectReindexWarnings(indexName: string) {
      const flatSettings = await actions.getFlatSettings(indexName);
      if (!flatSettings) {
        return null;
      } else {
        return getReindexWarnings(flatSettings);
      }
    },

    async createReindexOperation(indexName: string) {
      const indexExists = await callCluster('indices.exists', { index: indexName });
      if (!indexExists) {
        throw Boom.notFound(`Index ${indexName} does not exist in this cluster.`);
      }

      const existingReindexOps = await actions.findReindexOperations(indexName);
      if (existingReindexOps.total !== 0) {
        const existingOp = existingReindexOps.saved_objects[0];
        if (existingOp.attributes.status === ReindexStatus.failed) {
          // Delete the existing one if it failed to give a chance to retry.
          await actions.deleteReindexOp(existingOp);
        } else {
          throw Boom.badImplementation(`A reindex operation already in-progress for ${indexName}`);
        }
      }

      return actions.createReindexOp(indexName);
    },

    async findReindexOperation(indexName: string) {
      const findResponse = await actions.findReindexOperations(indexName);

      // Bail early if it does not exist or there is more than one.
      if (findResponse.total === 0) {
        return null;
      } else if (findResponse.total > 1) {
        throw Boom.badImplementation(`More than one reindex operation found for ${indexName}`);
      }

      return findResponse.saved_objects[0];
    },

    findAllByStatus: actions.findAllByStatus,

    async processNextStep(reindexOp: ReindexSavedObject) {
      return actions.runWhileLocked(reindexOp, async lockedReindexOp => {
        try {
          switch (lockedReindexOp.attributes.lastCompletedStep) {
            case ReindexStep.created:
              lockedReindexOp = await stopConsumers(lockedReindexOp);
              break;
            case ReindexStep.indexConsumersStopped:
              lockedReindexOp = await setReadonly(lockedReindexOp);
              break;
            case ReindexStep.readonly:
              lockedReindexOp = await createNewIndex(lockedReindexOp);
              break;
            case ReindexStep.newIndexCreated:
              lockedReindexOp = await startReindexing(lockedReindexOp);
              break;
            case ReindexStep.reindexStarted:
              lockedReindexOp = await updateReindexStatus(lockedReindexOp);
              break;
            case ReindexStep.reindexCompleted:
              lockedReindexOp = await switchAlias(lockedReindexOp);
              break;
            case ReindexStep.aliasCreated:
              lockedReindexOp = await resumeConsumers(lockedReindexOp);
              break;
            default:
              break;
          }
        } catch (e) {
          // Trap the exception and add the message to the object so the UI can display it.
          lockedReindexOp = await actions.updateReindexOp(lockedReindexOp, {
            status: ReindexStatus.failed,
            errorMessage: e instanceof Error ? e.stack : e.toString(),
          });

          // Cleanup any changes, ignoring any errors.
          await cleanupChanges(lockedReindexOp).catch(e => undefined);
        }

        return lockedReindexOp;
      });
    },

    async pauseReindexOperation(indexName: string) {
      const reindexOp = await this.findReindexOperation(indexName);

      if (!reindexOp) {
        throw new Error(`No reindex operation found for index ${indexName}`);
      }

      return actions.runWhileLocked(reindexOp, async op => {
        if (op.attributes.status === ReindexStatus.paused) {
          // Another node already paused the operation, don't do anything
          return reindexOp;
        } else if (op.attributes.status !== ReindexStatus.inProgress) {
          throw new Error(`Reindex operation must be inProgress in order to be paused.`);
        }

        return actions.updateReindexOp(op, { status: ReindexStatus.paused });
      });
    },

    async resumeReindexOperation(indexName: string) {
      const reindexOp = await this.findReindexOperation(indexName);

      if (!reindexOp) {
        throw new Error(`No reindex operation found for index ${indexName}`);
      }

      return actions.runWhileLocked(reindexOp, async op => {
        if (op.attributes.status === ReindexStatus.inProgress) {
          // Another node already resumed the operation, don't do anything
          return reindexOp;
        } else if (op.attributes.status !== ReindexStatus.paused) {
          throw new Error(`Reindex operation must be paused in order to be resumed.`);
        }

        return actions.updateReindexOp(op, { status: ReindexStatus.inProgress });
      });
    },
  };
};

const isMlIndex = (indexName: string) =>
  indexName.startsWith('.ml-state') || indexName.startsWith('.ml-anomalies');

const isWatcherIndex = (indexName: string) => indexName.startsWith('.watches');
