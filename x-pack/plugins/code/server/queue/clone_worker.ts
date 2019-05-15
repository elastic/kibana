/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { delay } from 'lodash';

import { validateGitUrl } from '../../common/git_url_utils';
import { RepositoryUtils } from '../../common/repository_utils';
import {
  CloneProgress,
  CloneWorkerProgress,
  CloneWorkerResult,
  WorkerReservedProgress,
} from '../../model';
import { EsClient, Esqueue } from '../lib/esqueue';
import { Logger } from '../log';
import { RepositoryServiceFactory } from '../repository_service_factory';
import { ServerOptions } from '../server_options';
import { AbstractGitWorker } from './abstract_git_worker';
import { IndexWorker } from './index_worker';
import { Job } from './job';

export class CloneWorker extends AbstractGitWorker {
  public id: string = 'clone';

  constructor(
    protected readonly queue: Esqueue,
    protected readonly log: Logger,
    protected readonly client: EsClient,
    protected readonly serverOptions: ServerOptions,
    private readonly indexWorker: IndexWorker,
    private readonly repoServiceFactory: RepositoryServiceFactory
  ) {
    super(queue, log, client, serverOptions);
  }

  public async executeJob(job: Job) {
    const { url } = job.payload;
    try {
      validateGitUrl(
        url,
        this.serverOptions.security.gitHostWhitelist,
        this.serverOptions.security.gitProtocolWhitelist
      );
    } catch (error) {
      this.log.error(`Validate git url ${url} error.`);
      this.log.error(error);
      return {
        uri: url,
        // Return a null repo for invalid git url.
        repo: null,
      };
    }

    this.log.info(`Execute clone job for ${url}`);
    const repoService = this.repoServiceFactory.newInstance(
      this.serverOptions.repoPath,
      this.serverOptions.credsPath,
      this.log,
      this.serverOptions.security.enableGitCertCheck
    );
    const repo = RepositoryUtils.buildRepository(url);
    return await repoService.clone(repo, (progress: number, cloneProgress?: CloneProgress) => {
      // For clone job payload, it only has the url. Populate back the
      // repository uri before update progress.
      job.payload.uri = repo.uri;
      this.updateProgress(job, progress, undefined, cloneProgress);
    });
  }

  public async onJobCompleted(job: Job, res: CloneWorkerResult) {
    this.log.info(`Clone job done for ${res.repo.uri}`);
    // For clone job payload, it only has the url. Populate back the
    // repository uri.
    job.payload.uri = res.repo.uri;
    await super.onJobCompleted(job, res);

    // Throw out a repository index request after 1 second.
    return delay(async () => {
      const payload = {
        uri: res.repo.uri,
        revision: res.repo.revision,
      };
      await this.indexWorker.enqueueJob(payload, {});
    }, 1000);
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
