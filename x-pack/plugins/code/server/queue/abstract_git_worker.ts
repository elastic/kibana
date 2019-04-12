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
import { getDefaultBranch, getHeadRevision } from '../git_operations';
import { EsClient, Esqueue } from '../lib/esqueue';
import { Logger } from '../log';
import { RepositoryObjectClient } from '../search';
import { ServerOptions } from '../server_options';
import { AbstractWorker } from './abstract_worker';
import { Job } from './job';

export abstract class AbstractGitWorker extends AbstractWorker {
  public id: string = 'abstract-git';
  protected objectClient: RepositoryObjectClient;

  constructor(
    protected readonly queue: Esqueue,
    protected readonly log: Logger,
    protected readonly client: EsClient,
    protected readonly serverOptions: ServerOptions
  ) {
    super(queue, log);
    this.objectClient = new RepositoryObjectClient(client);
  }

  public async onJobCompleted(job: Job, res: CloneWorkerResult) {
    await super.onJobCompleted(job, res);

    // Update the default branch.
    const repoUri = res.uri;
    const localPath = RepositoryUtils.repositoryLocalPath(this.serverOptions.repoPath, repoUri);
    const revision = await getHeadRevision(localPath);
    const defaultBranch = await getDefaultBranch(localPath);

    // Update the repository data.
    try {
      await this.objectClient.updateRepository(repoUri, {
        defaultBranch,
        revision,
      });
    } catch (error) {
      this.log.error(`Update repository default branch and revision error.`);
      this.log.error(error);
    }

    // Update the git operation status.
    try {
      return await this.objectClient.updateRepositoryGitStatus(repoUri, {
        revision,
        progress: WorkerReservedProgress.COMPLETED,
        cloneProgress: {
          isCloned: true,
        },
      });
    } catch (error) {
      this.log.error(`Update revision of repo clone done error.`);
      this.log.error(error);
    }
  }

  public async updateProgress(
    job: Job,
    progress: number,
    error?: Error,
    cloneProgress?: CloneProgress
  ) {
    const { uri } = job.payload;
    const p: CloneWorkerProgress = {
      uri,
      progress,
      timestamp: new Date(),
      cloneProgress,
      errorMessage: error ? error.message : undefined,
    };
    try {
      return await this.objectClient.updateRepositoryGitStatus(uri, p);
    } catch (err) {
      // This is a warning since it's not blocking anything.
      this.log.warn(`Update git clone progress error.`);
      this.log.warn(err);
    }
  }
}
