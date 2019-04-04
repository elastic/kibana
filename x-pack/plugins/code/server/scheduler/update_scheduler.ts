/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Repository, WorkerReservedProgress } from '../../model';
import { RepositoryIndexName, RepositoryReservedField } from '../indexer/schema';
import { EsClient } from '../lib/esqueue';
import { Logger } from '../log';
import { UpdateWorker } from '../queue';
import { RepositoryObjectClient } from '../search';
import { ServerOptions } from '../server_options';
import { AbstractScheduler } from './abstract_scheduler';

export class UpdateScheduler extends AbstractScheduler {
  private objectClient: RepositoryObjectClient;

  constructor(
    private readonly updateWorker: UpdateWorker,
    private readonly serverOptions: ServerOptions,
    protected readonly client: EsClient,
    protected readonly log: Logger,
    protected readonly onScheduleFinished?: () => void
  ) {
    super(client, serverOptions.updateFrequencyMs, onScheduleFinished);
    this.objectClient = new RepositoryObjectClient(this.client);
  }

  protected getRepoSchedulingFrequencyMs() {
    return this.serverOptions.updateRepoFrequencyMs;
  }

  // TODO: Currently the schduling algorithm the most naive one, which go through
  // all repositories and execute update. Later we can repeat the one we used
  // before for task throttling.
  protected async executeSchedulingJob(repo: Repository) {
    this.log.debug(`Try to schedule update repo request for ${repo.uri}`);
    try {
      // This repository is too soon to execute the next update job.
      if (repo.nextUpdateTimestamp && new Date() < new Date(repo.nextUpdateTimestamp)) {
        this.log.debug(`Repo ${repo.uri} is too soon to execute the next update job.`);
        return;
      }
      this.log.info(`Start to schedule update repo request for ${repo.uri}`);

      const cloneStatus = await this.objectClient.getRepositoryGitStatus(repo.uri);
      // Schedule update job only when the repo has been fully cloned already
      if (
        cloneStatus.cloneProgress &&
        cloneStatus.cloneProgress.isCloned &&
        cloneStatus.progress === WorkerReservedProgress.COMPLETED
      ) {
        const payload = repo;

        // Update the next repo update timestamp.
        const nextRepoUpdateTimestamp = this.repoNextSchedulingTime();
        this.client.update({
          index: RepositoryIndexName(repo.uri),
          id: repo.uri,
          body: JSON.stringify({
            doc: {
              [RepositoryReservedField]: {
                nextUpdateTimestamp: nextRepoUpdateTimestamp,
              },
            },
          }),
        });
        await this.updateWorker.enqueueJob(payload, {});
      } else {
        this.log.info(`Repo ${repo.uri} has not been fully cloned yet or in update. Skip update.`);
      }
    } catch (error) {
      this.log.error(`Schedule update for ${repo.uri} error.`);
      this.log.error(error);
    }
  }
}
