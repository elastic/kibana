/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { range } from 'lodash';
import moment from 'moment';

import { CallCluster } from 'src/legacy/core_plugins/elasticsearch';
import {
  FindResponse,
  SavedObjectsClient,
} from 'src/server/saved_objects/service/saved_objects_client';
import {
  REINDEX_OP_TYPE,
  ReindexOperation,
  ReindexSavedObject,
  ReindexStatus,
  ReindexStep,
} from '../../../common/types';
import { findBooleanFields } from './index_settings';
import { FlatSettings } from './types';

// TODO: base on elasticsearch.requestTimeout?
export const LOCK_WINDOW = moment.duration(90, 'seconds');

export const ML_LOCK_DOC_ID = '___ML_REINDEX_LOCK___';

/**
 * A collection of utility functions pulled out out of the ReindexService to make testing simpler.
 * This is NOT intended to be used by any other code.
 */
export interface ReindexActions {
  /**
   * Namespace for ML-specific actions.
   */
  // ml: MlActions;

  /**
   * Creates a new reindexOp, does not perform any pre-flight checks.
   * @param indexName
   */
  createReindexOp(indexName: string): Promise<ReindexSavedObject>;

  /**
   * Deletes a reindexOp.
   * @param reindexOp
   */
  deleteReindexOp(reindexOp: ReindexSavedObject): void;

  /**
   * Updates a ReindexSavedObject.
   * @param reindexOp
   * @param attrs
   */
  updateReindexOp(
    reindexOp: ReindexSavedObject,
    attrs?: Partial<ReindexOperation>
  ): Promise<ReindexSavedObject>;

  /**
   * Runs a callback function while locking the reindex operation. Guaranteed to unlock the reindex operation when complete.
   * @param func A function to run with the locked ML lock document. Must return a promise that resolves
   * to the updated ReindexSavedObject.
   */
  runWhileLocked(
    reindexOp: ReindexSavedObject,
    func: (reindexOp: ReindexSavedObject) => Promise<ReindexSavedObject>
  ): Promise<ReindexSavedObject>;

  /**
   * Finds the reindex operation saved object for the given index.
   * @param indexName
   */
  findReindexOperations(indexName: string): Promise<FindResponse<ReindexOperation>>;

  /**
   * Returns an array of all reindex operations that have a status.
   */
  findAllByStatus(status: ReindexStatus): Promise<ReindexSavedObject[]>;

  /**
   * Returns array of field paths to boolean fields in the index's mapping.
   * @param indexName
   */
  getBooleanFieldPaths(indexName: string): Promise<string[][]>;

  /**
   * Retrieve index settings (in flat, dot-notation style) and mappings.
   * @param indexName
   */
  getFlatSettings(indexName: string): Promise<FlatSettings | null>;

  /**
   * Tries to undo any changes that were made in the event of a failure.
   * TODO: move back to reindex service?
   * @param indexName
   */
  cleanupChanges(indexName: string): Promise<void>;

  /**
   * Returns whether or not an indexName is a special ML index that requires suspending ML jobs.
   * @param indexName
   */
  isMlIndex(indexName: string): boolean;

  // ----- Below are only for ML indices

  /**
   * Atomically increments the number of reindex operations running for ML jobs.
   */
  incrementMlReindexes(): Promise<void>;

  /**
   * Atomically decrements the number of reindex operations running for ML jobs.
   */
  decrementMlReindexes(): Promise<void>;

  /**
   * Runs a callback function while locking the ML count.
   * @param func A function to run with the locked ML lock document. Must return a promise that resolves
   * to the updated ReindexSavedObject.
   */
  runWhileMlLocked(
    func: (mlLockDoc: ReindexSavedObject) => Promise<ReindexSavedObject>
  ): Promise<void>;

  /**
   * Exposed only for testing, DO NOT USE.
   */
  _fetchAndLockMlDoc(): Promise<ReindexSavedObject>;
}

export const reindexActionsFactory = (
  client: SavedObjectsClient,
  callCluster: CallCluster
): ReindexActions => {
  // ----- Internal functions
  /**
   * Generates a new index name for the new index. Iterates until it finds an index
   * that doesn't already exist.
   * @param indexName
   */
  const getNewIndexName = async (indexName: string, attempts = 100) => {
    for (const i of range(0, attempts)) {
      const newIndexName = `${indexName}-reindex-${i}`;
      if (!(await callCluster('indices.exists', { index: newIndexName }))) {
        return newIndexName;
      }
    }

    throw new Error(
      `Could not generate an indexName that does not already exist after ${attempts} attempts.`
    );
  };

  const isLocked = (reindexOp: ReindexSavedObject) => {
    if (reindexOp.attributes.locked) {
      const now = moment();
      const lockedTime = moment(reindexOp.attributes.locked);
      // If the object has been locked for more than the LOCK_WINDOW, assume the process that locked it died.
      if (now.subtract(LOCK_WINDOW) < lockedTime) {
        return true;
      }
    }

    return false;
  };

  const acquireLock = async (reindexOp: ReindexSavedObject) => {
    if (isLocked(reindexOp)) {
      throw new Error(`Another Kibana process is currently modifying this reindex operation.`);
    }

    return client.update<ReindexOperation>(
      REINDEX_OP_TYPE,
      reindexOp.id,
      { ...reindexOp.attributes, locked: moment().format() },
      { version: reindexOp.version }
    );
  };

  const releaseLock = (reindexOp: ReindexSavedObject) => {
    return client.update<ReindexOperation>(
      REINDEX_OP_TYPE,
      reindexOp.id,
      { ...reindexOp.attributes, locked: null },
      { version: reindexOp.version }
    );
  };

  // ----- Public interface
  return {
    async createReindexOp(indexName: string) {
      return client.create<ReindexOperation>(REINDEX_OP_TYPE, {
        indexName,
        newIndexName: await getNewIndexName(indexName),
        status: ReindexStatus.inProgress,
        lastCompletedStep: ReindexStep.created,
        locked: null,
        reindexTaskId: null,
        reindexTaskPercComplete: null,
        errorMessage: null,
        mlReindexCount: null,
      });
    },

    deleteReindexOp(reindexOp: ReindexSavedObject) {
      return client.delete(REINDEX_OP_TYPE, reindexOp.id);
    },

    async updateReindexOp(reindexOp: ReindexSavedObject, attrs: Partial<ReindexOperation> = {}) {
      if (!isLocked(reindexOp)) {
        throw new Error(`ReindexOperation must be locked before updating.`);
      }

      const newAttrs = { ...reindexOp.attributes, locked: moment().format(), ...attrs };
      return client.update<ReindexOperation>(REINDEX_OP_TYPE, reindexOp.id, newAttrs, {
        version: reindexOp.version,
      });
    },

    async runWhileLocked(reindexOp, func) {
      reindexOp = await acquireLock(reindexOp);

      try {
        reindexOp = await func(reindexOp);
      } finally {
        reindexOp = await releaseLock(reindexOp);
      }

      return reindexOp;
    },

    findReindexOperations(indexName: string) {
      return client.find<ReindexOperation>({
        type: REINDEX_OP_TYPE,
        search: `"${indexName}"`,
        searchFields: ['indexName'],
      });
    },

    async findAllByStatus(status: ReindexStatus) {
      const firstPage = await client.find<ReindexOperation>({
        type: REINDEX_OP_TYPE,
        search: status.toString(),
        searchFields: ['status'],
      });

      if (firstPage.total === firstPage.saved_objects.length) {
        return firstPage.saved_objects;
      }

      let allOps = firstPage.saved_objects;
      let page = firstPage.page + 1;

      while (allOps.length < firstPage.total) {
        const nextPage = await client.find<ReindexOperation>({
          type: REINDEX_OP_TYPE,
          search: status.toString(),
          searchFields: ['status'],
          page,
        });

        allOps = [...allOps, ...nextPage.saved_objects];
        page++;
      }

      return allOps;
    },

    async getBooleanFieldPaths(indexName: string) {
      const results = await callCluster('indices.getMapping', { index: indexName });
      const allMappings = results[indexName].mappings;
      const mappingTypes = Object.keys(allMappings);

      if (mappingTypes.length > 1) {
        throw new Error(`Cannot reindex indices with more than one mapping type.`);
      }

      const mapping = allMappings[mappingTypes[0]];
      // It's possible an index doesn't have a mapping.
      return mapping ? findBooleanFields(mapping.properties) : [];
    },

    async getFlatSettings(indexName: string) {
      const flatSettings = (await callCluster('transport.request', {
        // TODO: set `&include_type_name=true` to false in 7.0
        path: `/${encodeURIComponent(indexName)}?flat_settings=true`,
      })) as { [indexName: string]: FlatSettings };

      if (!flatSettings[indexName]) {
        return null;
      }

      return flatSettings[indexName];
    },

    async cleanupChanges(indexName: string) {
      await callCluster('indices.putSettings', {
        index: indexName,
        body: { 'index.blocks.write': false },
      });
    },

    isMlIndex(indexName: string) {
      return indexName.startsWith('.ml-state') || indexName.startsWith('.ml-anomalies');
    },

    async _fetchAndLockMlDoc() {
      const fetchDoc = async () => {
        try {
          return await client.get<ReindexOperation>(REINDEX_OP_TYPE, ML_LOCK_DOC_ID);
        } catch (e) {
          // TODO: guard
          return await client.create<ReindexOperation>(
            REINDEX_OP_TYPE,
            {
              indexName: null,
              newIndexName: null,
              locked: null,
              status: null,
              lastCompletedStep: null,
              reindexTaskId: null,
              reindexTaskPercComplete: null,
              errorMessage: null,
              mlReindexCount: 0,
            } as any,
            { id: ML_LOCK_DOC_ID }
          );
        }
      };

      const lockDoc = async (attempt = 1): Promise<ReindexSavedObject> => {
        try {
          // Refetch the document each time to avoid version conflicts.
          return await acquireLock(await fetchDoc());
        } catch (e) {
          if (attempt >= 10) {
            throw new Error(`Could not acquire lock for ML jobs`);
          }

          await new Promise(resolve => setTimeout(resolve, 1000));
          return lockDoc(attempt + 1);
        }
      };

      return lockDoc();
    },

    async incrementMlReindexes() {
      this.runWhileMlLocked(mlDoc =>
        this.updateReindexOp(mlDoc, {
          mlReindexCount: mlDoc.attributes.mlReindexCount! + 1,
        })
      );
    },

    async decrementMlReindexes() {
      this.runWhileMlLocked(mlDoc =>
        this.updateReindexOp(mlDoc, {
          mlReindexCount: mlDoc.attributes.mlReindexCount! - 1,
        })
      );
    },

    async runWhileMlLocked(func) {
      let mlDoc = await this._fetchAndLockMlDoc();

      try {
        mlDoc = await func(mlDoc);
      } finally {
        await releaseLock(mlDoc);
      }
    },
  };
};
