/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { isEqual } from 'lodash';

import { CallCluster } from 'src/legacy/core_plugins/elasticsearch';
import { Server } from 'src/server/kbn_server';
import { SavedObjectsClient } from 'src/server/saved_objects';

import {
  ReindexSavedObject,
  ReindexService,
  reindexServiceFactory,
  ReindexStatus,
  ReindexStep,
} from './reindex_service';

const POLL_INTERVAL = 30000;

const LOG_TAGS = ['upgrade_assistant', 'reindex_worker'];

/**
 * A singleton worker that will coordinate two polling loops:
 *   (1) A longer loop that polls for reindex operations that are in progress. If any are found, loop (2) is started.
 *   (2) A tighter loop that pushes each in progress reindex operation through ReindexService.processNextStep. If all
 *       updated reindex operations are complete, this loop will terminate.
 *
 * The worker can also be forced to start loop (2) by calling forceRefresh(). This is done when we know a new reindex
 * operation has been started.
 *
 * This worker can be ran on multiple nodes without conflicts or dropped jobs. Reindex operations are locked by the
 * ReindexService and if any operation is locked longer than the ReindexService's timeout, it is assumed to have been
 * locked by a node that is no longer running (crashed or shutdown). In this case, another node may safely acquire
 * the lock for this reindex operation.
 */
export class ReindexWorker {
  private static workerSingleton?: ReindexWorker;
  private continuePolling: boolean = false;
  private updateOperationLoopRunning: boolean = false;
  private inProgressOps: ReindexSavedObject[] = [];
  private readonly reindexService: ReindexService;

  private processNextStep: (reindexOp: ReindexSavedObject) => Promise<ReindexSavedObject>;

  constructor(
    client: SavedObjectsClient,
    callWithInternalUser: CallCluster,
    private readonly log: Server['log']
  ) {
    if (ReindexWorker.workerSingleton) {
      throw new Error(`More than one ReindexWorker cannot be created.`);
    }

    this.reindexService = reindexServiceFactory(client, callWithInternalUser);
    this.processNextStep = swallowExceptions(this.reindexService.processNextStep, this.log);
    ReindexWorker.workerSingleton = this;
  }

  /**
   * Begins loop (1) to begin checking for in progress reindex operations.
   */
  public start = () => {
    this.log(['debug', ...LOG_TAGS], `Starting worker...`);
    this.continuePolling = true;
    this.pollForOperations();
  };

  /**
   * Stops the worker from processing any further reindex operations.
   */
  public stop = () => {
    this.log(['debug', ...LOG_TAGS], `Stopping worker...`);
    this.updateOperationLoopRunning = false;
    this.continuePolling = false;
  };

  /**
   * Should be called immediately after this server has started a new reindex operation.
   */
  public forceRefresh = () => {
    this.refresh();
  };

  /**
   * Returns whether or not the given ReindexOperation is in the worker's queue.
   */
  public includes = (reindexOp: ReindexSavedObject) => {
    return this.inProgressOps.map(o => o.id).includes(reindexOp.id);
  };

  private startUpdateOperationLoop = async () => {
    this.updateOperationLoopRunning = true;

    while (this.inProgressOps.length > 0) {
      this.log(['debug', ...LOG_TAGS], `Updating ${this.inProgressOps.length} reindex operations`);

      // Push each operation through the state machine and refresh.
      await Promise.all(this.inProgressOps.map(this.processNextStep));
      await this.refresh();
    }

    this.updateOperationLoopRunning = false;
  };

  private pollForOperations = async () => {
    this.log(['debug', ...LOG_TAGS], `Polling for reindex operations`);

    await this.refresh();

    if (this.continuePolling) {
      setTimeout(this.pollForOperations, POLL_INTERVAL);
    }
  };

  private refresh = async () => {
    const resp = await this.reindexService.findAllInProgressOperations();
    this.inProgressOps = resp.saved_objects;

    // If there are operations in progress and we're not already updating operations, kick off the update loop
    if (!this.updateOperationLoopRunning) {
      this.startUpdateOperationLoop();
    }
  };
}

const swallowExceptions = (
  func: (reindexOp: ReindexSavedObject) => Promise<ReindexSavedObject>,
  log: Server['log']
) => async (reindexOp: ReindexSavedObject) => {
  try {
    return await func(reindexOp);
  } catch (e) {
    if (reindexOp.attributes.locked) {
      log(['debug', ...LOG_TAGS], `Skipping reindexOp with unexpired lock: ${reindexOp.id}`);
    } else {
      log(
        ['warning', ...LOG_TAGS],
        `Error when trying to process reindexOp (${reindexOp.id}): ${e.toString()}`
      );
    }

    return reindexOp;
  }
};
