/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';
import { omit } from 'lodash';
import moment from 'moment';
import { CallClusterWithRequest, Request } from 'src/legacy/core_plugins/elasticsearch';
import {
  SavedObject,
  SavedObjectAttributes,
  SavedObjectsClient,
} from 'src/server/saved_objects/service/saved_objects_client';

const LOCKED_WINDOW = moment.duration(1, 'seconds');

export enum ReindexStatus {
  created,
  readonly,
  newIndexCreated,
  reindexStarted,
  reindexCompleted,
  completed,
  failed,
}

export const REINDEX_OP_TYPE = 'upgrade-assistant-reindex-operation';
export interface ReindexOperation extends SavedObjectAttributes {
  indexName: string;
  newIndexName: string;
  status: ReindexStatus;
  locked: string | null;
  reindexTaskId: string | null;
}

export type ReindexSavedObject = SavedObject<ReindexOperation>;

export interface ReindexService {
  createReindexOperation(indexName: string): Promise<ReindexSavedObject>;
  findReindexOperation(indexName: string): Promise<ReindexSavedObject>;
  processNextStep(reindexOp: ReindexSavedObject): Promise<ReindexSavedObject>;
}

export const reindexServiceFactory = (
  client: SavedObjectsClient,
  callWithRequest: CallClusterWithRequest,
  request: Request
): ReindexService => {
  // ------ Utility functions used internally

  /**
   * Update the status for the given ReindexSavedObject, returns an updated object.
   * @param reindexOp
   * @param status
   * @param additionalAttrs
   */
  const updateStatus = (
    reindexOp: ReindexSavedObject,
    status: ReindexStatus,
    additionalAttrs: Partial<ReindexOperation> = {}
  ) => {
    return client.update<ReindexOperation>(
      REINDEX_OP_TYPE,
      reindexOp.id,
      { ...reindexOp.attributes, status, locked: moment().format(), ...additionalAttrs },
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
      // If the object has been locked for more than 90 seconds, assume the process that locked it died.
      if (lockedTime.add(LOCKED_WINDOW) > now) {
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
    const putReadonly = await callWithRequest(request, 'indices.putSettings', {
      index: indexName,
      body: { 'index.blocks.write': true },
    });

    if (!putReadonly.acknowledged) {
      throw new Error(`Index could not be set to readonly.`);
    }

    return updateStatus(reindexOp, ReindexStatus.readonly);
  };

  /**
   * Creates a new index with the same mappings and settings as the original index.
   * @param reindexOp
   */
  const createNewIndex = async (reindexOp: ReindexSavedObject) => {
    const { indexName, newIndexName } = reindexOp.attributes;
    const { settings, mappings } = await getIndexSettings(callWithRequest, request, indexName);
    const createIndex = await callWithRequest(request, 'indices.create', {
      index: newIndexName,
      body: {
        settings,
        mappings,
      },
    });

    if (!createIndex.acknowledged) {
      throw Boom.badImplementation(`Index could not be created: ${newIndexName}`);
    }

    return updateStatus(reindexOp, ReindexStatus.newIndexCreated);
  };

  /**
   * Begins the reindex process via Elasticsearch's Reindex API.
   * @param reindexOp
   */
  const startReindexing = async (reindexOp: ReindexSavedObject) => {
    const { indexName } = reindexOp.attributes;
    const startReindex = (await callWithRequest(request, 'reindex', {
      refresh: true,
      waitForCompletion: false,
      body: {
        source: { index: indexName },
        dest: { index: reindexOp.attributes.newIndexName },
      },
    })) as any;

    return updateStatus(reindexOp, ReindexStatus.reindexStarted, {
      reindexTaskId: startReindex.task,
    });
  };

  /**
   * Polls Elasticsearch's Tasks API to see if the reindex operation has been completed.
   * @param reindexOp
   */
  const updateReindexStatus = async (reindexOp: ReindexSavedObject) => {
    const taskId = reindexOp.attributes.reindexTaskId;

    // Check reindexing task progress
    const taskResponse = await callWithRequest(request, 'tasks.get', {
      taskId,
      waitForCompletion: false,
    });

    if (taskResponse.completed) {
      reindexOp = await updateStatus(reindexOp, ReindexStatus.reindexCompleted);

      // Delete the task from ES .tasks index
      const deleteTaskResp = await callWithRequest(request, 'delete', {
        index: '.tasks',
        type: '_doc',
        id: taskId,
      });

      if (deleteTaskResp.result !== 'deleted') {
        throw Boom.badImplementation(`Could not delete reindexing task ${taskId}`);
      }
    } else {
      // TODO: update reindexing progress
    }

    return reindexOp;
  };

  /**
   * Creates an alias that points the old index to the new index, deletes the old index.
   * @param reindexOp
   */
  const switchAlias = async (reindexOp: ReindexSavedObject) => {
    const { indexName, newIndexName } = reindexOp.attributes;

    const aliasResponse = await callWithRequest(request, 'indices.updateAliases', {
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

    return updateStatus(reindexOp, ReindexStatus.completed);
  };

  // ------ The service itself

  return {
    async createReindexOperation(indexName: string) {
      const indexExists = callWithRequest(request, 'indices.exists', { index: indexName });
      if (!indexExists) {
        throw Boom.notFound(`Index ${indexName} does not exist in this cluster.`);
      }

      const existingReindexOps = await findReindexOperations(indexName);
      if (existingReindexOps.total !== 0) {
        throw Boom.badImplementation(`A reindex operation already in-progress for ${indexName}`);
      }

      // TODO: make this smarter, be able to fallback if this name exists.
      const newIndexName = `${indexName}-updated`;
      return client.create<ReindexOperation>(REINDEX_OP_TYPE, {
        indexName,
        newIndexName,
        status: ReindexStatus.created,
        locked: null,
        reindexTaskId: null,
      });
    },

    async findReindexOperation(indexName: string) {
      const findResponse = await findReindexOperations(indexName);

      if (findResponse.total === 0) {
        throw Boom.notFound(`No reindex operations in-progress for ${indexName}.`);
      } else if (findResponse.total > 1) {
        throw Boom.badImplementation(`More than on reindex operation in-progress for ${indexName}`);
      }

      return findResponse.saved_objects[0];
    },

    async processNextStep(reindexOp: ReindexSavedObject) {
      try {
        reindexOp = await acquireLock(reindexOp);

        switch (reindexOp.attributes.status) {
          case ReindexStatus.created:
            reindexOp = await setReadonly(reindexOp);
            break;
          case ReindexStatus.readonly:
            reindexOp = await createNewIndex(reindexOp);
            break;
          case ReindexStatus.newIndexCreated:
            reindexOp = await startReindexing(reindexOp);
            break;
          case ReindexStatus.reindexStarted:
            reindexOp = await updateReindexStatus(reindexOp);
            break;
          case ReindexStatus.reindexCompleted:
            reindexOp = await switchAlias(reindexOp);
            break;
          default:
            break;
        }
      } finally {
        // Always make sure we return the most recent version of the saved object.
        reindexOp = await releaseLock(reindexOp);
      }

      return reindexOp;
    },
  };
};

const getIndexSettings = async (
  callWithRequest: CallClusterWithRequest,
  request: Request,
  indexName: string
) => {
  const indexInfo = await callWithRequest(request, 'transport.request', {
    path: `/${encodeURIComponent(indexName)}?flat_settings`,
  });

  if (!indexInfo[indexName]) {
    throw Boom.notFound(`Index ${indexName} does not exist.`);
  }

  const settings = removeUnsettableSettings(indexInfo[indexName].settings);
  const mappings = indexInfo[indexName].mappings;

  return { settings, mappings };
};

const removeUnsettableSettings = (settings: object) =>
  omit(settings, [
    'index.uuid',
    'index.creation_date',
    'index.routing.allocation.initial_recovery._id',
    'index.version.created',
    'index.version.upgraded',
    'index.provided_name',
    'index.blocks',
    'index.legacy',
  ]);
