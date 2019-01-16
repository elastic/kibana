/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { RepositoryUtils } from '../../common/repository_utils';
import {
  CloneProgress,
  CloneWorkerProgress,
  CloneWorkerResult,
  WorkerReservedProgress,
} from '../../model';
import { EsClient, Esqueue } from '../lib/esqueue';
import { Log } from '../log';
import { RepositoryServiceFactory } from '../repository_service_factory';
import { ServerOptions } from '../server_options';
import { SocketService } from '../socket_service';
import { AbstractGitWorker } from './abstract_git_worker';
import { IndexWorker } from './index_worker';
import { Job } from './job';

export class CloneWorker extends AbstractGitWorker {
  public id: string = 'clone';

  constructor(
    protected readonly queue: Esqueue,
    protected readonly log: Log,
    protected readonly client: EsClient,
    protected readonly serverOptions: ServerOptions,
    private readonly indexWorker: IndexWorker,
    private readonly repoServiceFactory: RepositoryServiceFactory,
    private readonly socketService?: SocketService
  ) {
    super(queue, log, client, serverOptions);
  }

  public async executeJob(job: Job) {
    const { url } = job.payload;
    this.log.info(`Execute clone job for ${url}`);
    const repoService = this.repoServiceFactory.newInstance(this.serverOptions.repoPath, this.log);
    const repo = RepositoryUtils.buildRepository(url);
    return await repoService.clone(repo, (progress: number, cloneProgress?: CloneProgress) => {
      this.updateProgress(repo.uri, progress, cloneProgress);
      if (this.socketService) {
        this.socketService.broadcastCloneProgress(repo.uri, progress, cloneProgress);
      }
    });
  }

  public async onJobCompleted(job: Job, res: CloneWorkerResult) {
    this.log.info(`Clone job done for ${res.repo.uri}`);

    if (this.socketService) {
      this.socketService.broadcastCloneProgress(
        res.repo.uri,
        WorkerReservedProgress.COMPLETED,
        undefined
      );
    }

    // Throw out a repository index request.
    const payload = {
      uri: res.repo.uri,
      revision: res.repo.revision,
    };
    await this.indexWorker.enqueueJob(payload, {});

    return await super.onJobCompleted(job, res);
  }

  public async onJobEnqueued(job: Job) {
    const { url } = job.payload;
    const repo = RepositoryUtils.buildRepository(url);
    const progress: CloneWorkerProgress = {
      uri: repo.uri,
      progress: WorkerReservedProgress.INIT,
      timestamp: new Date(),
    };
    return await this.objectClient.setRepositoryGitStatus(repo.uri, progress);
  }

  public async onJobExecutionError(res: any) {
    // The payload of clone job won't have the `uri`, but only with `url`.
    const url = res.job.payload.url;
    const repo = RepositoryUtils.buildRepository(url);
    res.job.payload.uri = repo.uri;
    return await super.onJobExecutionError(res);
  }

  public async onJobTimeOut(res: any) {
    // The payload of clone job won't have the `uri`, but only with `url`.
    const url = res.job.payload.url;
    const repo = RepositoryUtils.buildRepository(url);
    res.job.payload.uri = repo.uri;
    return await super.onJobTimeOut(res);
  }
}
