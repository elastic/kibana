/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import moment from 'moment';

import {
  IndexProgress,
  IndexRequest,
  IndexStats,
  IndexWorkerProgress,
  IndexWorkerResult,
  RepositoryUri,
  WorkerProgress,
  WorkerReservedProgress,
} from '../../model';
import { GitOperations } from '../git_operations';
import { IndexerFactory } from '../indexer';
import { EsClient, Esqueue } from '../lib/esqueue';
import { Logger } from '../log';
import { RepositoryObjectClient } from '../search';
import { aggregateIndexStats } from '../utils/index_stats_aggregator';
import { AbstractWorker } from './abstract_worker';
import { CancellationSerivce } from './cancellation_service';
import { Job } from './job';

export class IndexWorker extends AbstractWorker {
  public id: string = 'index';
  private objectClient: RepositoryObjectClient;

  constructor(
    protected readonly queue: Esqueue,
    protected readonly log: Logger,
    protected readonly client: EsClient,
    protected readonly indexerFactories: IndexerFactory[],
    protected readonly gitOps: GitOperations,
    private readonly cancellationService: CancellationSerivce
  ) {
    super(queue, log);

    this.objectClient = new RepositoryObjectClient(this.client);
  }

  public async executeJob(job: Job) {
    const { payload, cancellationToken } = job;
    const { uri, revision, enforceReindex } = payload;
    const indexerNumber = this.indexerFactories.length;

    const workerProgress = (await this.objectClient.getRepositoryLspIndexStatus(
      uri
    )) as IndexWorkerProgress;
    let checkpointReq: IndexRequest | undefined;
    if (workerProgress) {
      // There exist an ongoing index process
      const {
        uri: currentUri,
        revision: currentRevision,
        indexProgress: currentIndexProgress,
        progress,
      } = workerProgress;

      checkpointReq = currentIndexProgress && currentIndexProgress.checkpoint;
      if (
        !checkpointReq &&
        progress > WorkerReservedProgress.INIT &&
        progress < WorkerReservedProgress.COMPLETED &&
        currentUri === uri &&
        currentRevision === revision
      ) {
        // If
        // * no checkpoint exist (undefined or empty string)
        // * index progress is ongoing
        // * the uri and revision match the current job
        // Then we can safely dedup this index job request.
        this.log.info(`Index job skipped for ${uri} at revision ${revision}`);
        return {
          uri,
          revision,
        };
      }
    }

    // Binding the index cancellation logic
    let cancelled = false;
    this.cancellationService.cancelIndexJob(uri);
    const indexPromises: Array<Promise<IndexStats>> = this.indexerFactories.map(
      async (indexerFactory: IndexerFactory, index: number) => {
        const indexer = await indexerFactory.create(uri, revision, enforceReindex);
        if (!indexer) {
          this.log.info(`Failed to create indexer for ${uri}`);
          return new Map(); // return an empty map as stats.
        }

        if (cancellationToken) {
          cancellationToken.on(() => {
            indexer.cancel();
            cancelled = true;
          });
          this.cancellationService.registerIndexJobToken(uri, cancellationToken);
        }
        const progressReporter = this.getProgressReporter(uri, revision, index, indexerNumber);
        return indexer.start(progressReporter, checkpointReq);
      }
    );
    const stats: IndexStats[] = await Promise.all(indexPromises);
    const res: IndexWorkerResult = {
      uri,
      revision,
      stats: aggregateIndexStats(stats),
      cancelled,
    };
    return res;
  }

  public async onJobEnqueued(job: Job) {
    const { uri, revision } = job.payload;
    const progress: WorkerProgress = {
      uri,
      progress: WorkerReservedProgress.INIT,
      timestamp: new Date(),
      revision,
    };
    return await this.objectClient.setRepositoryLspIndexStatus(uri, progress);
  }

  public async onJobCompleted(job: Job, res: IndexWorkerResult) {
    if (res.cancelled) {
      // Skip updating job progress if the job is done because of cancellation.
      return;
    }
    this.log.info(`Index worker finished with stats: ${JSON.stringify([...res.stats])}`);
    await super.onJobCompleted(job, res);
    const { uri, revision } = job.payload;
    try {
      return await this.objectClient.updateRepository(uri, { indexedRevision: revision });
    } catch (error) {
      this.log.error(`Update indexed revision in repository object error.`);
      this.log.error(error);
    }
  }

  public async updateProgress(job: Job, progress: number) {
    const { uri } = job.payload;
    let p: any = {
      uri,
      progress,
      timestamp: new Date(),
    };
    if (
      progress === WorkerReservedProgress.COMPLETED ||
      progress === WorkerReservedProgress.ERROR ||
      progress === WorkerReservedProgress.TIMEOUT
    ) {
      // Reset the checkpoint if necessary.
      p = {
        ...p,
        indexProgress: {
          checkpoint: null,
        },
      };
    }
    try {
      return await this.objectClient.updateRepositoryLspIndexStatus(uri, p);
    } catch (error) {
      this.log.error(`Update index progress error.`);
      this.log.error(error);
    }
  }

  protected async getTimeoutMs(payload: any) {
    try {
      const totalCount = await this.gitOps.countRepoFiles(payload.uri, 'head');
      let timeout = moment.duration(1, 'hour').asMilliseconds();
      if (totalCount > 0) {
        // timeout = ln(file_count) in hour
        // e.g. 10 files -> 2.3 hours, 100 files -> 4.6 hours, 1000 -> 6.9 hours, 10000 -> 9.2 hours
        timeout = moment.duration(Math.log(totalCount), 'hour').asMilliseconds();
      }
      this.log.info(`Set index job timeout to be ${timeout} ms.`);
      return timeout;
    } catch (error) {
      this.log.error(`Get repo file total count error.`);
      this.log.error(error);
      throw error;
    }
  }

  private getProgressReporter(
    repoUri: RepositoryUri,
    revision: string,
    index: number,
    total: number
  ) {
    return async (progress: IndexProgress) => {
      const p: IndexWorkerProgress = {
        uri: repoUri,
        progress: progress.percentage,
        timestamp: new Date(),
        revision,
        indexProgress: progress,
      };
      return await this.objectClient.setRepositoryLspIndexStatus(repoUri, p);
    };
  }
}
