/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import moment from 'moment';

import { Indexer, ProgressReporter } from '.';
import { IndexProgress, IndexRequest, IndexStats, IndexStatsKey, RepositoryUri } from '../../model';
import { EsClient } from '../lib/esqueue';
import { Logger } from '../log';
import { aggregateIndexStats } from '../utils/index_stats_aggregator';
import { IndexCreationRequest } from './index_creation_request';
import { IndexCreator } from './index_creator';

export abstract class AbstractIndexer implements Indexer {
  protected type: string = 'abstract';
  protected cancelled: boolean = false;
  protected indexCreator: IndexCreator;
  protected INDEXER_PROGRESS_UPDATE_INTERVAL_MS = 1000;

  constructor(
    protected readonly repoUri: RepositoryUri,
    protected readonly revision: string,
    protected readonly client: EsClient,
    protected readonly log: Logger
  ) {
    this.indexCreator = new IndexCreator(client);
  }

  public async start(progressReporter?: ProgressReporter, checkpointReq?: IndexRequest) {
    this.log.info(
      `Indexer ${this.type} started for repo ${this.repoUri} with revision ${this.revision}`
    );
    const isCheckpointValid = this.validateCheckpoint(checkpointReq);

    if (this.needRefreshIndices(checkpointReq)) {
      // Prepare the ES index
      const res = await this.prepareIndex();
      if (!res) {
        this.log.error(`Prepare index for ${this.repoUri} error. Skip indexing.`);
        return new Map<IndexStatsKey, number>();
      }

      // Clean up the index if necessary
      await this.cleanIndex();
    }

    // Prepare all the index requests
    let totalCount = 0;
    let prevTimestamp = moment();
    let successCount = 0;
    let failCount = 0;
    const statsBuffer: IndexStats[] = [];

    try {
      totalCount = await this.getIndexRequestCount();
    } catch (error) {
      this.log.error(`Get index request count for ${this.repoUri} error.`);
      this.log.error(error);
      throw error;
    }

    let meetCheckpoint = false;
    const reqsIterator = await this.getIndexRequestIterator();
    for await (const req of reqsIterator) {
      if (this.isCancelled()) {
        this.log.info(`Indexer cancelled. Stop right now.`);
        break;
      }

      // If checkpoint is valid and has not been met
      if (isCheckpointValid && !meetCheckpoint) {
        meetCheckpoint = meetCheckpoint || this.ifCheckpointMet(req, checkpointReq!);
        if (!meetCheckpoint) {
          // If the checkpoint has not been met yet, skip current request.
          continue;
        } else {
          this.log.info(`Checkpoint met. Continue with indexing.`);
        }
      }

      try {
        const stats = await this.processRequest(req);
        statsBuffer.push(stats);
        successCount += 1;
      } catch (error) {
        this.log.error(`Process index request error. ${error}`);
        failCount += 1;
      }

      // Double check if the the indexer is cancelled or not, because the
      // processRequest process could take fairly long and during this time
      // the index job might have been cancelled already. In this case,
      // we shall not update the progress.
      if (!this.isCancelled() && progressReporter) {
        this.log.debug(`Update progress for ${this.type} indexer.`);
        // Update progress if progress reporter has been provided.
        const progress: IndexProgress = {
          type: this.type,
          total: totalCount,
          success: successCount,
          fail: failCount,
          percentage: Math.floor((100 * (successCount + failCount)) / totalCount),
          checkpoint: req,
        };
        if (moment().diff(prevTimestamp) > this.INDEXER_PROGRESS_UPDATE_INTERVAL_MS) {
          progressReporter(progress);
          prevTimestamp = moment();
        }
      }
    }
    return aggregateIndexStats(statsBuffer);
  }

  public cancel() {
    this.cancelled = true;
  }

  protected isCancelled(): boolean {
    return this.cancelled;
  }

  // If the current checkpoint is valid
  protected validateCheckpoint(checkpointReq?: IndexRequest): boolean {
    return checkpointReq !== undefined;
  }

  // If it's necessary to refresh (create and reset) all the related indices
  protected needRefreshIndices(checkpointReq?: IndexRequest): boolean {
    return false;
  }

  protected ifCheckpointMet(req: IndexRequest, checkpointReq: IndexRequest): boolean {
    // Please override this function
    return false;
  }

  protected async cleanIndex(): Promise<void> {
    // This is the abstract implementation. You should override this.
    return new Promise<void>((resolve, reject) => {
      resolve();
    });
  }

  protected async *getIndexRequestIterator(): AsyncIterableIterator<IndexRequest> {
    // This is the abstract implementation. You should override this.
  }

  protected async getIndexRequestCount(): Promise<number> {
    // This is the abstract implementation. You should override this.
    return new Promise<number>((resolve, reject) => {
      resolve();
    });
  }

  protected async processRequest(request: IndexRequest): Promise<IndexStats> {
    // This is the abstract implementation. You should override this.
    return new Promise<IndexStats>((resolve, reject) => {
      resolve();
    });
  }

  protected async prepareIndexCreationRequests(): Promise<IndexCreationRequest[]> {
    // This is the abstract implementation. You should override this.
    return new Promise<IndexCreationRequest[]>((resolve, reject) => {
      resolve();
    });
  }

  protected async prepareIndex() {
    const creationReqs = await this.prepareIndexCreationRequests();
    for (const req of creationReqs) {
      try {
        const res = await this.indexCreator.createIndex(req);
        if (!res) {
          this.log.info(`Index creation failed for ${req.index}.`);
          return false;
        }
      } catch (error) {
        this.log.error(`Index creation error.`);
        this.log.error(error);
        return false;
      }
    }
    return true;
  }
}
