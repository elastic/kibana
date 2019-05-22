/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CloneWorkerResult, Repository } from '../../model';
import { EsClient, Esqueue } from '../lib/esqueue';
import { Logger } from '../log';
import { RepositoryServiceFactory } from '../repository_service_factory';
import { ServerOptions } from '../server_options';
import { AbstractGitWorker } from './abstract_git_worker';
import { Job } from './job';

export class UpdateWorker extends AbstractGitWorker {
  public id: string = 'update';

  constructor(
    queue: Esqueue,
    protected readonly log: Logger,
    protected readonly client: EsClient,
    protected readonly serverOptions: ServerOptions,
    protected readonly repoServiceFactory: RepositoryServiceFactory
  ) {
    super(queue, log, client, serverOptions);
  }

  public async executeJob(job: Job) {
    const repo: Repository = job.payload;
    this.log.info(`Execute update job for ${repo.uri}`);
    const repoService = this.repoServiceFactory.newInstance(
      this.serverOptions.repoPath,
      this.serverOptions.credsPath,
      this.log,
      this.serverOptions.security.enableGitCertCheck
    );
    return await repoService.update(repo);
  }

  public async onJobCompleted(job: Job, res: CloneWorkerResult) {
    this.log.info(`Update job done for ${job.payload.uri}`);
    return await super.onJobCompleted(job, res);
  }
}
