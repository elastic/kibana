/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import moment = require('moment');

import { IndexStats, IndexWorkerResult, RepositoryUri, WorkerProgress } from '../../model';
import { IndexerFactory, IndexProgress } from '../indexer';
import { EsClient, Esqueue } from '../lib/esqueue';
import { Log } from '../log';
import { RepositoryObjectClient } from '../search';
import { SocketService } from '../socket_service';
import { aggregateIndexStats } from '../utils/index_stats_aggregator';
import { AbstractWorker } from './abstract_worker';
import { CancellationSerivce } from './cancellation_service';
import { Job } from './job';

export class IndexWorker extends AbstractWorker {
  public id: string = 'index';
  private objectClient: RepositoryObjectClient;

  constructor(
    protected readonly queue: Esqueue,
    protected readonly log: Log,
    protected readonly client: EsClient,
    protected readonly indexerFactories: IndexerFactory[],
    private readonly cancellationService: CancellationSerivce,
    private readonly socketService: SocketService
  ) {
    super(queue, log);

    this.objectClient = new RepositoryObjectClient(this.client);
  }

  public async executeJob(job: Job) {
    const { payload, cancellationToken } = job;
    const { uri, revision } = payload;

    this.socketService.broadcastIndexProgress(uri, 0);

    const indexerNumber = this.indexerFactories.length;

    // Binding the index cancellation logic
    this.cancellationService.cancelIndexJob(uri);
    const indexPromises: Array<Promise<IndexStats>> = this.indexerFactories.map(
      (indexerFactory: IndexerFactory, index: number) => {
        const indexer = indexerFactory.create(uri, revision);
        if (cancellationToken) {
          cancellationToken.on(() => {
            indexer.cancel();
          });
          this.cancellationService.registerIndexJobToken(uri, cancellationToken);
        }
        const progressReporter = this.getProgressReporter(uri, revision, index, indexerNumber);
        return indexer.start(progressReporter);
      }
    );
    const stats: IndexStats[] = await Promise.all(indexPromises);

    this.socketService.broadcastIndexProgress(uri, 100);

    const res: IndexWorkerResult = {
      uri,
      revision,
      stats: aggregateIndexStats(stats),
    };
    this.log.info(`Index worker finished with stats: ${JSON.stringify([...res.stats])}`);
    return res;
  }

  public async onJobEnqueued(job: Job) {
    const { uri, revision } = job.payload;
    const progress: WorkerProgress = {
      uri,
      progress: 0,
      timestamp: new Date(),
      revision,
    };
    return await this.objectClient.setRepositoryLspIndexStatus(uri, progress);
  }

  public async onJobCompleted(job: Job, res: WorkerProgress) {
    const { uri } = job.payload;
    await this.objectClient.updateRepositoryLspIndexStatus(uri, {
      progress: 100,
      timestamp: new Date(),
    });
    return await super.onJobCompleted(job, res);
  }

  protected getTimeoutMs(_: any) {
    // TODO(mengwei): query object/file number of a repo and come up with a number in here.
    return moment.duration(5, 'hour').asMilliseconds();
  }

  private getProgressReporter(
    repoUri: RepositoryUri,
    revision: string,
    index: number,
    total: number
  ) {
    return async (progress: IndexProgress) => {
      const p: WorkerProgress = {
        uri: repoUri,
        progress: progress.percentage,
        timestamp: new Date(),
        revision,
      };

      const globalProgress = (index * 100 + progress.percentage) / total;

      this.socketService.broadcastIndexProgress(repoUri, globalProgress);

      return await this.objectClient.setRepositoryLspIndexStatus(repoUri, p);
    };
  }
}
