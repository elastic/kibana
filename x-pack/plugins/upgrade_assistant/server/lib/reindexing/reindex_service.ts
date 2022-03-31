/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient, Logger } from 'src/core/server';
import { first } from 'rxjs/operators';

import { LicensingPluginSetup } from '../../../../licensing/server';

import {
  ReindexSavedObject,
  ReindexStatus,
  ReindexStep,
  ReindexWarning,
} from '../../../common/types';

import { esIndicesStateCheck } from '../es_indices_state_check';

import {
  generateNewIndexName,
  getReindexWarnings,
  sourceNameForIndex,
  transformFlatSettings,
} from './index_settings';

import { ReindexActions } from './reindex_actions';

import { error } from './error';

export interface ReindexService {
  /**
   * Checks whether or not the user has proper privileges required to reindex this index.
   * @param indexName
   */
  hasRequiredPrivileges(indexName: string): Promise<boolean>;

  /**
   * Checks an index's settings and mappings to flag potential issues during reindex.
   * Resolves to null if index does not exist.
   * @param indexName
   */
  detectReindexWarnings(indexName: string): Promise<ReindexWarning[] | undefined>;

  /**
   * Creates a new reindex operation for a given index.
   * @param indexName
   * @param opts Additional options when creating a new reindex operation
   */
  createReindexOperation(
    indexName: string,
    opts?: { enqueue?: boolean }
  ): Promise<ReindexSavedObject>;

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
   * Delete reindex operations for completed indices with deprecations.
   * @param indexNames
   */
  cleanupReindexOperations(indexNames: string[]): Promise<void> | null;

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
   * @param opts As with {@link createReindexOperation} we support this setting.
   */
  resumeReindexOperation(
    indexName: string,
    opts?: { enqueue?: boolean }
  ): Promise<ReindexSavedObject>;

  /**
   * Update the update_at field on the reindex operation
   *
   * @remark
   * Currently also sets a startedAt field on the SavedObject, not really used
   * elsewhere, but is an indication that the object has started being processed.
   *
   * @param indexName
   */
  startQueuedReindexOperation(indexName: string): Promise<ReindexSavedObject>;

  /**
   * Cancel an in-progress reindex operation for a given index. Only allowed when the
   * reindex operation is in the ReindexStep.reindexStarted step. Relies on the ReindexWorker
   * to continue processing the reindex operation to detect that the Reindex Task in ES has been
   * cancelled.
   * @param indexName
   */
  cancelReindexing(indexName: string): Promise<ReindexSavedObject>;

  getIndexAliases(indexName: string): any;
}

export const reindexServiceFactory = (
  esClient: ElasticsearchClient,
  actions: ReindexActions,
  log: Logger,
  licensing: LicensingPluginSetup
): ReindexService => {
  // ------ Utility functions
  const cleanupChanges = async (reindexOp: ReindexSavedObject) => {
    // Cancel reindex task if it was started but not completed
    if (reindexOp.attributes.lastCompletedStep === ReindexStep.reindexStarted) {
      await esClient.tasks
        .cancel({
          task_id: reindexOp.attributes.reindexTaskId ?? undefined,
        })
        .catch(() => undefined); // Ignore any exceptions trying to cancel (it may have already completed).
    }

    // Set index back to writable if we ever got past this point.
    if (reindexOp.attributes.lastCompletedStep >= ReindexStep.readonly) {
      await esClient.indices.putSettings({
        index: reindexOp.attributes.indexName,
        body: { blocks: { write: false } },
      });
    }

    if (
      reindexOp.attributes.lastCompletedStep >= ReindexStep.newIndexCreated &&
      reindexOp.attributes.lastCompletedStep < ReindexStep.aliasCreated
    ) {
      await esClient.indices.delete({
        index: reindexOp.attributes.newIndexName,
      });
    }

    return reindexOp;
  };

  // ------ Functions used to process the state machine

  /**
   * Sets the original index as readonly so new data can be indexed until the reindex
   * is completed.
   * @param reindexOp
   */
  const setReadonly = async (reindexOp: ReindexSavedObject) => {
    const { indexName } = reindexOp.attributes;
    const putReadonly = await esClient.indices.putSettings({
      index: indexName,
      body: { blocks: { write: true } },
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
      throw error.indexNotFound(`Index ${indexName} does not exist.`);
    }

    const { settings, mappings } = transformFlatSettings(flatSettings);

    let createIndex;
    try {
      createIndex = await esClient.indices.create({
        index: newIndexName,
        body: {
          settings,
          mappings,
        },
      });
    } catch (err) {
      // If for any reason the new index name generated by the `generateNewIndexName` already
      // exists (this could happen if kibana is restarted during reindexing), we can just go
      // ahead with the process without needing to create the index again.
      // See: https://github.com/elastic/kibana/issues/123816
      if (err?.body?.error?.type !== 'resource_already_exists_exception') {
        throw err;
      }
    }

    if (createIndex && !createIndex?.acknowledged) {
      throw error.cannotCreateIndex(`Index could not be created: ${newIndexName}`);
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
    const { indexName, reindexOptions } = reindexOp.attributes;

    // Where possible, derive reindex options at the last moment before reindexing
    // to prevent them from becoming stale as they wait in the queue.
    const indicesState = await esIndicesStateCheck(esClient, [indexName]);
    const shouldOpenAndClose = indicesState[indexName] === 'closed';
    if (shouldOpenAndClose) {
      log.debug(`Detected closed index ${indexName}, opening...`);
      await esClient.indices.open({ index: indexName });
    }

    const flatSettings = await actions.getFlatSettings(indexName);
    if (!flatSettings) {
      throw error.indexNotFound(`Index ${indexName} does not exist.`);
    }

    const startReindexResponse = await esClient.reindex({
      refresh: true,
      wait_for_completion: false,
      body: {
        source: { index: indexName },
        dest: { index: reindexOp.attributes.newIndexName },
      },
    });

    return actions.updateReindexOp(reindexOp, {
      lastCompletedStep: ReindexStep.reindexStarted,
      reindexTaskId:
        startReindexResponse.task === undefined
          ? startReindexResponse.task
          : String(startReindexResponse.task),
      reindexTaskPercComplete: 0,
      reindexOptions: {
        ...(reindexOptions ?? {}),
        // Indicate to downstream states whether we opened a closed index that should be
        // closed again.
        openAndClose: shouldOpenAndClose,
      },
    });
  };

  /**
   * Polls Elasticsearch's Tasks API to see if the reindex operation has been completed.
   * @param reindexOp
   */
  const updateReindexStatus = async (reindexOp: ReindexSavedObject) => {
    const taskId = reindexOp.attributes.reindexTaskId!;

    // Check reindexing task progress
    const taskResponse = await esClient.tasks.get({
      task_id: taskId,
      wait_for_completion: false,
    });

    if (!taskResponse.completed) {
      // Updated the percent complete
      const perc = taskResponse.task.status!.created / taskResponse.task.status!.total;
      return actions.updateReindexOp(reindexOp, {
        reindexTaskPercComplete: perc,
      });
    } else if (taskResponse.task.status?.canceled === 'by user request') {
      // Set the status to cancelled
      reindexOp = await actions.updateReindexOp(reindexOp, {
        status: ReindexStatus.cancelled,
      });

      // Do any other cleanup work necessary
      reindexOp = await cleanupChanges(reindexOp);
    } else {
      // Check that no failures occurred
      if (taskResponse.response?.failures?.length) {
        // Include the entire task result in the error message. This should be guaranteed
        // to be JSON-serializable since it just came back from Elasticsearch.
        throw error.reindexTaskFailed(`Reindexing failed: ${JSON.stringify(taskResponse)}`);
      }

      // Update the status
      reindexOp = await actions.updateReindexOp(reindexOp, {
        lastCompletedStep: ReindexStep.reindexCompleted,
        reindexTaskPercComplete: 1,
      });
    }

    // Delete the task from ES .tasks index
    const deleteTaskResp = await esClient.delete({
      index: '.tasks',
      id: taskId,
    });

    if (deleteTaskResp.result !== 'deleted') {
      throw error.reindexTaskCannotBeDeleted(`Could not delete reindexing task ${taskId}`);
    }

    return reindexOp;
  };

  const getIndexAliases = async (indexName: string) => {
    const response = await esClient.indices.getAlias({
      index: indexName,
    });

    return response[indexName]?.aliases ?? {};
  };

  /**
   * Creates an alias that points the old index to the new index, deletes the old index.
   * @param reindexOp
   */
  const switchAlias = async (reindexOp: ReindexSavedObject) => {
    const { indexName, newIndexName, reindexOptions } = reindexOp.attributes;

    const existingAliases = await getIndexAliases(indexName);

    const extraAliases = Object.keys(existingAliases).map((aliasName) => ({
      add: { index: newIndexName, alias: aliasName, ...existingAliases[aliasName] },
    }));

    const aliasResponse = await esClient.indices.updateAliases({
      body: {
        actions: [
          { add: { index: newIndexName, alias: indexName } },
          { remove_index: { index: indexName } },
          ...extraAliases,
        ],
      },
    });

    if (!aliasResponse.acknowledged) {
      throw error.cannotCreateIndex(`Index aliases could not be created.`);
    }

    if (reindexOptions?.openAndClose === true) {
      await esClient.indices.close({ index: indexName });
    }

    return actions.updateReindexOp(reindexOp, {
      lastCompletedStep: ReindexStep.aliasCreated,
    });
  };

  // ------ The service itself

  return {
    async hasRequiredPrivileges(indexName: string) {
      /**
       * To avoid a circular dependency on Security we use a work around
       * here to detect whether Security is available and enabled
       * (i.e., via the licensing plugin). This enables Security to use
       * functionality exposed through Upgrade Assistant.
       */
      const license = await licensing.license$.pipe(first()).toPromise();

      const securityFeature = license.getFeature('security');

      // If security is disabled or unavailable, return true.
      if (!securityFeature || !(securityFeature.isAvailable && securityFeature.isEnabled)) {
        return true;
      }

      const names = [indexName, generateNewIndexName(indexName)];
      const sourceName = sourceNameForIndex(indexName);

      // if we have re-indexed this in the past, there will be an
      // underlying alias we will also need to update.
      if (sourceName !== indexName) {
        names.push(sourceName);
      }

      // Otherwise, query for required privileges for this index.
      const body = {
        cluster: ['manage'],
        index: [
          {
            names,
            allow_restricted_indices: true,
            privileges: ['all'],
          },
          {
            names: ['.tasks'],
            privileges: ['read', 'delete'],
          },
        ],
      } as any;

      const resp = await esClient.security.hasPrivileges({
        body,
      });

      return resp.has_all_requested;
    },

    async detectReindexWarnings(indexName: string): Promise<ReindexWarning[] | undefined> {
      const flatSettings = await actions.getFlatSettings(indexName);

      if (!flatSettings) {
        return undefined;
      } else {
        return [
          // By default all reindexing operations will replace an index with an alias (with the same name)
          // pointing to a newly created "reindexed" index. This is destructive as delete operations originally
          // done on the index itself will now need to be done to the "reindexed-{indexName}"
          {
            warningType: 'replaceIndexWithAlias',
          },
          ...getReindexWarnings(flatSettings),
        ];
      }
    },

    async createReindexOperation(indexName: string, opts?: { enqueue: boolean }) {
      const indexExists = await esClient.indices.exists({ index: indexName });
      if (!indexExists) {
        throw error.indexNotFound(`Index ${indexName} does not exist in this cluster.`);
      }

      const existingReindexOps = await actions.findReindexOperations(indexName);
      if (existingReindexOps.total !== 0) {
        const existingOp = existingReindexOps.saved_objects[0];
        if (
          existingOp.attributes.status === ReindexStatus.failed ||
          existingOp.attributes.status === ReindexStatus.cancelled
        ) {
          // Delete the existing one if it failed or was cancelled to give a chance to retry.
          await actions.deleteReindexOp(existingOp);
        } else {
          throw error.reindexAlreadyInProgress(
            `A reindex operation already in-progress for ${indexName}`
          );
        }
      }

      return actions.createReindexOp(
        indexName,
        opts?.enqueue ? { queueSettings: { queuedAt: Date.now() } } : undefined
      );
    },

    async findReindexOperation(indexName: string) {
      const findResponse = await actions.findReindexOperations(indexName);

      // Bail early if it does not exist or there is more than one.
      if (findResponse.total === 0) {
        return null;
      } else if (findResponse.total > 1) {
        throw error.multipleReindexJobsFound(
          `More than one reindex operation found for ${indexName}`
        );
      }

      return findResponse.saved_objects[0];
    },

    async cleanupReindexOperations(indexNames: string[]) {
      const performCleanup = async (indexName: string) => {
        const existingReindexOps = await actions.findReindexOperations(indexName);

        if (existingReindexOps && existingReindexOps.total !== 0) {
          const existingOp = existingReindexOps.saved_objects[0];
          if (existingOp.attributes.status === ReindexStatus.completed) {
            // Delete the existing one if its status is completed, but still contains deprecation warnings
            // example scenario: index was upgraded, but then deleted and restored with an old snapshot
            await actions.deleteReindexOp(existingOp);
          }
        }
      };

      await Promise.all(indexNames.map(performCleanup));
    },

    findAllByStatus: actions.findAllByStatus,

    async processNextStep(reindexOp: ReindexSavedObject) {
      return actions.runWhileLocked(reindexOp, async (lockedReindexOp) => {
        try {
          switch (lockedReindexOp.attributes.lastCompletedStep) {
            case ReindexStep.created:
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
              lockedReindexOp = await actions.updateReindexOp(lockedReindexOp, {
                status: ReindexStatus.completed,
              });
              break;
            default:
              break;
          }
        } catch (e) {
          log.error(`Reindexing step failed: ${e instanceof Error ? e.stack : e.toString()}`);

          // Trap the exception and add the message to the object so the UI can display it.
          lockedReindexOp = await actions.updateReindexOp(lockedReindexOp, {
            status: ReindexStatus.failed,
            errorMessage: e.toString(),
          });

          // Cleanup any changes, ignoring any errors.
          lockedReindexOp = await cleanupChanges(lockedReindexOp).catch((err) => lockedReindexOp);
        }

        return lockedReindexOp;
      });
    },

    async pauseReindexOperation(indexName: string) {
      const reindexOp = await this.findReindexOperation(indexName);

      if (!reindexOp) {
        throw new Error(`No reindex operation found for index ${indexName}`);
      }

      return actions.runWhileLocked(reindexOp, async (op) => {
        if (op.attributes.status === ReindexStatus.paused) {
          // Another node already paused the operation, don't do anything
          return reindexOp;
        } else if (op.attributes.status !== ReindexStatus.inProgress) {
          throw new Error(`Reindex operation must be inProgress in order to be paused.`);
        }

        return actions.updateReindexOp(op, { status: ReindexStatus.paused });
      });
    },

    async resumeReindexOperation(indexName: string, opts?: { enqueue: boolean }) {
      const reindexOp = await this.findReindexOperation(indexName);

      if (!reindexOp) {
        throw new Error(`No reindex operation found for index ${indexName}`);
      }

      return actions.runWhileLocked(reindexOp, async (op) => {
        if (op.attributes.status === ReindexStatus.inProgress) {
          // Another node already resumed the operation, don't do anything
          return reindexOp;
        } else if (op.attributes.status !== ReindexStatus.paused) {
          throw new Error(`Reindex operation must be paused in order to be resumed.`);
        }
        const queueSettings = opts?.enqueue ? { queuedAt: Date.now() } : undefined;

        return actions.updateReindexOp(op, {
          status: ReindexStatus.inProgress,
          reindexOptions: queueSettings ? { queueSettings } : undefined,
        });
      });
    },

    async startQueuedReindexOperation(indexName: string) {
      const reindexOp = await this.findReindexOperation(indexName);

      if (!reindexOp) {
        throw error.indexNotFound(`No reindex operation found for index ${indexName}`);
      }

      if (!reindexOp.attributes.reindexOptions?.queueSettings) {
        throw error.reindexIsNotInQueue(`Reindex operation ${indexName} is not in the queue.`);
      }

      return actions.runWhileLocked(reindexOp, async (lockedReindexOp) => {
        const { reindexOptions } = lockedReindexOp.attributes;
        reindexOptions!.queueSettings!.startedAt = Date.now();
        return actions.updateReindexOp(lockedReindexOp, {
          reindexOptions,
        });
      });
    },

    async cancelReindexing(indexName: string) {
      const reindexOp = await this.findReindexOperation(indexName);

      if (!reindexOp) {
        throw error.indexNotFound(`No reindex operation found for index ${indexName}`);
      } else if (reindexOp.attributes.status !== ReindexStatus.inProgress) {
        throw error.reindexCannotBeCancelled(`Reindex operation is not in progress`);
      } else if (reindexOp.attributes.lastCompletedStep !== ReindexStep.reindexStarted) {
        throw error.reindexCannotBeCancelled(
          `Reindex operation is not currently waiting for reindex task to complete`
        );
      }

      const resp = await esClient.tasks.cancel({
        task_id: reindexOp.attributes.reindexTaskId!,
      });

      if (resp.node_failures && resp.node_failures.length > 0) {
        throw error.reindexCannotBeCancelled(`Could not cancel reindex.`);
      }

      return reindexOp;
    },

    getIndexAliases,
  };
};
