/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { RepositoryUtils } from '../../common/repository_utils';
import { Repository, WorkerReservedProgress } from '../../model';
import { EsClient } from '../lib/esqueue';
import { Logger } from '../log';
import { IndexWorker } from '../queue';
import { RepositoryObjectClient } from '../search';
import { ServerOptions } from '../server_options';
import { AbstractScheduler } from './abstract_scheduler';

export class IndexScheduler extends AbstractScheduler {
  private objectClient: RepositoryObjectClient;

  constructor(
    private readonly indexWorker: IndexWorker,
    private readonly serverOptions: ServerOptions,
    protected readonly client: EsClient,
    protected readonly log: Logger,
    protected readonly onScheduleFinished?: () => void
  ) {
    super(client, serverOptions.indexFrequencyMs, onScheduleFinished);
    this.objectClient = new RepositoryObjectClient(this.client);
  }

  protected getRepoSchedulingFrequencyMs() {
    return this.serverOptions.indexRepoFrequencyMs;
  }

  protected async executeSchedulingJob(repo: Repository) {
    this.log.info(`Schedule index repo request for ${repo.uri}`);
    try {
      // This repository is too soon to execute the next index job.
      if (repo.nextIndexTimestamp && new Date() < new Date(repo.nextIndexTimestamp)) {
        this.log.debug(`Repo ${repo.uri} is too soon to execute the next index job.`);
        return;
      }
      const cloneStatus = await this.objectClient.getRepositoryGitStatus(repo.uri);
      if (
        !RepositoryUtils.hasFullyCloned(cloneStatus.cloneProgress) ||
        cloneStatus.progress !== WorkerReservedProgress.COMPLETED
      ) {
        this.log.info(`Repo ${repo.uri} has not been fully cloned yet or in update. Skip index.`);
        return;
      }

      const repoIndexStatus = await this.objectClient.getRepositoryLspIndexStatus(repo.uri);

      // Schedule index job only when the indexed revision is different from the current repository
      // revision.
      this.log.info(
        `Current repo revision: ${repo.revision}, indexed revision ${repoIndexStatus.revision}.`
      );
      if (
        repoIndexStatus.progress >= 0 &&
        repoIndexStatus.progress < WorkerReservedProgress.COMPLETED
      ) {
        this.log.info(`Repo is still in indexing. Skip index for ${repo.uri}`);
      } else if (
        repoIndexStatus.progress === WorkerReservedProgress.COMPLETED &&
        repoIndexStatus.revision === repo.revision
      ) {
        this.log.info(`Repo does not change since last index. Skip index for ${repo.uri}.`);
      } else {
        const payload = {
          uri: repo.uri,
          revision: repo.revision,
        };

        // Update the next repo index timestamp.
        const nextRepoIndexTimestamp = this.repoNextSchedulingTime();
        await this.objectClient.updateRepository(repo.uri, {
          nextIndexTimestamp: nextRepoIndexTimestamp,
        });

        await this.indexWorker.enqueueJob(payload, {});
      }
    } catch (error) {
      this.log.error(`Schedule index job for ${repo.uri} error.`);
      this.log.error(error);
    }
  }
}
