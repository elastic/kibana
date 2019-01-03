/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';
import { omit } from 'lodash';
import moment from 'moment';
import { CallCluster } from 'src/legacy/core_plugins/elasticsearch';
import {
  FindResponse,
  SavedObject,
  SavedObjectAttributes,
  SavedObjectsClient,
} from 'src/server/saved_objects/service/saved_objects_client';

// TODO: base on elasticsearch.requestTimeout?
export const LOCK_WINDOW = moment.duration(90, 'seconds');

export enum ReindexStep {
  created,
  readonly,
  newIndexCreated,
  reindexStarted,
  reindexCompleted,
  aliasCreated,
}

export enum ReindexStatus {
  inProgress,
  completed,
  failed,
}

export const REINDEX_OP_TYPE = 'upgrade-assistant-reindex-operation';
export interface ReindexOperation extends SavedObjectAttributes {
  indexName: string;
  newIndexName: string;
  status: ReindexStatus;
  lastCompletedStep: ReindexStep;
  locked: string | null;
  reindexTaskId: string | null;
  reindexTaskPercComplete: number | null;
  errorMessage: string | null;
}

export type ReindexSavedObject = SavedObject<ReindexOperation>;

export interface ReindexService {
  createReindexOperation(indexName: string): Promise<ReindexSavedObject>;
  findAllInProgressOperations(): Promise<FindResponse<ReindexOperation>>;
  findReindexOperation(indexName: string): Promise<ReindexSavedObject>;
  processNextStep(reindexOp: ReindexSavedObject): Promise<ReindexSavedObject>;
}

export const reindexServiceFactory = (
  client: SavedObjectsClient,
  callCluster: CallCluster
): ReindexService => {
  // ------ Utility functions used internally

  const updateReindexOp = (
    reindexOp: ReindexSavedObject,
    attrs: Partial<ReindexOperation> = {}
  ) => {
    return client.update<ReindexOperation>(
      REINDEX_OP_TYPE,
      reindexOp.id,
      { ...reindexOp.attributes, locked: moment().format(), ...attrs },
      { version: reindexOp.version }
    );
  };

  /**
   * Marks the reindex operation as locked by the current kibana process for up to LOCK_WINDOW
   * @param reindexOp
   */
  const acquireLock = async (reindexOp: ReindexSavedObject) => {
    const now = moment();
    if (reindexOp.attributes.locked) {
      const lockedTime = moment(reindexOp.attributes.locked);
      // If the object has been locked for more than the LOCK_WINDOW, assume the process that locked it died.
      if (now.subtract(LOCK_WINDOW) < lockedTime) {
        throw Boom.conflict(
          `Another Kibana process is currently modifying this reindex operation.`
        );
      }
    }

    return client.update<ReindexOperation>(
      REINDEX_OP_TYPE,
      reindexOp.id,
      { ...reindexOp.attributes, locked: now.format() },
      { version: reindexOp.version }
    );
  };

  /**
   * Releases the lock on the reindex operation.
   * @param reindexOp
   */
  const releaseLock = (reindexOp: ReindexSavedObject) => {
    return client.update<ReindexOperation>(
      REINDEX_OP_TYPE,
      reindexOp.id,
      { ...reindexOp.attributes, locked: null },
      { version: reindexOp.version }
    );
  };

  /**
   * Finds the reindex operation saved object for the given index.
   * @param indexName
   */
  const findReindexOperations = (indexName: string) => {
    return client.find<ReindexOperation>({
      type: REINDEX_OP_TYPE,
      search: `"${indexName}"`,
      searchFields: ['indexName'],
    });
  };

  // ------ Functions used to process the state machine

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

    return updateReindexOp(reindexOp, { lastCompletedStep: ReindexStep.readonly });
  };

  /**
   * Creates a new index with the same mappings and settings as the original index.
   * @param reindexOp
   */
  const createNewIndex = async (reindexOp: ReindexSavedObject) => {
    const { indexName, newIndexName } = reindexOp.attributes;
    const { settings, mappings } = await getIndexSettings(callCluster, indexName);

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

    return updateReindexOp(reindexOp, { lastCompletedStep: ReindexStep.newIndexCreated });
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

    return updateReindexOp(reindexOp, {
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
      if (taskResponse.task.status.created < taskResponse.task.status.total) {
        const failureExample = JSON.stringify(taskResponse.response.failures[0]);
        throw Boom.badData(`Reindexing failed with failures like: ${failureExample}`);
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
      return updateReindexOp(reindexOp, {
        lastCompletedStep: ReindexStep.reindexCompleted,
        reindexTaskPercComplete: 1,
      });
    } else {
      const perc = taskResponse.task.status.created / taskResponse.task.status.total;
      return updateReindexOp(reindexOp, {
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

    const aliasResponse = await callCluster('indices.updateAliases', {
      body: {
        actions: [
          { add: { index: newIndexName, alias: indexName } },
          { remove_index: { index: indexName } },
        ],
      },
    });

    if (!aliasResponse.acknowledged) {
      throw Boom.badImplementation(`Index aliases could not be created.`);
    }

    return updateReindexOp(reindexOp, {
      lastCompletedStep: ReindexStep.aliasCreated,
      status: ReindexStatus.completed,
    });
  };

  // ------ The service itself

  return {
    async createReindexOperation(indexName: string) {
      const indexExists = callCluster('indices.exists', { index: indexName });
      if (!indexExists) {
        throw Boom.notFound(`Index ${indexName} does not exist in this cluster.`);
      }

      const existingReindexOps = await findReindexOperations(indexName);
      if (existingReindexOps.total !== 0) {
        const existingOp = existingReindexOps.saved_objects[0];
        if (existingOp.attributes.status === ReindexStatus.failed) {
          // delete the existing one if it failed to give a chance to retry.
          // TODO: add log
          await client.delete(REINDEX_OP_TYPE, existingOp.id);
        } else {
          throw Boom.badImplementation(`A reindex operation already in-progress for ${indexName}`);
        }
      }

      // TODO: make this smarter, be able to fallback if this name exists.
      const newIndexName = `${indexName}-updated`;
      return client.create<ReindexOperation>(REINDEX_OP_TYPE, {
        indexName,
        newIndexName,
        status: ReindexStatus.inProgress,
        lastCompletedStep: ReindexStep.created,
        locked: null,
        reindexTaskId: null,
        reindexTaskPercComplete: null,
        errorMessage: null,
      });
    },

    async findReindexOperation(indexName: string) {
      const findResponse = await findReindexOperations(indexName);

      // Bail early if it does not exist or there is more than one.
      if (findResponse.total === 0) {
        throw Boom.notFound(`No reindex operations in-progress for ${indexName}.`);
      } else if (findResponse.total > 1) {
        throw Boom.badImplementation(`More than on reindex operation in-progress for ${indexName}`);
      }

      return findResponse.saved_objects[0];
    },

    findAllInProgressOperations() {
      return client.find<ReindexOperation>({
        type: REINDEX_OP_TYPE,
        search: ReindexStatus.inProgress.toString(),
        searchFields: ['status'],
      });
    },

    async processNextStep(reindexOp: ReindexSavedObject) {
      // If locking the operation fails, we don't want to catch it.
      reindexOp = await acquireLock(reindexOp);

      try {
        switch (reindexOp.attributes.lastCompletedStep) {
          case ReindexStep.created:
            reindexOp = await setReadonly(reindexOp);
            break;
          case ReindexStep.readonly:
            reindexOp = await createNewIndex(reindexOp);
            break;
          case ReindexStep.newIndexCreated:
            reindexOp = await startReindexing(reindexOp);
            break;
          case ReindexStep.reindexStarted:
            reindexOp = await updateReindexStatus(reindexOp);
            break;
          case ReindexStep.reindexCompleted:
            reindexOp = await switchAlias(reindexOp);
            break;
          default:
            break;
        }
      } catch (e) {
        // Trap the exception and add the message to the object so the UI can display it.
        reindexOp = await updateReindexOp(reindexOp, {
          status: ReindexStatus.failed,
          errorMessage: e instanceof Error ? e.message : e.toString(),
        });
      } finally {
        // Always make sure we return the most recent version of the saved object.
        reindexOp = await releaseLock(reindexOp);
      }

      return reindexOp;
    },
  };
};

const getIndexSettings = async (callCluster: CallCluster, indexName: string) => {
  const indexInfo = await callCluster('transport.request', {
    path: `/${encodeURIComponent(indexName)}?flat_settings`,
  });

  if (!indexInfo[indexName]) {
    throw Boom.notFound(`Index ${indexName} does not exist.`);
  }

  const settings = removeUnsettableSettings(indexInfo[indexName].settings);
  const mappings = indexInfo[indexName].mappings;
  const mappingTypes = Object.keys(mappings);

  if (mappingTypes.length > 1) {
    throw new Error(`Cannot reindex indices with more than one mapping type.`);
  }

  // _all field not supported.
  if (mappings[mappingTypes[0]]._all) {
    throw new Error(`Cannot reindex indices with _all field.`);
  }

  return { settings, mappings };
};

const removeUnsettableSettings = (settings: object) =>
  omit(settings, [
    'index.uuid',
    'index.blocks.write',
    'index.creation_date',
    'index.routing.allocation.initial_recovery._id',
    'index.version.created',
    'index.version.upgraded',
    'index.provided_name',
    'index.blocks',
    'index.legacy',
  ]);
