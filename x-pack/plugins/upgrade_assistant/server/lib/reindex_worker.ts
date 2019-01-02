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
const UPDATE_INTERVAL = 1000;

const LOG_TAGS = ['upgrade_assistant', 'reindex_worker'];

export class ReindexWorker {
  private readonly reindexService: ReindexService;
  private continuePolling: boolean = false;
  private continueUpdatingOperations: boolean = false;
  private inProgressOps: ReindexSavedObject[] = [];

  constructor(
    client: SavedObjectsClient,
    callWithInternalUser: CallCluster,
    private readonly log: Server['log']
  ) {
    this.reindexService = reindexServiceFactory(client, callWithInternalUser);
  }

  public start = () => {
    // this.log(['info'], `Starting worker...`);
    this.continuePolling = true;
    this.pollForOperations();
  };

  public stop = () => {
    this.continuePolling = false;
  };

  /**
   * Should be called immediately after this server has started a new reindex operation.
   */
  public forceRefresh = () => {
    this.refresh();
  };

  private updateOperations = async () => {
    // this.log(['info'], `Updating ${this.inProgressOps.length} operations`);
    const updatedOps = await Promise.all(
      this.inProgressOps.map(swallowExceptions(this.reindexService.processNextStep))
    );

    // Only update the array if all the ids lineup, otherwise refresh it completely to account for any new operations
    const inProgressIds = this.inProgressOps.map(o => o.id);
    const updatedIds = updatedOps.map(o => o.id);
    if (isEqual(inProgressIds, updatedIds)) {
      this.inProgressOps = updatedOps.filter(
        op => op.attributes.status === ReindexStatus.inProgress
      );

      if (this.inProgressOps.length === 0) {
        this.continueUpdatingOperations = false;
      }

      if (this.continueUpdatingOperations) {
        const anyWaitingReindex = this.inProgressOps.find(
          op => op.attributes.lastCompletedStep === ReindexStep.reindexStarted
        );

        // If any are waiting on ES to complete, wait before next operation.
        if (anyWaitingReindex) {
          setTimeout(this.updateOperations, UPDATE_INTERVAL);
        } else {
          this.updateOperations();
        }
      }
    } else {
      this.refresh();
    }
  };

  private pollForOperations = async () => {
    // this.log(['info'], `Polling for operations`);
    await this.refresh();

    if (this.continuePolling) {
      setTimeout(this.pollForOperations, POLL_INTERVAL);
    }
  };

  private refresh = async () => {
    // TODO: handlie paging
    const resp = await this.reindexService.findAllInProgressOperations();
    this.inProgressOps = resp.saved_objects;

    // If there are jobs to update and we're not already updating operations, kick it off.
    if (this.inProgressOps.length > 0 && !this.continueUpdatingOperations) {
      this.continueUpdatingOperations = true;
      this.updateOperations();
    }
  };
}

const swallowExceptions = (
  func: (reindexOp: ReindexSavedObject) => Promise<ReindexSavedObject>
) => async (reindexOp: ReindexSavedObject) => {
  try {
    return await func(reindexOp);
  } catch (e) {
    return reindexOp;
  }
};
