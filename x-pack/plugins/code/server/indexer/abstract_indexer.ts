/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Indexer, IndexProgress, ProgressReporter } from '.';
import { IndexRequest, IndexStats, IndexStatsKey, RepositoryUri } from '../../model';
import { EsClient } from '../lib/esqueue';
import { Logger } from '../log';
import { aggregateIndexStats } from '../utils/index_stats_aggregator';
import { IndexCreationRequest } from './index_creation_request';
import { IndexCreator } from './index_creator';

export abstract class AbstractIndexer implements Indexer {
  protected type: string = 'abstract';
  protected cancelled: boolean = false;
  protected indexCreator: IndexCreator;

  constructor(
    protected readonly repoUri: RepositoryUri,
    protected readonly revision: string,
    protected readonly client: EsClient,
    protected readonly log: Logger
  ) {
    this.indexCreator = new IndexCreator(client);
  }

  public async start(progressReporter?: ProgressReporter) {
    this.log.info(
      `Indexer ${this.type} started for repo ${this.repoUri} with revision ${this.revision}`
    );
    this.cancelled = false;

    // Prepare the ES index
    const res = await this.prepareIndex();
    if (!res) {
      this.log.error(`Prepare index for ${this.repoUri} error. Skip indexing.`);
      return new Map<IndexStatsKey, number>();
    }

    // Clean up the index if necessary
    await this.cleanIndex(this.repoUri);

    // Prepare all the index requests
    let reqs;
    let totalCount = 0;
    let prevPercentage = 0;
    let successCount = 0;
    let failCount = 0;
    const statsBuffer: IndexStats[] = [];

    try {
      reqs = await this.prepareRequests(this.repoUri);
      totalCount = reqs.length;
    } catch (error) {
      this.log.error(`Prepare requests for ${this.repoUri} error.`);
      this.log.error(error);
      throw error;
    }

    for (const req of reqs) {
      if (this.isCancelled()) {
        this.log.info(`Indexer cancelled. Stop right now.`);
        break;
      }

      try {
        const stats = await this.processRequest(req);
        statsBuffer.push(stats);
        successCount += 1;
      } catch (error) {
        this.log.error(`Process index request error. ${error}`);
        failCount += 1;
      }

      if (progressReporter) {
        this.log.debug(`Update progress for ${this.type} indexer.`);
        // Update progress if progress reporter has been provided.
        const progress: IndexProgress = {
          type: this.type,
          total: totalCount,
          success: successCount,
          fail: failCount,
          percentage: Math.floor((100 * (successCount + failCount)) / totalCount),
        };
        if (progress.percentage > prevPercentage + 5) {
          progressReporter(progress);
          prevPercentage = progress.percentage;
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

  protected async cleanIndex(repoUri: RepositoryUri): Promise<void> {
    // This is the abstract implementation. You should override this.
    return new Promise<void>((resolve, reject) => {
      resolve();
    });
  }

  protected async prepareRequests(repoUri: RepositoryUri): Promise<IndexRequest[]> {
    // This is the abstract implementation. You should override this.
    return new Promise<IndexRequest[]>((resolve, reject) => {
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
