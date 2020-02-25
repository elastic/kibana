/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { IClusterClient, Logger, SavedObjectsClientContract, FakeRequest } from 'src/core/server';
import moment from 'moment';

import { ReindexSavedObject, ReindexStatus } from '../../../common/types';
import { CredentialStore } from './credential_store';
import { reindexActionsFactory } from './reindex_actions';
import { ReindexService, reindexServiceFactory } from './reindex_service';
import { LicensingPluginSetup } from '../../../../licensing/server';

const POLL_INTERVAL = 30000;
// If no nodes have been able to update this index in 2 minutes (due to missing credentials), set to paused.
const PAUSE_WINDOW = POLL_INTERVAL * 4;

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
  private timeout?: NodeJS.Timeout;
  private inProgressOps: ReindexSavedObject[] = [];
  private readonly reindexService: ReindexService;
  private readonly log: Logger;

  constructor(
    private client: SavedObjectsClientContract,
    private credentialStore: CredentialStore,
    private clusterClient: IClusterClient,
    log: Logger,
    private licensing: LicensingPluginSetup
  ) {
    this.log = log.get('reindex_worker');
    if (ReindexWorker.workerSingleton) {
      throw new Error(`More than one ReindexWorker cannot be created.`);
    }

    const callAsInternalUser = this.clusterClient.callAsInternalUser.bind(this.clusterClient);

    this.reindexService = reindexServiceFactory(
      callAsInternalUser,
      reindexActionsFactory(this.client, callAsInternalUser),
      log,
      this.licensing
    );

    ReindexWorker.workerSingleton = this;
  }

  /**
   * Begins loop (1) to begin checking for in progress reindex operations.
   */
  public start = () => {
    this.log.debug('Starting worker...');
    this.continuePolling = true;
    this.pollForOperations();
  };

  /**
   * Stops the worker from processing any further reindex operations.
   */
  public stop = () => {
    this.log.debug('Stopping worker...');
    if (this.timeout) {
      clearTimeout(this.timeout);
    }

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

  /**
   * Runs an async loop until all inProgress jobs are complete or failed.
   */
  private startUpdateOperationLoop = async () => {
    this.updateOperationLoopRunning = true;

    while (this.inProgressOps.length > 0) {
      this.log.debug(`Updating ${this.inProgressOps.length} reindex operations`);

      // Push each operation through the state machine and refresh.
      await Promise.all(this.inProgressOps.map(this.processNextStep));
      await this.refresh();
    }

    this.updateOperationLoopRunning = false;
  };

  private pollForOperations = async () => {
    this.log.debug(`Polling for reindex operations`);

    await this.refresh();

    if (this.continuePolling) {
      this.timeout = setTimeout(this.pollForOperations, POLL_INTERVAL);
    }
  };

  private refresh = async () => {
    try {
      this.inProgressOps = await this.reindexService.findAllByStatus(ReindexStatus.inProgress);
    } catch (e) {
      this.log.debug(`Could not fetch reindex operations from Elasticsearch`);
      this.inProgressOps = [];
    }

    // If there are operations in progress and we're not already updating operations, kick off the update loop
    if (!this.updateOperationLoopRunning) {
      this.startUpdateOperationLoop();
    }
  };

  private processNextStep = async (reindexOp: ReindexSavedObject) => {
    const credential = this.credentialStore.get(reindexOp);

    if (!credential) {
      // Set to paused state if the job hasn't been updated in PAUSE_WINDOW.
      // This indicates that no Kibana nodes currently have credentials to update this job.
      const now = moment();
      const updatedAt = moment(reindexOp.updated_at);
      if (updatedAt < now.subtract(PAUSE_WINDOW)) {
        return this.reindexService.pauseReindexOperation(reindexOp.attributes.indexName);
      } else {
        // If it has been updated recently, we assume another node has the necessary credentials,
        // and this becomes a noop.
        return reindexOp;
      }
    }

    // Setup a ReindexService specific to these credentials.
    const fakeRequest: FakeRequest = { headers: credential };

    const scopedClusterClient = this.clusterClient.asScoped(fakeRequest);
    const callAsCurrentUser = scopedClusterClient.callAsCurrentUser.bind(scopedClusterClient);
    const actions = reindexActionsFactory(this.client, callAsCurrentUser);

    const service = reindexServiceFactory(callAsCurrentUser, actions, this.log, this.licensing);
    reindexOp = await swallowExceptions(service.processNextStep, this.log)(reindexOp);

    // Update credential store with most recent state.
    this.credentialStore.set(reindexOp, credential);
  };
}

/**
 * Swallows any exceptions that may occur during the reindex process. This prevents any errors from
 * stopping the worker from continuing to process more jobs.
 */
const swallowExceptions = (
  func: (reindexOp: ReindexSavedObject) => Promise<ReindexSavedObject>,
  log: Logger
) => async (reindexOp: ReindexSavedObject) => {
  try {
    return await func(reindexOp);
  } catch (e) {
    if (reindexOp.attributes.locked) {
      log.debug(`Skipping reindexOp with unexpired lock: ${reindexOp.id}`);
    } else {
      log.warn(`Error when trying to process reindexOp (${reindexOp.id}): ${e.toString()}`);
    }

    return reindexOp;
  }
};
